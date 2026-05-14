import * as fs from 'fs';

let appData = fs.readFileSync('src/App.tsx', 'utf8');
appData = appData.replace(/currentUser\.role === '组长'/g, "currentUser.roles.includes('组长')");
fs.writeFileSync('src/App.tsx', appData);
