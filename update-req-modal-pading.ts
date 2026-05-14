import fs from 'fs';

let code = fs.readFileSync('src/App.tsx', 'utf-8');

const detailBodyOld = `<div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              <div className="mb-10">`;

const detailBodyNew = `<div className="flex-1 overflow-y-auto px-5 py-6 sm:p-8 custom-scrollbar">
              <div className="mb-6 sm:mb-10">`;

code = code.replace(detailBodyOld, detailBodyNew);

fs.writeFileSync('src/App.tsx', code);
