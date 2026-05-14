import fs from 'fs';

let code = fs.readFileSync('src/App.tsx', 'utf-8');

const doubleLine = `<div className="w-12 h-1.5 bg-[#1A1A1A]/20 rounded-full mx-auto sm:hidden absolute top-3 left-1/2 -translate-x-1/2"></div>
          <div className="w-12 h-1.5 bg-[#1A1A1A]/20 rounded-full mx-auto sm:hidden absolute top-3 left-1/2 -translate-x-1/2"></div>`;

code = code.replace(doubleLine, '<div className="w-12 h-1.5 bg-[#1A1A1A]/20 rounded-full mx-auto sm:hidden absolute top-3 left-1/2 -translate-x-1/2"></div>');

fs.writeFileSync('src/App.tsx', code);
