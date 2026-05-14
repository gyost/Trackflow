import fs from 'fs';

let code = fs.readFileSync('src/App.tsx', 'utf-8');

code = code.replace(
  'className="sm:hidden fixed bottom-24 right-4 z-40',
  'className="sm:hidden fixed bottom-[calc(85px+env(safe-area-inset-bottom))] right-4 z-40'
);

// We need to also add some padding-bottom to the Mobile Card Layout so we can scroll past the FAB and Nav
code = code.replace(
  '<div className="md:hidden flex flex-col gap-4 pb-20">',
  '<div className="md:hidden flex flex-col gap-4 pb-[calc(100px+env(safe-area-inset-bottom))]">'
);

fs.writeFileSync('src/App.tsx', code);
