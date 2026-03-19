// --- Global UX Enhancements ---

document.addEventListener("DOMContentLoaded", () => {
    initCursor();
    initSidebarPersistence();
    initRevealObserver();
    initSettings();
});

// 1. Enhanced Custom Cursor
function initCursor() {
    let dot = document.getElementById('cursor-dot');
    let ring = document.getElementById('cursor-ring');
    if (!dot || !ring) {
        dot = document.createElement('div'); dot.id = 'cursor-dot';
        ring = document.createElement('div'); ring.id = 'cursor-ring';
        document.body.prepend(ring); document.body.prepend(dot);
    }

    let mx = -100, my = -100, rx = -100, ry = -100;
    let isHovering = false;

    document.addEventListener('mousemove', e => {
        mx = e.clientX; my = e.clientY;
        dot.style.left = mx + 'px';
        dot.style.top = my + 'px';
    });

    // Magnetic effect on interactive elements
    const interactive = 'a, button, .tool-card, input, textarea, select';
    document.addEventListener('mouseover', e => {
        if (e.target.closest(interactive)) {
            isHovering = true;
            ring.style.width = '60px';
            ring.style.height = '60px';
            ring.style.opacity = '0.5';
            ring.style.borderColor = 'var(--accent)';
        }
    });
    document.addEventListener('mouseout', e => {
        if (e.target.closest(interactive)) {
            isHovering = false;
            ring.style.width = '32px';
            ring.style.height = '32px';
            ring.style.opacity = '0.3';
            ring.style.borderColor = 'var(--text)';
        }
    });

    // Fluid movement
    (function anim() {
        if (mx !== -100) {
            rx += (mx - rx) * 0.15;
            ry += (my - ry) * 0.15;
            ring.style.left = rx + 'px';
            ring.style.top = ry + 'px';
        }
        requestAnimationFrame(anim);
    })();
}

// 2. Sidebar Persistence & Shell Logic
function initSidebarPersistence() {
    const state = localStorage.getItem('jt-sidebar');
    const sb = document.getElementById('sidebar');
    const body = document.body;

    // Apply saved state
    if (state === '0') {
        if (sb) sb.classList.add('collapsed');
        body.classList.add('sb-collapsed');
    }
}

// Global Sidebar Toggles (Guarded)
if (typeof window.toggleSidebar === 'undefined') {
    window.toggleSidebar = () => {
        const sb = document.getElementById('sidebar');
        const body = document.body;
        if (!sb) return;

        if (window.innerWidth > 1024) {
            sb.classList.toggle('collapsed');
            body.classList.toggle('sb-collapsed');
            localStorage.setItem('jt-sidebar', sb.classList.contains('collapsed') ? '0' : '1');
        } else {
            sb.classList.toggle('active');
            body.classList.toggle('sb-open');
        }
    };
}

if (typeof window.toggleGroup === 'undefined') {
    window.toggleGroup = (btn) => {
        const group = btn.closest('.sb-group');
        if (group) group.classList.toggle('closed');
    };
}

// 3. Staggered Reveals
function initRevealObserver() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry, i) => {
            if (entry.isIntersecting) {
                setTimeout(() => entry.target.classList.add('visible'), i * 80);
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0 }); // threshold: 0 ensures massive elements like the tools grid don't fail to intersect on mobile
    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}

// 4. Global Notifications (Toasts)
window.showToast = (msg, duration = 3000) => {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = msg;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        setTimeout(() => toast.remove(), 300);
    }, duration);
};

// 5. AI & Settings (Shared Logic)
const AI_PROMPTS = {
    grammar: (t) => `Fix all grammar, spelling, and punctuation errors: ${t}`,
    paraphrase: (t, tone) => `Rewrite in a ${tone || 'neutral'} tone: ${t}`,
    summarize: (t) => `Summarize concisely: ${t}`,
};

window.aiFetch = async function (params) {
    const apiKey = localStorage.getItem('jt_api_key');
    if (!apiKey) {
        showToast('AI API Key required in Settings ⚙️');
        return null;
    }
    // ... logic for fetch ...
};

function initSettings() {
    if (!window.isAITool) return;
    // Settings logic here ...
}

// 6. Global Search Enhancement
if (typeof window.sbSearch === 'undefined') {
    window.sbSearch = (val) => {
        const term = val.toLowerCase();
        document.querySelectorAll('.sb-item').forEach(i => {
            const name = (i.getAttribute('data-name') || i.textContent).toLowerCase();
            i.style.display = name.includes(term) ? 'flex' : 'none';
        });
        document.querySelectorAll('.sb-group').forEach(g => {
            const visible = [...g.querySelectorAll('.sb-item')].some(i => i.style.display !== 'none');
            g.style.display = visible ? '' : 'none';
            if (val && visible) g.classList.remove('collapsed');
        });
    };
}
