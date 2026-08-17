const fs = require('fs');
const lines = fs.readFileSync('app/super-admin/gyms/page.tsx', 'utf8').split('\n');
let depth = 0;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  for (const ch of line) {
    if (ch === '{') depth++;
    else if (ch === '}') depth--;
    if (depth < 0) {
      console.log(`Negative depth at line ${i + 1}: "${line.trim()}"`);
      depth = 0; // reset to continue
    }
  }
}
console.log('Final depth:', depth);