import fs from 'fs';

let code = fs.readFileSync('src/App.tsx', 'utf-8');

// Ensure modal wrappers snap to bottom on mobile
code = code.replace(/flex items-center justify-center p-4 sm:p-4/g, 'flex items-end sm:items-center justify-center p-0 pt-10 sm:p-4');
code = code.replace(/flex items-center justify-center p-4/g, 'flex items-end sm:items-center justify-center p-0 pt-10 sm:p-4');
code = code.replace(/flex items-center justify-center sm:p-4/g, 'flex items-end sm:items-center justify-center p-0 pt-10 sm:p-4');

fs.writeFileSync('src/App.tsx', code);
