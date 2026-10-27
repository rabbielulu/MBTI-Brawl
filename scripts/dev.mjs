import { spawn } from 'node:child_process';
const children=[spawn(process.execPath,['--import','tsx','server/GameServer.ts'],{stdio:'inherit'}),spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','0.0.0.0'],{stdio:'inherit'})];
let closing=false;
function stop(code=0){if(closing)return;closing=true;for(const child of children)child.kill();process.exitCode=code;}
children.forEach(child=>{child.on('error',()=>stop(1));child.on('exit',code=>stop(code||0));});
process.on('SIGINT',()=>stop());process.on('SIGTERM',()=>stop());
