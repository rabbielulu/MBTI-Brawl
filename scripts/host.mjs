import { spawnSync, spawn } from 'node:child_process';
import { networkInterfaces } from 'node:os';
import { existsSync } from 'node:fs';

const port=Number(process.env.PORT)||3000;
if(!Number.isInteger(port)||port<1||port>65535)throw new Error('PORT 必须是 1–65535 的整数。');
const url=`http://localhost:${port}`;
console.log('\n✳ MBTI大乱斗 · Host 启动器\n');
if(!existsSync('node_modules/typescript/bin/tsc'))throw new Error('尚未安装依赖。请先在项目目录执行 npm install。');
console.log('正在检查并构建最新原型…');
for(const args of [['node_modules/typescript/bin/tsc','--noEmit'],['node_modules/vite/bin/vite.js','build']]){
 const result=spawnSync(process.execPath,args,{stdio:'inherit'});
 if(result.error)throw result.error;
 if(result.status!==0)process.exit(result.status||1);
}
function openPage(){
 const browser=spawn('open',[url],{stdio:'ignore'});
 browser.on('error',()=>console.log(`请手动打开 ${url}`));
}
let running=false;
try {
 const response=await fetch(`${url}/health`,{signal:AbortSignal.timeout(1500)});
 const health=await response.json();
 const page=await fetch(url,{signal:AbortSignal.timeout(1500)});
 running=health.ok===true&&typeof health.tick==='number'&&(await page.text()).includes('MBTI');
} catch { /* No existing MBTI host. Bind normally and report port errors. */ }
if(running){
 console.log(`\nHost 已在运行，已更新页面构建。\n本机：${url}`);
 for(const list of Object.values(networkInterfaces()))for(const ip of list||[])if(ip.family==='IPv4'&&!ip.internal)console.log(`同事访问：http://${ip.address}:${port}`);
 console.log('\n选择「多人乱斗」创建或加入大厅。\n此窗口可以关闭，原 Host 服务继续运行。');
 openPage();
} else {
 const {startServer}=await import('../server/GameServer.ts');
 const server=startServer(port);
 server.http.on('listening',()=>{
  console.log('\nHost 已启动。各端选择「多人乱斗」创建或加入大厅。\n保持此终端窗口打开；按 Control+C 停止 Host。\n');
  openPage();
 });
 server.http.on('error',error=>{
  console.error(error.code==='EADDRINUSE'?`端口 ${port} 被其他程序占用，请关闭占用程序后重试。`:error.message);
  server.close();process.exitCode=1;
 });
 const stop=()=>{console.log('\nHost 已停止。');server.close();};
 process.once('SIGINT',stop);process.once('SIGTERM',stop);process.once('SIGHUP',stop);
}
