import fs from 'fs';

let code = fs.readFileSync('src/App.tsx', 'utf-8');

// Add a little drag handle line at the top of bottomsheet modals on mobile
// Every <div className="bg-[#F7F6F2] p-4 sm:p-8... rounded-t-2xl sm:rounded-none"> needs a handle
// We can just inject the handle immediately after the first div opening that matches

code = code.split('<div className="bg-[#F7F6F2] p-4 sm:p-8')
  .join('<div className="bg-[#F7F6F2] pt-8 p-4 sm:p-8 min-h-[50vh]'); // Ensure minimum height

code = code.split('rounded-t-2xl sm:rounded-none">')
  .join('rounded-t-2xl sm:rounded-none">\n          <div className="w-12 h-1.5 bg-[#1A1A1A]/20 rounded-full mx-auto sm:hidden absolute top-3 left-1/2 -translate-x-1/2"></div>');

// Repeat for White bg modals
code = code.split('<div className="relative bg-white')
  .join('<div className="relative bg-white pt-8 sm:pt-6'); // Adjust top padding for handle

code = code.split('sm:rounded-none">')
  .join('sm:rounded-none">\n          <div className="w-12 h-1.5 bg-[#1A1A1A]/20 rounded-full mx-auto sm:hidden absolute top-3 left-1/2 -translate-x-1/2"></div>');


fs.writeFileSync('src/App.tsx', code);
