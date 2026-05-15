const fs = require('fs');
const crypto = require('crypto');

let content = fs.readFileSync('src/mockData.ts', 'utf8');

const idMap = new Map();

function getUuid(oldId) {
  if (!idMap.has(oldId)) {
    idMap.set(oldId, crypto.randomUUID());
  }
  return idMap.get(oldId);
}

// Ensure first letter corresponds to original letter if we want but a real UUID is just random.
// Actually, randomUUID works perfectly fine.

const idFieldRegex = /([a-zA-Z]+Id):\s*'([^']+)'/g;
const justIdRegex = /id:\s*'([^']+)'/g;

let newContent = content;

newContent = newContent.replace(idFieldRegex, (match, field, value) => {
    if (value.startsWith('http')) return match; 
    const uuid = getUuid(value);
    return `${field}: '${uuid}'`;
});

newContent = newContent.replace(justIdRegex, (match, value) => {
    if (value.startsWith('http')) return match;
    const uuid = getUuid(value);
    return `id: '${uuid}'`;
});

fs.writeFileSync('src/mockData.ts', newContent);
console.log('Replaced IDs with UUIDs in mockData.ts');
