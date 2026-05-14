import * as fs from 'fs';

let appData = fs.readFileSync('src/App.tsx', 'utf8');
appData = appData.replace(/updatedMember\.role/g, 'updatedMember.roles');
appData = appData.replace(/currentUser\.role ===/g, 'currentUser.roles.includes');
appData = appData.replace(/currentUser\.role/g, 'currentUser.roles');
appData = appData.replace(/currentUser\.roles\.includes \('组长'\)/g, "currentUser.roles.includes('组长')");
appData = appData.replace(/assignee\?\.role\?\.split\(' - '\)\[0\] \|\| assignee\?\.role/g, "assignee?.roles?.join(', ')");
appData = appData.replace(/roles: defaultAdmin\.roles/g, 'roles: defaultAdmin.roles');
fs.writeFileSync('src/App.tsx', appData);

let modalData = fs.readFileSync('src/components/SettingsModal.tsx', 'utf8');
modalData = modalData.replace(/role: ''/g, 'roles: []');
modalData = modalData.replace(/role: newMemberRole/g, 'roles: newMemberRoles');
modalData = modalData.replace(/member\.role/g, 'member.roles.join(", ")');
modalData = modalData.replace(/roles: member\.roles\.join\(\", \"\)/g, 'roles: member.roles');
fs.writeFileSync('src/components/SettingsModal.tsx', modalData);
