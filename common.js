document.addEventListener("DOMContentLoaded", () => {
    initCursor();
    initSettings();
});

function initCursor() {
    let dot = document.getElementById('cursor-dot');
    let ring = document.getElementById('cursor-ring');
    if (!dot || !ring) {
        dot = document.createElement('div'); dot.id = 'cursor-dot';
        ring = document.createElement('div'); ring.id = 'cursor-ring';
        document.body.prepend(ring); document.body.prepend(dot);
    }
    let mx = -100, my = -100, rx = -100, ry = -100;
    document.addEventListener('mousemove', e => {
        mx = e.clientX; my = e.clientY;
        dot.style.left = mx + 'px'; dot.style.top = my + 'px';
    });
    (function anim() {
        if (mx !== -100) { rx += (mx - rx) * 0.15; ry += (my - ry) * 0.15; ring.style.left = rx + 'px'; ring.style.top = ry + 'px'; }
        requestAnimationFrame(anim);
    })();
}

const AI_PROMPTS = {
    grammar: (t) => `Fix all grammar, spelling, and punctuation errors in the text below. Return ONLY the corrected text.\n\nText: ${t}`,
    paraphrase: (t, tone) => `Rewrite the text below in a ${tone || 'neutral'} tone. Keep the same meaning but use different words. Return ONLY the rewritten text.\n\nText: ${t}`,
    summarize: (t) => `Summarize the text below concisely. Capture all key points. Return ONLY the summary.\n\nText: ${t}`,
    query_rewrite: (t) => `The user wants to search for: "${t}". Generate 3-4 short, specific search queries that will find relevant results on Reddit, GitHub, and Hacker News. Respond ONLY with a valid JSON array of strings. No markdown.\nExample: ["app ideas", "show hn", "github stars"]`,
    relevance: (t, query) => `The user searched for: "${query}". A result titled "${t}" appeared. In ONE short sentence (max 12 words), explain why this is relevant. Return ONLY the sentence.`,
    trend_analyze: (t, query) => `Analyze these search results about "${query}" and respond with ONLY a valid JSON object: {"summary": "2-3 sentence TL;DR", "themes": ["theme 1", "theme 2"], "pain_points": ["point 1"], "opportunities": ["opp 1"], "ranked_indices": [0, 1, 2]}. Results: ${t}`,
};

window.aiFetch = async function(params) {
    const { tool, text, tone } = params;
    const apiKey = localStorage.getItem('jt_api_key');
    const provider = localStorage.getItem('jt_api_provider') || 'groq';

    return await _aiFetchInternal(params, apiKey, provider);
};

async function _aiFetchInternal(params, apiKey, provider) {
    // Only try backend if not on a basic file server that would 405
    if (location.protocol !== 'file:' && !location.hostname.includes('127.0.0.1') && !location.hostname.includes('localhost')) {
        try {
            const res = await fetch('/api/ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(params)
            });
            if (res.ok) return await res.json();
            if (res.status === 405 || res.status === 404) {
                console.info('Server-side AI not active. Falling back to client-side modes...');
            }
        } catch (e) {
            console.warn('Backend unavailable, trying direct mode...');
        }
    } else {
        console.info('Local environment detected. Prioritizing Direct Mode (API Key) or Demo Mode.');
    }

    // 2. Try User Key (Override)
    if (apiKey) {
        const prompt = AI_PROMPTS[params.tool](params.text, params.tone);
        if (provider === 'groq') return await fetchGroq(apiKey, prompt, params.tool);
        if (provider === 'hf') return await fetchHF(apiKey, prompt);
    }

    // 3. Demo Mode Fallback (Public HF)
    const isDemo = confirm('Default AI is not configured on your server.\n\nWould you like to use "Demo Mode" (Slow public model)?\n\nAlternatively, click the Gear ⚙️ to add your own key.');
    if (isDemo) {
        const prompt = AI_PROMPTS[params.tool](params.text, params.tone);
        return await fetchHF('', prompt, true);
    }

    throw new Error('AI Setup Required. Use the Settings Gear ⚙️.');
}

function toggleAILoader(show) {
    // Hidden per user preference (prefers tool-specific loading)
}

async function fetchGroq(key, prompt, tool) {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${key}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [{ role: 'user', content: prompt }],
            temperature: tool === 'paraphrase' ? 0.7 : 0.3
        })
    });
    if (!res.ok) throw new Error('Groq direct call failed');
    const data = await res.json();
    return { result: data.choices[0].message.content.trim() };
}

async function fetchHF(key, prompt, isDemo = false) {
    const model = isDemo ? 'mistralai/Mistral-7B-Instruct-v0.2' : 'mistralai/Mixtral-8x7B-Instruct-v0.1';
    let url = `https://api-inference.huggingface.co/models/${model}`;
    const headers = { 'Content-Type': 'application/json' };
    
    if (key) {
        headers['Authorization'] = `Bearer ${key}`;
        const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify({ inputs: prompt }) });
        if (!res.ok) throw new Error('HuggingFace call failed. Check your key.');
        const data = await res.json();
        const raw = Array.isArray(data) ? data[0].generated_text : data.generated_text;
        return { result: (raw || '').replace(prompt, '').trim() };
    } else if (isDemo) {
        // Use Codetabs proxy for demo mode (supports POST)
        const proxyUrl = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`;
        const res = await fetch(proxyUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ inputs: prompt })
        });
        if (!res.ok) throw new Error('Demo AI currently busy. Try again in a minute.');
        const data = await res.json();
        const raw = Array.isArray(data) ? data[0].generated_text : data.generated_text;
        return { result: (raw || '').replace(prompt, '').trim() };
    }
}

function initSettings() {
    // Only show settings gear on AI-driven pages as requested
    if (!window.isAITool) return;

    let container = document.querySelector('.container') || document.querySelector('main') || document.querySelector('nav') || document.body;
    if (!container) return;

    // Inject Gear
    const btn = document.createElement('button');
    btn.className = 'settings-btn';
    btn.id = 'open-settings';
    btn.title = 'AI Settings';
    if (container === document.body) btn.style.position = 'fixed';
    btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 15a3 3 0 100-6 3 3 0 000 6z"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/></svg>`;
    container.appendChild(btn);

    // Inject Modal
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'settings-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2 class="modal-title">AI Settings</h2>
                <button class="modal-close" onclick="closeSettings()">&times;</button>
            </div>
            <div class="key-group">
                <label>AI API Key (Optional)</label>
                <div style="position:relative">
                    <input type="password" id="api-key-input" placeholder="Put your API key here..." oninput="saveKeys()" style="padding-right:80px">
                    <div id="provider-badge" style="position:absolute; right:10px; top:50%; transform:translateY(-50%); font-size:9px; font-weight:800; text-transform:uppercase; color:var(--accent); pointer-events:none; opacity:0.6">DETECTING</div>
                </div>
            </div>
            <div style="margin-top:20px; font-size:11px; color:#666; line-height:1.5">
                <strong>💡 Tip:</strong> Paste any free key above to enable <strong>Direct Mode</strong>. This fixes the 405 backend error and makes all 41 tools work locally.
            </div>
            <div class="modal-footer">
                <button class="btn" style="width:100%" onclick="closeSettings()">Save & Close</button>
            </div>
        </div>`;
    document.body.appendChild(modal);

    document.getElementById('open-settings').onclick = () => {
        document.getElementById('api-key-input').value = localStorage.getItem('jt_api_key') || '';
        modal.classList.add('active');
        updateStatus();
    };
}

window.closeSettings = () => document.getElementById('settings-modal').classList.remove('active');
window.saveKeys = () => {
    const key = document.getElementById('api-key-input').value.trim();
    localStorage.setItem('jt_api_key', key);
    // Auto-detect provider
    if (key.startsWith('gsk_')) localStorage.setItem('jt_api_provider', 'groq');
    else if (key.startsWith('hf_')) localStorage.setItem('jt_api_provider', 'hf');
    else localStorage.setItem('jt_api_provider', 'groq'); // Default
    updateStatus();
};

function updateStatus() {
    const key = localStorage.getItem('jt_api_key');
    const provider = localStorage.getItem('jt_api_provider');
    const badge = document.getElementById('provider-badge');
    if (badge) {
        if (!key) badge.textContent = 'NONE';
        else badge.textContent = provider === 'hf' ? 'HUGGINGFACE' : 'GROQ';
    }
}
