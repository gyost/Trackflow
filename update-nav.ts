import fs from 'fs';

let code = fs.readFileSync('src/App.tsx', 'utf-8');

const oldNav = `<nav className="md:hidden fixed bottom-0 left-0 w-full bg-[#F7F6F2]/90 backdrop-blur-md border-t border-[#1A1A1A]/10 z-40 pb-[env(safe-area-inset-bottom)] px-2 h-[calc(60px+env(safe-area-inset-bottom))] flex items-center justify-around shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)]">`;
const newNav = `<nav className="md:hidden fixed bottom-0 left-0 w-full bg-white/70 backdrop-blur-2xl border-t border-black/5 z-40 pb-[env(safe-area-inset-bottom)] px-2 h-[calc(70px+env(safe-area-inset-bottom))] flex items-center justify-around shadow-[0_-10px_40px_rgba(0,0,0,0.04)] before:absolute before:inset-x-0 before:top-0 before:h-[1px] before:bg-white/40">`;

code = code.replace(oldNav, newNav);

// Also need to make sure h-16 or h-14 is used for buttons instead of h-12 to fit Apple style tab bar height better.
code = code.replace(/className={\`flex flex-col items-center justify-center w-16 h-12 gap-1 rounded-xl transition-all/g, 'className={`flex flex-col items-center justify-center w-16 h-14 gap-1 rounded-xl transition-all pt-1');

// Adjust the floating action button to match new heights
const oldFab = `bottom-[calc(85px+env(safe-area-inset-bottom))]`;
const newFab = `bottom-[calc(90px+env(safe-area-inset-bottom))]`;
code = code.replace(oldFab, newFab);

fs.writeFileSync('src/App.tsx', code);
