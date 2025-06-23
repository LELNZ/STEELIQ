// Fix corrupted routes.ts file
const fs = require('fs');

const content = fs.readFileSync('server/routes.ts', 'utf8');
const lines = content.split('\n');

// Find the last proper closing and remove everything after it
let lastProperClosing = -1;
for (let i = lines.length - 1; i >= 0; i--) {
  if (lines[i].trim() === '}' && lines[i-1] && lines[i-1].includes('const httpServer = createServer(app);')) {
    lastProperClosing = i;
    break;
  }
  if (lines[i].includes('return httpServer;')) {
    lastProperClosing = i + 1;
    break;
  }
}

if (lastProperClosing > 0) {
  const fixedContent = lines.slice(0, lastProperClosing + 1).join('\n');
  fs.writeFileSync('server/routes.ts', fixedContent);
  console.log(`Fixed routes.ts, removed ${lines.length - lastProperClosing - 1} corrupted lines`);
} else {
  console.log('Could not find proper closing, manual fix needed');
}