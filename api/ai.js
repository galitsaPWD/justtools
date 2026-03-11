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

    if (!text || !text.trim()) {
      return new Response(JSON.stringify({ error: 'No text provided' }), { status: 400, headers });
    }

    // Build prompt based on tool
    const prompts = {
      grammar: `You are a grammar checker. Fix all grammar, spelling, and punctuation errors in the text below. Return ONLY the corrected text with no explanation, no preamble, no quotes. If the text is already correct, return it unchanged.\n\nText: ${text}`,
      paraphrase: `You are a writing assistant. Rewrite the text below in a ${tone || 'neutral'} tone. Keep the same meaning but use different words and sentence structure. Return ONLY the rewritten text with no explanation, no preamble, no quotes.\n\nText: ${text}`,
      summarize: `You are a summarization expert. Summarize the text below concisely. Capture all key points. Return ONLY the summary with no explanation, no preamble, no quotes.\n\nText: ${text}`,
      translate: `You are a professional translator. Translate the text below into ${tone || 'English'}. Return ONLY the translated text with no explanation, no preamble, no quotes. Preserve the original formatting and line breaks.\n\nText: ${text}`,
    };

    if (!prompts[tool]) {
      return new Response(JSON.stringify({ error: 'Invalid tool' }), { status: 400, headers });
    }

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

    if (!groqRes.ok) {
      const err = await groqRes.text();
      console.error('Groq error:', err);
      return new Response(JSON.stringify({ error: 'AI service error. Try again.' }), { status: 502, headers });
    }

    const data = await groqRes.json();
    const result = data.choices?.[0]?.message?.content?.trim();

    if (!result) {
      return new Response(JSON.stringify({ error: 'Empty response from AI' }), { status: 502, headers });
    }

    return new Response(JSON.stringify({ result }), { status: 200, headers });

  } catch (err) {
    console.error('Handler error:', err);
    return new Response(JSON.stringify({ error: 'Something went wrong. Try again.' }), { status: 500, headers });
  }
}