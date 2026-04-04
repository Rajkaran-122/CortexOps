// Rebrand Dexter_BRD.html -> Sentinel_AI_BRD.html
const fs = require('fs');
let content = fs.readFileSync('Dexter_BRD.html', 'utf8');

const replacements = [
  ['Dexter AI Agent Platform', 'Sentinel AI Agent Platform'],
  ['DEX-BRD-2026-001', 'SNT-BRD-2026-001'],
  ['github.com/virattt/dexter', 'github.com/Rajkaran-122/CortexOps'],
  [/\bvirattt\b/g, 'Rajkaran Yadav'],
  ['CURRENT DEXTER ARCHITECTURE', 'CURRENT SENTINEL ARCHITECTURE'],
  ['DEXTER v2.0', 'SENTINEL AI v2.0'],
  [/<em>Dexter<\/em>/g, '<em>Sentinel AI</em>'],
  [/\bDexter\b/g, 'Sentinel'],
  [/\bdexter\b/g, 'sentinel'],
];

for (const [find, replace] of replacements) {
  if (find instanceof RegExp) {
    content = content.replace(find, replace);
  } else {
    content = content.split(find).join(replace);
  }
}

fs.writeFileSync('Sentinel_AI_BRD.html', content, 'utf8');
console.log('Done. Replaced all references.');
