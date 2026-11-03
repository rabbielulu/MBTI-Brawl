import {FlowerTool} from '../src/client/garden/FlowerTool';
import {FLOWERS,flowerCapacity,type FlowerRecord} from '../src/shared/garden/FlowerConfig';
import type {GardenPlayer} from '../src/shared/garden/GardenConfig';
import type {Socket} from 'socket.io-client';
import '../src/client/garden/garden.css';
const root=document.createElement('section');root.id='garden-mode';root.innerHTML='<div class="garden-world"></div><p style="position:absolute;top:10px;left:20px;background:#fff;padding:15px">合成渲染压力场：1600朵含同格叠加，仅测试绘制开销，不代表正式地图容量。<button id="small">162朵</button><button id="large">1600朵</button></p>';document.body.append(root);
const socket={connected:false,on(){},off(){},emit(){}} as unknown as Socket;
const actors=Array.from({length:8},(_,i)=>({id:String(i),x:400+i*80,y:600,z:0})) as GardenPlayer[];
const tool=new FlowerTool(root,socket,()=>actors,()=>'',()=>{});
function populate(count:number){const flowers:FlowerRecord[]=Array.from({length:count},(_,i)=>({id:String(i),roomId:'stress',gx:i%18,gz:Math.floor(i/18)%9,flowerType:'basic',colorHex:['#FF77AA','#B899E7','#FFD166'][i%3],ownerPlayerId:String(i%8),revision:1}));tool.applySnapshot({roomId:'stress',snapshotRevision:1,flowers});}
root.querySelector('#small')!.addEventListener('click',()=>populate(flowerCapacity()));root.querySelector('#large')!.addEventListener('click',()=>populate(1600));populate(1600);
function frame(t:number){const scale=Math.min(innerWidth/1440,innerHeight/1024);(root.querySelector('.garden-world') as HTMLElement).style.transform=`scale(${scale})`;tool.render(t/1000);requestAnimationFrame(frame);}requestAnimationFrame(frame);
