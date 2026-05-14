import fs from 'fs';

let code = fs.readFileSync('src/App.tsx', 'utf-8');

const singleHandle = '<div className="w-12 h-1.5 bg-[#1A1A1A]/20 rounded-full mx-auto sm:hidden absolute top-3 left-1/2 -translate-x-1/2"></div>';

while (code.includes(singleHandle + '\\n          ' + singleHandle) || code.includes(singleHandle + '\\n        ' + singleHandle)) {
   code = code.replace(singleHandle + '\\n          ' + singleHandle, singleHandle);
   code = code.replace(singleHandle + '\\n        ' + singleHandle, singleHandle);
}

fs.writeFileSync('src/App.tsx', code);
