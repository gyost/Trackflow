import fs from 'fs';

let code = fs.readFileSync('src/App.tsx', 'utf-8');

const s = '<div className="w-12 h-1.5 bg-[#1A1A1A]/20 rounded-full mx-auto sm:hidden absolute top-3 left-1/2 -translate-x-1/2"></div>';

while (code.indexOf(s + '\\n          ' + s) !== -1 || code.indexOf(s + '\\n        ' + s) !== -1 || code.indexOf(s + '\\n' + s) !== -1) {
  code = code.replace(s + '\\n          ' + s, s);
  code = code.replace(s + '\\n        ' + s, s);
  code = code.replace(s + '\\n' + s, s);
  code = code.replace(s + s, s);
}

fs.writeFileSync('src/App.tsx', code);
