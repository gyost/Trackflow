import fs from 'fs';

let code = fs.readFileSync('src/App.tsx', 'utf-8');

const oldFilterTabs = `             {/* Swipeable Tabs for mobile */}
             <div className="flex w-full xl:w-auto overflow-x-auto hide-scrollbar-on-mobile snap-x snap-mandatory pb-2 -mb-2 gap-4 sm:gap-6 shrink-0">`;
             
const newFilterTabs = `             {/* Swipeable Tabs for mobile */}
             <div className="hidden xl:flex w-full xl:w-auto overflow-x-auto hide-scrollbar-on-mobile snap-x snap-mandatory pb-2 -mb-2 gap-4 sm:gap-6 shrink-0">`;

code = code.replace(oldFilterTabs, newFilterTabs);

// Hide the vertical divider on mobile just in case
const oldDivider = `<div className="hidden xl:block w-[1px] h-4 bg-[#1A1A1A]/20 ml-2"></div>`;
const newDivider = `<div className="hidden xl:block w-[1px] h-4 bg-[#1A1A1A]/20 ml-2"></div>`; // It's already hidden on mobile

fs.writeFileSync('src/App.tsx', code);
