import {SupabaseLeaderboard} from './leaderboard/SupabaseLeaderboard';
import {installGarden} from './garden/installGarden';
import {WeeklyLeaderboard} from './leaderboard/WeeklyLeaderboard';
import {installLobby} from './lobby/installLobby';
import { createServer } from 'node:http';
import { createReadStream,existsSync,statSync } from 'node:fs';
import { resolve,extname } from 'node:path';
import { networkInterfaces } from 'node:os';
import { fileURLToPath } from 'node:url';
import { Server } from 'socket.io';
import {isPlayable} from '../src/shared/characters/CharacterDatabase';
import { GameRoom } from './GameRoom';
import { NET,PROTOCOL_VERSION } from '../src/shared/GameConstants';
import type { ClientEvents,ServerEvents } from '../src/shared/NetworkProtocol';
export function startServer(port=Number(process.env.PORT)||3000,options:{leaderboardPath?:string}={}) {
 const ledgerPath=options.leaderboardPath??(port===0?undefined:resolve(process.env.BRAWL_DATA_DIR||'data','leaderboard.json'));
 const supabaseUrl=process.env.SUPABASE_URL?.replace(/\/$/,'');
 const supabaseKey=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(port!==0&&Boolean(supabaseUrl)!==Boolean(supabaseKey))throw new Error('Configure both SUPABASE_URL and SUPABASE_SECRET_KEY.');
 if(supabaseUrl&&!/^https:\/\/[a-z0-9]+\.supabase\.co$/.test(supabaseUrl))throw new Error('SUPABASE_URL must be the hosted Supabase HTTPS project URL.');
 const leaderboard=port!==0&&supabaseUrl&&supabaseKey?new SupabaseLeaderboard(ledgerPath!,supabaseUrl,supabaseKey):new WeeklyLeaderboard(ledgerPath);
 const root=fileURLToPath(new URL('../dist/',import.meta.url));
 const mime:Record<string,string>={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png'};
 const http=createServer((req,res)=>{
  let pathname:string;try{pathname=decodeURIComponent(new URL(req.url||'/', 'http://localhost').pathname);}catch{res.writeHead(400).end();return;}
  if(pathname==='/api/leaderboard/weekly'&&req.method==='GET'){res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');if(leaderboard instanceof SupabaseLeaderboard){void leaderboard.weeklyOnline().then(data=>res.end(JSON.stringify(data))).catch(()=>{res.statusCode=503;res.end(JSON.stringify({error:'排行榜暂时不可用，请稍后重试。'}));});}else res.end(JSON.stringify(leaderboard.weekly()));return;}
  if(pathname==='/health'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({ok:true,protocolVersion:PROTOCOL_VERSION,players:room.players.size,tick:room.tick,lobbyRooms:lobby.registry.rooms.size,lobbyPlayers:lobby.registry.playerCount}));return;}
  const path=resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
  if(!path.startsWith(root)||!existsSync(path)||!statSync(path).isFile()){res.writeHead(404).end('Build missing or file not found. Run npm run build first.');return;}
  res.setHeader('Content-Type',mime[extname(path)]||'application/octet-stream');createReadStream(path).pipe(res);
 });
 const io=new Server<ClientEvents,ServerEvents>(http,{maxHttpBufferSize:8192});
 const garden=installGarden(io);
 const room=new GameRoom();
 const lobby=installLobby(io,()=>{const address=http.address();return address&&typeof address==='object'?address.port:port;},leaderboard);
 io.on('connection',socket=>{
  const raw=socket.handshake.auth.nickname;
  if(typeof raw!=='string'||!raw.trim()||Array.from(raw.trim()).length>7){socket.emit('rejected','请输入最多 7 个字的昵称。');socket.disconnect(true);return;}
  const mbti=socket.handshake.auth.mbti??'ENTP';
  if(!isPlayable(mbti)){socket.emit('rejected','请选择有效的 16 型 MBTI 人格。');socket.disconnect(true);return;}
  const player=room.add(socket.id,raw.trim(),mbti);
  if(!player){socket.emit('rejected','四人试验场已满，请等待另一名玩家退出。');socket.disconnect(true);return;}
  socket.emit('welcome',{protocolVersion:PROTOCOL_VERSION,id:player.id,map:room.map,snapshot:room.snapshot()});
  io.emit('snapshot',room.snapshot());
  socket.on('input',input=>room.input(player.id,input));
  socket.on('resetTraining',()=>{room.resetTraining();io.emit('snapshot',room.snapshot());});
  socket.on('ping',reply=>{if(typeof reply==='function')reply();});
  socket.on('disconnect',()=>{room.remove(player.id);io.emit('snapshot',room.snapshot());});
 });
 const simulation=setInterval(()=>{room.step();const events=room.drainEvents();if(events.length)io.emit('combat',events);},1000/NET.tickRate);
 const snapshots=setInterval(()=>io.emit('snapshot',room.snapshot()),1000/NET.snapshotRate);
 http.listen(port,process.env.BRAWL_HOST||'0.0.0.0',()=>{
  const address=http.address();const actual=typeof address==='object'&&address?address.port:port;
  console.log(`Local: http://localhost:${actual}`);
  for(const list of Object.values(networkInterfaces()))for(const entry of list||[])if(entry.family==='IPv4'&&!entry.internal)console.log(`LAN:   http://${entry.address}:${actual}`);
 });
 return {http,io,room,leaderboard,lobby:lobby.registry,close:()=>{if(leaderboard instanceof SupabaseLeaderboard)leaderboard.close();garden.close();lobby.close();clearInterval(simulation);clearInterval(snapshots);io.close();http.closeAllConnections();}};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))startServer();
