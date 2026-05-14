import fs from 'fs';

let code = fs.readFileSync('src/App.tsx', 'utf-8');

// Replace standard modal padding
code = code.replace(/className="fixed inset-0 (.*?) p-4"/g, 'className="fixed inset-0 $1 p-4 sm:p-4"');

// Using string replace instead
code = code.split('<div className="bg-[#F7F6F2] p-6 sm:p-8 max-w-md w-full border border-[#1A1A1A] shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar">')
  .join('<div className="bg-[#F7F6F2] p-4 sm:p-8 max-w-md w-full border-t sm:border border-[#1A1A1A] shadow-2xl relative h-[100dvh] sm:h-auto max-h-[100dvh] sm:max-h-[90vh] overflow-y-auto custom-scrollbar mt-auto sm:mt-0 rounded-t-2xl sm:rounded-none">');

code = code.split('<div className="relative bg-white sm:border border-[#1A1A1A]/10 w-full sm:max-w-lg p-6 sm:p-8 shadow-2xl h-[100dvh] sm:h-auto sm:max-h-[90vh] sm:rounded-sm overflow-y-auto custom-scrollbar">')
  .join('<div className="relative bg-white sm:border border-[#1A1A1A]/10 w-full sm:max-w-lg p-4 sm:p-8 shadow-2xl h-[100dvh] sm:h-auto sm:max-h-[90vh] sm:rounded-sm overflow-y-auto custom-scrollbar mt-auto sm:mt-0 rounded-t-2xl sm:rounded-none">');

code = code.split('<div className="relative bg-white sm:border border-[#1A1A1A]/10 w-full sm:max-w-2xl p-6 sm:p-8 shadow-2xl flex flex-col h-[100dvh] sm:h-auto sm:max-h-[90vh] sm:rounded-sm">')
  .join('<div className="relative bg-white sm:border border-[#1A1A1A]/10 w-full sm:max-w-2xl p-4 sm:p-8 shadow-2xl flex flex-col h-[100dvh] sm:h-auto sm:max-h-[90vh] sm:rounded-sm mt-auto sm:mt-0 rounded-t-2xl sm:rounded-none">');


fs.writeFileSync('src/App.tsx', code);
