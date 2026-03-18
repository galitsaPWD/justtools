export const config = { runtime: 'edge' };

export default async function handler(req) {
  // Only allow POST
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  // CORS headers
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  try {
    const { tool, text, tone } = await req.json();

    if (!['query_rewrite'].includes(tool) && (!text || !text.trim())) {
      return new Response(JSON.stringify({ error: 'No text provided' }), { status: 400, headers });
    }

    // Build prompt based on tool
    const prompts = {
      grammar: `You are a grammar checker. Fix all grammar, spelling, and punctuation errors in the text below. Return ONLY the corrected text with no explanation, no preamble, no quotes. If the text is already correct, return it unchanged.\n\nText: ${text}`,
      paraphrase: `You are a writing assistant. Rewrite the text below in a ${tone || 'neutral'} tone. Keep the same meaning but use different words and sentence structure. Return ONLY the rewritten text with no explanation, no preamble, no quotes.\n\nText: ${text}`,
      summarize: `You are a summarization expert. Summarize the text below concisely. Capture all key points. Return ONLY the summary with no explanation, no preamble, no quotes.\n\nText: ${text}`,
      translate: `You are a professional translator. Translate the text below into ${tone || 'English'}. Return ONLY the translated text with no explanation, no preamble, no quotes. Preserve the original formatting and line breaks.\n\nText: ${text}`,
      query_rewrite: `You are a search query optimizer. The user wants to search the web for: "${text}".
Generate 3-4 short, specific search queries that will find the most relevant results on Reddit, GitHub, and Hacker News.
Respond ONLY with a valid JSON array of strings. No markdown, no explanation, no backticks.
Example output: ["app ideas no signup", "frustrated with existing tools", "build this app request"]
Queries should be short (2-5 words), concrete, and varied.`,

      relevance: `The user searched for: "${tone}". A result titled "${text}" appeared. In ONE short sentence (max 12 words), explain specifically what connection this result has to the search. Be concrete — mention actual shared topics, not vague phrases like 'somewhat related'. Return ONLY the sentence, no preamble.`,

      trend_analyze: `You are a trend analyst. You will be given a list of titles from Reddit, Hacker News, GitHub, and other sources about the topic: "${tone}".

Analyze these results and respond with ONLY a valid JSON object in this exact format (no markdown, no backticks, no explanation):
{
  "summary": "2-3 sentence TL;DR of what is trending and why it matters right now",
  "themes": ["theme 1", "theme 2", "theme 3", "theme 4", "theme 5"],
  "pain_points": ["pain point 1", "pain point 2", "pain point 3"],
  "opportunities": ["opportunity 1", "opportunity 2", "opportunity 3"],
  "ranked_indices": [0, 3, 1, 7, 2, 5, 4, 6]
}

ranked_indices must be a reordering of the indices 0 to N-1 where N is the number of titles, sorted from most relevant/insightful to least.

Titles (as JSON array):
${text}`,
    };

    if (!prompts[tool]) {
      return new Response(JSON.stringify({ error: 'Invalid tool' }), { status: 400, headers });
    }

    // Try Groq first
    if (process.env.GROQ_API_KEY) {
      const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: prompts[tool] }],
          max_tokens: 1024,
          temperature: tool === 'paraphrase' ? 0.7 : 0.3,
        }),
      });

      if (groqRes.ok) {
        const data = await groqRes.json();
        const result = data.choices?.[0]?.message?.content?.trim();
        if (result) return new Response(JSON.stringify({ result }), { status: 200, headers });
      }
    }

    // Try HuggingFace as fallback
    if (process.env.HUGGINGFACEHUB_API_TOKEN) {
      const model = tool === 'trend_analyze' ? 'mistralai/Mistral-7B-Instruct-v0.3' : 'mistralai/Mixtral-8x7B-Instruct-v0.1';
      const hfRes = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.HUGGINGFACEHUB_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ inputs: prompts[tool] }),
      });

      if (hfRes.ok) {
        const data = await hfRes.json();
        const raw = Array.isArray(data) ? data[0].generated_text : data.generated_text;
        const result = (raw || '').replace(prompts[tool], '').trim();
        if (result) return new Response(JSON.stringify({ result }), { status: 200, headers });
      }
    }

    return new Response(JSON.stringify({ error: 'No default AI keys configured on server. Please use the Settings gear.' }), { status: 502, headers });

  } catch (err) {
    console.error('Handler error:', err);
    return new Response(JSON.stringify({ error: 'Something went wrong. Try again.' }), { status: 500, headers });
  }
}