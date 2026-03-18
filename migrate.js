const fs = require('fs');
const path = require('path');

const dir = __dirname;
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));

for (const file of files) {
    const filePath = path.join(dir, file);
    let content = fs.readFileSync(filePath, 'utf8');

    // 1. Remove old cursor JS blocks (multiple variants)
    const cursorVariants = [
        /const dot\s*=\s*document\.getElementById\('cursor-dot'\).*?setTimeout.*?80\);\s*\n?\s*\}\s*\);\s*\n?/s,
        /\/\/ custom cursor\s*\n\s*const cursorEl\s*=\s*document\.getElementById\('cursor'\);.*?requestAnimationFrame\(animateRing\);\s*\n?\s*\}\s*\)\(\);\s*\n?document\.querySelectorAll.*?\n?\}\s*\);\s*\n?\}\s*\);\s*\n?/s,
        /const cursor\s*=\s*document\.getElementById\('cursor'\);.*?const ring\s*=\s*document\.getElementById\('cursorRing'\);.*?animateRing\(\);.*?\}\s*\);\s*\n?/s
    ];
    cursorVariants.forEach(reg => content = content.replace(reg, ''));
    
    // 2. Add <script src="common.js"></script> and isAITool flag if needed
    const aiTools = [
        'grammar-checker.html', 'paraphraser.html', 'text-summarizer.html', 
        'trend-radar.html', 'image-to-text.html', 'pdf-to-text.html', 
        'screenshot-to-text.html'
    ];
    
    const isAI = aiTools.includes(file);
    const aiFlag = isAI ? '<script>window.isAITool=true;</script>\n' : '';

    if (!content.includes('common.js')) {
        content = content.replace('</body>', `${aiFlag}<script src="common.js"></script>\n</body>`);
    } else if (isAI && !content.includes('window.isAITool')) {
        content = content.replace('<script src="common.js"></script>', `${aiFlag}<script src="common.js"></script>`);
    }
    
    // 3. Robust CSS Migration (Aggressive)
    const cursorCSSRegex = /\s*?\.cursor\s*?\{.*?\}\s*?\.cursor-ring\s*?\{.*?\}/gs;
    const bodyCursorRegex = /\s*?cursor:\s*?none\s*?!\s*?important\s*;?/g;
    content = content.replace(cursorCSSRegex, '');
    content = content.replace(bodyCursorRegex, '');

    if (!content.includes('common.css')) {
        content = content.replace(/<style>/i, '<link rel="stylesheet" href="common.css">\n  <style>');
    }
    
    // 4. Remove empty script tags and duplicate cursor divs
    content = content.replace(/<script>\s*<\/script>/g, '');
    content = content.replace(/<div id="cursor-dot"><\/div>\s*\n?/g, '');
    content = content.replace(/<div id="cursor-ring"><\/div>\s*\n?/g, '');
    content = content.replace(/<div class="cursor" id="cursor"><\/div>\s*\n?/g, '');
    content = content.replace(/<div class="cursor-ring" id="cursorRing"><\/div>\s*\n?/g, '');
    
    fs.writeFileSync(filePath, content);
}
console.log('Migration completed for HTML files.');
