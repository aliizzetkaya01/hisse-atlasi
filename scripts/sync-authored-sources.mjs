import fs from 'node:fs';
const root='../hisse-atlasi-explorer/src/content/';
for(const name of ['DashboardContent.jsx','WatchCharts.jsx','watch-utils.mjs','dashboard.css'])fs.copyFileSync(root+'dashboard/'+name,'explorer-source/'+name);
fs.mkdirSync('explorer-source/shared',{recursive:true});
for(const name of ['i18n.mjs','LanguageUI.jsx'])fs.copyFileSync(root+'shared/'+name,'explorer-source/shared/'+name);
fs.copyFileSync(root+'shared/i18n.mjs','dist/i18n.mjs');
console.log('Authored sources and public UI dictionary synchronized.');
