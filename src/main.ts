import {LobbyFlow} from './client/lobby/LobbyFlow';
import {PLAYABLE_TYPES,isPlayable} from './shared/characters/CharacterDatabase';
import {CHARACTERS,getCharacter} from './client/presentation/CharacterPresentation';
import {CombatVisuals,type VisualEffect} from './client/presentation/CombatVisuals';
import type {MBTIType} from './shared/characters/CharacterDefinition';
import Phaser from 'phaser';
import { character as kit } from './characters';
import './style.css';
import './light.css';
import { blocked, resolveHit } from './rules';
import { generateTerrain, terrainSpeed } from './terrain';
import { NetworkClient } from './client/network/NetworkClient';
import { movement } from './shared/Movement';
import { installZoomGuard } from './client/ui/ZoomGuard';
import { installFullscreenButton } from './client/ui/FullscreenButton';
import { DesktopInputAdapter } from './client/input/DesktopInputAdapter';
import { MobileInputAdapter } from './client/input/MobileInputAdapter';
import { idleInput,type InputIntent } from './client/input/InputAdapter';
import { TOUCH } from './client/input/TouchConfig';
import './touch.css';
import { NET } from './shared/GameConstants';

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
<header><a class="brand" href="./"><span class="brand-icon">✳</span> MBTI<span class="brand-light">BRAWL</span><i>大乱斗</i></a><nav><span class="nav-active">人格试验场</span><span>LAN 对战 <small>即将开放</small></span></nav><div class="build"><b></b> PROTOTYPE <strong>V0.1</strong></div></header>
<main><div class="workspace"><section class="arena-section"><div class="arena-top"><div><span class="live-dot"></span> THE DEBATE CLUB <span class="arena-sub">/ 辩论俱乐部</span></div><div class="arena-actions"><span id="timer">00:00</span><button id="fullscreen" type="button" aria-label="进入全屏" aria-pressed="false">⛶ 全屏</button><button id="settings" aria-label="设置">⚙</button></div></div><div id="game-wrap"><div id="game"></div><div id="combat-status" role="status" hidden></div><div id="network-hud" hidden><b>NETWORK</b><button id="network-debug" type="button" aria-pressed="false">调试 F3</button><span id="network-status">DISCONNECTED</span><pre id="network-stats"></pre><small>WASD 移动 · 鼠标瞄准 · F3 调试</small></div><div class="arena-hud"><div><span class="mini-avatar">E</span><div><b>ENTP <small>YOU</small></b><span>自由练习 · 无时间限制</span></div></div><div class="targets"><span id="remaining">04</span><small>/ 04<br>训练靶存活</small></div></div><div class="arena-caption"><span>01</span><div>人格碰撞实验区<small>PERSONALITY COLLISION ZONE</small></div></div><div id="toast">移动鼠标瞄准，让观点飞一会儿。</div><div id="result" hidden><span>✳</span><p>DEBATE CLOSED</p><h2>辩到最后的人。</h2><p>训练完成。你的观点，非常有杀伤力。</p><button id="again">再来一局 ↗</button></div><div id="start-overlay"><div class="menu-mark" aria-hidden="true">✳</div><h2>MBTI大乱斗</h2><form id="entry-form" novalidate><label for="nickname-input">输入你的昵称</label><input id="nickname-input" name="nickname" placeholder="最多 7 个字" maxlength="7" autocomplete="off" aria-describedby="nickname-error"><p id="nickname-error" role="alert"></p><label for="mbti-input">输入你的 MBTI</label><input id="mbti-input" name="mbti" placeholder="例如 ENTP" maxlength="4" autocomplete="off" autocapitalize="characters" spellcheck="false" aria-describedby="mbti-note mbti-error"><p id="mbti-error" role="alert"></p><div id="roster" class="roster"></div><label for="game-mode">选择模式</label><select id="game-mode"><option value="single">单人训练 · ENTP</option><option value="lan">四人 LAN 对练 · 调试</option></select><p id="connection-error" role="alert"></p><button id="start" type="submit">进入试验场 <span aria-hidden="true">↗</span></button><small id="mbti-note">LAN 开放 ENTP / INFP / ESTJ / ESTP · 单人训练暂为 ENTP</small></form></div></div>
<div class="bottom-hud"><button id="card" class="character-entry" aria-haspopup="dialog"><span class="entry-avatar">E</span><span><b>ENTP <small>辩论家</small></b><span>人格卡与技能 <span aria-hidden="true">↗</span></span></span></button><div class="combat-shortcuts"><span><kbd>LMB</kbd> 普攻</span><span><kbd>RMB</kbd> <b id="cooldown">就绪</b></span></div><div class="health"><span class="status-icon">♡</span><div><div class="meter-label">生命值 <b id="hp-text">100 <em>/ 100</em></b></div><div class="meter"><i id="hp-fill"></i></div></div></div><div class="energy"><span class="status-icon">✳</span><div><div class="meter-label">人格能量 <b id="energy-text">0 <em>/ 100</em></b></div><div class="meter"><i id="energy-fill"></i></div></div><kbd id="ultimate-key">SPACE</kbd></div><button id="reset" title="重置训练">↻ <span>重置训练</span></button></div></section></div>
<footer><div class="controls"><span><kbd>W A S D</kbd> 移动</span><span><kbd>鼠标</kbd> 瞄准</span><span><kbd>左键</kbd> 普攻</span><span><kbd>右键</kbd> 人格技能</span><span><kbd>SPACE</kbd> 大招</span></div><span>16 种人格。无限种不服。 <b>✳</b></span></footer></main><dialog id="dialog" aria-labelledby="dialog-title"></dialog>`;
const $ = (id: string) => document.getElementById(id)!;
const personaMarkup = `<div class="persona"><div class="persona-top"><span class="pill">分析家 · ANALYST</span><span>↗</span></div><div class="portrait"><svg viewBox="0 0 220 190"><ellipse cx="110" cy="172" rx="51" ry="9" fill="#c3b1e9"/><path d="M110 100v35m0-22-35 21m35-21 35-17m-35 39-26 34m26-34 30 34" stroke="#343045" stroke-width="9" fill="none" stroke-linecap="round"/><path d="M69 38 94 19l45 7 15 26-5 46-34 19-36-15-15-35Z" fill="#aa87e0" stroke="#343045" stroke-width="3"/><path d="m70 48 24-9 17 15 25-14 17 11-14-30-42-7-27 23" fill="#443153"/><path d="m82 64 17-3m24 0 17 5" stroke="#343045" stroke-width="4"/><circle cx="93" cy="72" r="3"/><circle cx="130" cy="72" r="3"/><path d="m99 86 24 3-7 9Z" fill="white" stroke="#343045" stroke-width="2"/><path d="m146 102 9-19" stroke="#343045" stroke-width="7"/><circle cx="158" cy="77" r="10" fill="#ecff8a" stroke="#343045" stroke-width="3"/></svg><span class="sticker">ACTUALLY…</span><span class="spark">✧</span></div><div class="persona-title"><h2>ENTP<span>辩论家</span></h2><span class="range">↗ 远程</span></div><p class="quote">“我不是想赢，我只是想证明你错了。”</p><div class="weapon"><span>装备武器</span><b>♩ 话筒 / 文字弹</b></div></div>
`;
const network=new NetworkClient();
let multiplayer=false;
let selectedType:MBTIType='ENTP';
const currentCharacter=()=>getCharacter(multiplayer?selectedType:'ENTP');
let debugNetwork=false;
const mobileInput=new MobileInputAdapter();
const resetViewport=installZoomGuard();
let touchPrompted=false;
let playerNickname = '玩家';
let active = false;
let flow:LobbyFlow;
let scene: Arena;
let dialogOpen = false;
const dialog = $('dialog') as HTMLDialogElement;
function modal(title: string, body: string, actions: string) {
  scene?.clearInput(); dialogOpen = true;
  dialog.classList.remove("character-dialog");
  dialog.innerHTML = `<div class="eyebrow">MBTI BRAWL / SANDBOX</div><h2 id="dialog-title">${title}</h2>${body}<div class="modal-actions">${actions}</div>`;
  if (!dialog.open) dialog.showModal();
  dialog.querySelector('[data-close]')?.addEventListener('click', () => dialog.close());
}
dialog.addEventListener('close', () => { dialogOpen = false; scene?.clearInput(); });
dialog.addEventListener('cancel', () => { dialogOpen = false; });
window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && dialog.open) {
    event.preventDefault();
    event.stopImmediatePropagation();
    dialog.close();
  }
}, true);
function localStateMaxHp(){return multiplayer?(network.local()?.maxHp||kit.hp):kit.hp;}
function showCard() {
  if(multiplayer){const c=currentCharacter();modal(`${c.mbti} · ${c.nickname}`,`<div class="character-profile" style="--character-color:${c.colorCss}"><div class="character-emblem">${c.presentation.symbol}</div><p>${c.group} · ${c.presentation.weapon}</p><h3>${c.presentation.fantasy}</h3><p><kbd>LMB</kbd> ${c.presentation.basicName} · ${c.basicAttack.damage} 伤害 / ${c.basicAttack.cooldownMs}ms</p><h3><kbd>RMB</kbd> ${c.skill.name}</h3><p>${c.skill.description}</p><small>冷却 ${c.skill.cooldown} 秒 · ${c.skill.aimMode==='position'?'鼠标指定区域 / 触屏拖动选择方向':c.skill.aimMode==='direction'?'朝瞄准方向释放':'点击释放'}</small><h3><kbd>SPACE</kbd> ${c.ultimate.name}</h3><p>${c.ultimate.description}</p><small>消耗 100 人格能量</small><h3>特质 · ${c.trait.name}</h3><p>${c.trait.description}</p><p class="muted">WASD 移动 · 鼠标瞄准 · 左键普攻 / 右键技能 / 空格大招。触屏使用双摇杆和技能按钮。打开档案不暂停对战。</p></div>`,'<button data-close>返回场地 ↗</button>');return;}

  modal('人格档案', `<div class="character-detail">${personaMarkup}<div class="skill-details"><div class="eyebrow">COMBAT KIT / ENTP</div><h3><kbd>LMB</kbd> 嘴炮攻击</h3><p>朝鼠标方向发射文字弹，每发造成 ${kit.attackDamage} 点伤害。实际伤害转化为等量人格能量。</p><h3><kbd>RMB</kbd> ${kit.skill}</h3><p>${kit.skillDescription}</p><small>冷却 ${kit.skillCooldown / 1000} 秒</small><h3><kbd>SPACE</kbd> ${kit.ultimate}</h3><p>${kit.ultimateDescription}</p><p class="muted">打开角色卡不暂停战斗。ESC 或下方按钮返回。</p></div></div>`, '<button data-close>返回试验场 ↗</button>');
  dialog.classList.add('character-dialog');
}
$('card').onclick = showCard;
$('network-debug').onclick=()=>{debugNetwork=!debugNetwork;$('network-debug').setAttribute('aria-pressed',String(debugNetwork));};

function setTouch(value:boolean){scene?.clearInput();mobileInput.setEnabled(value);try{localStorage.setItem('mbti-touch',String(value));}catch{}}
try{mobileInput.setEnabled(localStorage.getItem('mbti-touch')==='true');}catch{}
function settings() {
  modal('设置 / 暂时休战', `<h3>MOBILE TEST</h3><label class="touch-setting"><input type="checkbox" id="enable-touch" ${mobileInput.enabled?'checked':''}> Enable Touch Controls · 触屏调试</label><label class="touch-setting"><input type="checkbox" id="show-touch-debug" ${mobileInput.showDebug?'checked':''}> Show Touch Debug · 显示触控数据</label><p class="muted">摇杆死区 ${TOUCH.deadZone} · 透明度 ${TOUCH.opacity}<br>左摇杆移动，右摇杆拖动瞄准、松开攻击。<br>四个人格的技能、大招已开放。方向技能拖动释放，护盾技能点击释放；ESTJ 大招可拖动瞄准。</p>`, '<button data-close>继续游戏</button><button id="settings-character" class="secondary">人格档案</button><button id="reset-viewport" class="secondary">恢复显示比例</button><button id="exit" class="secondary">返回入口</button>');
  $('settings-character').hidden=document.body.classList.contains('flow-active');
  $('settings-character').onclick=showCard;
  $('reset-viewport').onclick=()=>{scene?.clearInput();resetViewport();};
  $('enable-touch').onchange=()=>setTouch(($('enable-touch') as HTMLInputElement).checked);
  $('show-touch-debug').onchange=()=>{mobileInput.showDebug=($('show-touch-debug') as HTMLInputElement).checked;};
  $('exit').onclick=()=>{dialog.close();active=false;network.close();multiplayer=false;document.body.classList.remove('lan-mode');$('network-hud').hidden=true;scene.reset();$('start-overlay').hidden=false;scene.input.keyboard!.enabled=false;flow.home();};
}
function suggestTouch(){
  if(navigator.maxTouchPoints<=0||touchPrompted||mobileInput.enabled)return;
  touchPrompted=true;
  modal('检测到触屏设备','<p>是否开启测试操作界面？左侧移动，右侧拖动瞄准并松手攻击。可随时在设置中关闭。</p>','<button id="accept-touch">开启</button><button data-close class="secondary">不用</button>');
  $('accept-touch').onclick=()=>{setTouch(true);dialog.close();};
}
$('settings').onclick = settings;
installFullscreenButton($('fullscreen') as HTMLButtonElement,()=>scene?.clearInput(),message=>modal('全屏提示',`<p>${message}</p>`,'<button data-close>知道了</button>'));
const mbtiInput = $('mbti-input') as HTMLInputElement;
const nicknameInput = $('nickname-input') as HTMLInputElement;
nicknameInput.addEventListener('input', () => {
  nicknameInput.removeAttribute('aria-invalid');
  $('nickname-error').textContent = '';
});
$('roster').innerHTML=PLAYABLE_TYPES.map(type=>`<button type="button" data-character="${type}" style="--character-color:${CHARACTERS[type].colorCss}"><b>${type}</b><small>${CHARACTERS[type].nickname}</small></button>`).join('');
$('roster').querySelectorAll<HTMLButtonElement>('button').forEach(button=>button.onclick=()=>{mbtiInput.value=button.dataset.character!;($('game-mode') as HTMLSelectElement).value='lan';$('mbti-error').textContent='';$('roster').querySelectorAll('button').forEach(b=>b.classList.toggle('selected',b===button));});
const validTypes = new Set('INTJ INTP ENTJ ENTP INFJ INFP ENFJ ENFP ISTJ ISFJ ESTJ ESFJ ISTP ISFP ESTP ESFP'.split(' '));
mbtiInput.addEventListener('input', () => {
  mbtiInput.value = mbtiInput.value.toUpperCase();
  mbtiInput.removeAttribute('aria-invalid');
  $('mbti-error').textContent = '';
});
$('entry-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const nickname = nicknameInput.value.trim();
  if (!nickname || Array.from(nickname).length > 7) {
    $('nickname-error').textContent = '请输入昵称（最多 7 个字）。';
    nicknameInput.setAttribute('aria-invalid', 'true');
    nicknameInput.focus();
    return;
  }
  const type = mbtiInput.value.trim().toUpperCase();
  if (!validTypes.has(type)) {
    $('mbti-error').textContent = '找不到这个人格，请输入正确的 MBTI。';
    mbtiInput.setAttribute('aria-invalid', 'true');
    mbtiInput.focus();
    return;
  }
  const lan=($('game-mode') as HTMLSelectElement).value==='lan';
  if (!isPlayable(type)||(type!=='ENTP'&&!lan)) {
    $('mbti-error').textContent = isPlayable(type)?'此人格请使用四人 LAN 模式。':'本轮开放 ENTP、INFP、ESTJ、ESTP，其余人格后续加入。';
    return;
  }
  selectedType=type as MBTIType;
  $('connection-error').textContent='';
  multiplayer=($('game-mode') as HTMLSelectElement).value==='lan';
  if(multiplayer){
    const button=$('start') as HTMLButtonElement;button.disabled=true;button.textContent='正在连接…';
    try {
      const welcome=await network.connect(nickname,selectedType);
      scene.reset();scene.terrain=welcome.map;scene.targets=[];
      const local=welcome.snapshot.players.find(p=>p.id===welcome.id)!;
      scene.px=local.x;scene.py=local.y;
      document.body.classList.add('lan-mode');$('network-hud').hidden=false;
    } catch(error){
      multiplayer=false;$('connection-error').textContent=(error as Error).message;
      button.disabled=false;button.textContent='进入试验场 ↗';return;
    }
    button.disabled=false;button.textContent='进入试验场 ↗';
  } else {network.close();document.body.classList.remove('lan-mode');$('network-hud').hidden=true;scene.reset();}
  const c=currentCharacter();
  (document.querySelector('.mini-avatar') as HTMLElement).style.background=c.colorCss;($('card').querySelector('.entry-avatar') as HTMLElement).style.background=c.colorCss;
  mobileInput.skillAimMode=c.skill.aimMode;mobileInput.ultimateAimMode=c.ultimate.aimMode;
  scene.desktopInput.cooldownMs=c.basicAttack.cooldownMs;
  document.querySelector('.arena-hud b')!.innerHTML=`${c.mbti} <small>YOU</small>`;
  document.querySelector('.mini-avatar')!.textContent=c.presentation.symbol;
  $('card').querySelector('b')!.textContent=`${c.mbti} · ${c.nickname}`;
  $('card').querySelector('.entry-avatar')!.textContent=c.presentation.symbol;
  playerNickname = nickname;
  nicknameInput.blur();
  active = true;
  $('start-overlay').hidden = true;
  mbtiInput.blur();
  scene.input.keyboard!.enabled = true;
  suggestTouch();
  if(multiplayer)scene.toast('四人 LAN · 左键普攻 / 右键技能 / 空格大招 · 人格档案查看玩法');
});
$('reset').onclick = () => {if(network.lobby)return;if(multiplayer)network.resetTraining();else scene.reset();};
$('again').onclick = () => scene.reset();

type Target = { x: number; y: number; hp: number; max: number; type: string; color: number; broken: number; hit: number };
type Shot = { id:number; x: number; y: number; vx: number; vy: number; life: number; skill: boolean };
type Effect = VisualEffect;

export class Arena extends Phaser.Scene {
  desktopInput!:DesktopInputAdapter;
  networkRound=-1;velocityTick=-1;predictionVelocityX=0;predictionVelocityY=0;correctionCount=0;predictionError=0;
  hitFlashes=new Map<string,number>();
  terrain = generateTerrain();
  visuals!:CombatVisuals;characterGraphics!:Phaser.GameObjects.Graphics;
  g!: Phaser.GameObjects.Graphics; labels: Phaser.GameObjects.Text[] = []; keys!: Record<string, Phaser.Input.Keyboard.Key>;
  px=700; py=710; hp=100; energy=0; angle=-Math.PI/2; targets: Target[]=[]; shots: Shot[]=[]; effects: Effect[]=[];
  predictedDashUntil=0;predictedDashAngle=0;
  localShotId=0;
  attackAt=0; skillAt=0; hazardAt=0; elapsed=0; moving=false; ended=false; stamp=0;
  constructor(){ super('Arena'); }
  create(){ scene=this; this.g=this.add.graphics().setDepth(0);this.characterGraphics=this.add.graphics().setDepth(10);this.visuals=new CombatVisuals(this); this.keys=this.input.keyboard!.addKeys('W,A,S,D,SPACE,ESC,F3') as typeof this.keys;
    this.desktopInput=new DesktopInputAdapter(()=>({moveX:Number(this.keys.D.isDown)-Number(this.keys.A.isDown),moveY:Number(this.keys.S.isDown)-Number(this.keys.W.isDown),attack:this.input.activePointer.isDown&&this.input.activePointer.leftButtonDown()}));
    mobileInput.skillAimMode=kit.skillAimMode;
    this.input.mouse!.disableContextMenu(); this.cameras.main.setBackgroundColor('#f4f2ed');
    this.input.keyboard!.on('keydown-SPACE', (e:KeyboardEvent)=>{ e.preventDefault(); if(active&&!dialogOpen&&!mobileInput.enabled)this.desktopInput.ultimate=true; });
    this.input.keyboard!.on('keydown-F3', (e:KeyboardEvent)=>{e.preventDefault();debugNetwork=!debugNetwork;$('network-debug').setAttribute('aria-pressed',String(debugNetwork));});
    this.input.keyboard!.on('keydown-ESC', ()=>{if(!dialogOpen)settings();});
    this.input.on('pointerdown',(p:Phaser.Input.Pointer)=>{if(active&&!dialogOpen&&!mobileInput.enabled&&p.rightButtonDown())this.desktopInput.skill=true;});
    window.addEventListener('blur',()=>this.clearInput());document.addEventListener('visibilitychange',()=>{if(document.hidden)this.clearInput();});window.addEventListener('resize',()=>this.clearInput()); this.input.keyboard!.enabled = false; this.reset();
  }
  clearInput(){ this.desktopInput?.clear();mobileInput.clear();if(multiplayer)network.send(0,0,this.angle,true);this.input.keyboard?.resetKeys(); this.input.activePointer.reset(); }
  reset(){$('combat-status').hidden=true;$('reset').title='重置训练';$('reset').querySelector('span')!.textContent='重置训练';this.networkRound=-1;this.predictedDashUntil=0;this.hitFlashes.clear();document.querySelector('.arena-hud div div>span')!.textContent='自由练习 · 无时间限制';document.querySelector('.targets small')!.innerHTML='/ 04<br>训练靶存活';this.terrain=generateTerrain();this.hazardAt=0;this.px=700;this.py=710;this.hp=100;this.energy=0;this.shots=[];this.effects=[];this.elapsed=0;this.attackAt=0;this.skillAt=0;this.ended=false;this.clearInput();$('result').hidden=true;
    this.targets=[{x:300,y:340,type:'INFP',color:0x8fbda1},{x:1100,y:340,type:'ESTJ',color:0x8bb6d4},{x:330,y:660,type:'ESTP',color:0xdec67f},{x:1080,y:660,type:'ENTP',color:0xb69bfa}].map(t=>({...t,hp:150,max:150,broken:0,hit:0}));this.toast('WASD 移动 · 左键攻击 · 右键破防 · 空格大招');this.hud();}
  toastTimer?: ReturnType<typeof setTimeout>;
  toast(text:string){clearTimeout(this.toastTimer);$('toast').textContent=text;$('toast').hidden=false;this.toastTimer=setTimeout(()=>{$('toast').hidden=true;},4000);}
  blocked(x:number,y:number,r=20){return blocked(x,y,r,this.terrain.walls);}
  move(dx:number,dy:number){if(!this.blocked(this.px+dx,this.py))this.px+=dx;if(!this.blocked(this.px,this.py+dy))this.py+=dy;}
  fire(skill=false){if(multiplayer)return;if(this.ended||this.hp<=0)return;this.shots.push({id:++this.localShotId,x:this.px+Math.cos(this.angle)*30,y:this.py+Math.sin(this.angle)*30,vx:Math.cos(this.angle)*kit.projectileSpeed,vy:Math.sin(this.angle)*kit.projectileSpeed,life:kit.basicAttack.lifetimeMs/1000,skill});this.effects.push({x:this.px,y:this.py,text:skill?getCharacter('ENTP').presentation.skillText:'',symbol:skill?getCharacter('ENTP').presentation.skillSymbol:undefined,color:'#725098',life:.2,total:.2,radius:38});}
  skill(){if(multiplayer)return;if(this.time.now<this.skillAt||this.ended)return;this.skillAt=this.time.now+kit.skillCooldown;this.fire(true);}
  damage(t:Target,n:number){const hit=resolveHit(t.hp,n,t.broken>this.time.now,this.energy); const damage=hit.damage;t.hp=hit.hp;t.hit=this.time.now+120;this.energy=hit.energy;this.effects.push({x:t.x,y:t.y-50,text:`−${damage}`,symbol:getCharacter('ENTP').presentation.prop,meme:getCharacter('ENTP').presentation.projectile.hitText[this.effects.length%3],color:'#725098',life:.8,total:.8});if(t.hp<=0){this.effects.push({x:t.x,y:t.y,text:'无言以对',color:'#8e7a9c',life:1.2,total:1.2,radius:65});}this.hud();if(this.targets.every(t=>t.hp<=0))this.finish(true);}
  ultimate(){if(multiplayer)return;if(this.energy<100||this.ended){this.toast('人格能量还不够。继续用观点造成伤害！');return;}this.energy=0;this.cameras.main.shake(240,.006);this.effects.push({x:this.px,y:this.py,text:kit.ultimate.toUpperCase(),symbol:getCharacter('ENTP').presentation.ultimateSymbol,impact:'shockwave',color:'#725098',life:.7,total:.7,radius:kit.ultimateRadius});this.targets.filter(t=>t.hp>0&&Phaser.Math.Distance.Between(this.px,this.py,t.x,t.y)<kit.ultimateRadius).forEach(t=>{this.damage(t,kit.ultimateDamage);const a=Math.atan2(t.y-this.py,t.x-this.px);const x=t.x+Math.cos(a)*65,y=t.y+Math.sin(a)*65;if(!this.blocked(x,y)){t.x=x;t.y=y;}});this.toast('我不是针对谁。是说在座的各位。');this.hud();}
  finish(win:boolean){this.ended=true;$('result').hidden=false;$('result').querySelector('h2')!.textContent=win?'辩到最后的人。':'先冷静，再开口。';$('result').querySelectorAll('p')[1].textContent=win?'训练完成。你的观点，非常有杀伤力。':'你被试验区淘汰了。重新训练，再试一次。';}
  hud(){$('hp-text').innerHTML=`${this.hp} <em>/ ${localStateMaxHp()}</em>`;$('hp-fill').style.width=`${this.hp/localStateMaxHp()*100}%`;$('energy-text').innerHTML=`${Math.floor(this.energy)} <em>/ 100</em>`;$('energy-fill').style.width=`${this.energy}%`;$('ultimate-key').classList.toggle('ready',this.energy>=100);$('remaining').textContent=String(this.targets.filter(t=>t.hp>0).length).padStart(2,'0');document.querySelector('.mini-avatar')!.classList.toggle('dead',this.hp<=0);}
  update(_time:number,delta:number){if(document.body.classList.contains('flow-active'))return;const dt=Math.min(delta/1000,.04);this.stamp+=dt;const cam=this.cameras.main;const zoom=Math.max(this.scale.width/1400,this.scale.height/960);cam.setZoom(zoom);
    const halfW=this.scale.width/zoom/2,halfH=this.scale.height/zoom/2;
    cam.centerOn(Phaser.Math.Clamp(this.px,halfW,1400-halfW),Phaser.Math.Clamp(this.py,halfH,960-halfH));
    const pointer=this.input.activePointer;const wp=pointer.positionToCamera(cam) as Phaser.Math.Vector2;
    if(multiplayer&&network.local()){this.hp=network.local()!.hp;this.energy=network.local()!.personality;}
    const matchRoom=network.lobby?.room;const matchControl=!matchRoom||(matchRoom.phase==='PLAYING'&&!!matchRoom.match?.players.find(p=>p.id===network.id)?.alive);
    const canControl=matchControl&&active&&!dialogOpen&&!this.ended&&this.hp>0&&(!multiplayer||network.connected)&&!document.hidden&&document.hasFocus();
    mobileInput.sync(active&&!dialogOpen&&!this.ended,canControl,multiplayer,this.energy,multiplayer?(network.local()?.skillCooldownRemaining||0)<=0:this.time.now>=this.skillAt);
    const mouseAngle=Math.atan2(wp.y-this.py,wp.x-this.px);
    const frame=mobileInput.enabled?mobileInput.read(this.time.now,this.angle,canControl&&!mobileInput.portrait):this.desktopInput.read(this.time.now,mouseAngle,canControl);
    if(network.lobby&&network.lobby.now()<(matchRoom?.match?.protectionEnd||0)){frame.basicAttackPressed=false;frame.skillPressed=false;frame.ultimatePressed=false;}
    if(canControl)this.angle=frame.aimAngle;
    if(multiplayer&&currentCharacter().skill.aimMode==='position'){
      const range=currentCharacter().skill.params.range;
      frame.targetX=mobileInput.enabled?this.px+Math.cos(frame.aimAngle)*range*mobileInput.targetDistance:wp.x;
      frame.targetY=mobileInput.enabled?this.py+Math.sin(frame.aimAngle)*range*mobileInput.targetDistance:wp.y;
    }
    this.moving=false;
    if(active&&multiplayer){if(!network.lobby)this.elapsed+=dt;else if(matchRoom?.phase==='PLAYING')this.elapsed=Math.max(0,(network.lobby.now()-(matchRoom.match?.startAt||network.lobby.now()))/1000);this.updateNetwork(dt,frame);}
    if(active&&!multiplayer&&!this.ended){this.elapsed+=dt;if(!dialogOpen){
      this.moving=!!(frame.moveX||frame.moveY);const speed=kit.speed*terrainSpeed(this.px,this.py,this.terrain.mud);
      this.move(frame.moveX*speed*dt,frame.moveY*speed*dt);
      if(frame.basicAttackPressed&&this.time.now>=this.attackAt){this.fire();this.attackAt=this.time.now+kit.attackCooldown;}
      if(frame.skillPressed)this.skill();if(frame.ultimatePressed)this.ultimate();
    }
      if(this.py<180&&this.px>560&&this.px<840&&this.time.now>this.hazardAt){this.hp=Math.max(0,this.hp-10);this.hazardAt=this.time.now+700;this.effects.push({x:this.px,y:this.py-55,text:'−10',color:'#cf6e61',life:.6,total:.6});this.hud();if(this.hp===0)this.finish(false);}
      for(const s of this.shots){const steps=Math.ceil(Math.hypot(s.vx,s.vy)*dt/12);for(let i=0;i<steps&&s.life>0;i++){s.x+=s.vx*dt/steps;s.y+=s.vy*dt/steps;if(this.blocked(s.x,s.y,4)){s.life=0;break;}const t=this.targets.find(t=>t.hp>0&&Math.hypot(t.x-s.x,t.y-s.y)<29);if(t){this.damage(t,s.skill?24:kit.attackDamage);if(s.skill)t.broken=this.time.now+4000;s.life=0;}}s.life-=dt;}
    }this.shots=this.shots.filter(s=>s.life>0);this.effects.forEach(e=>e.life-=dt);this.effects=this.effects.filter(e=>e.life>0);
    const secs=Math.floor(this.elapsed);$('timer').textContent=`${String(Math.floor(secs/60)).padStart(2,'0')}:${String(secs%60).padStart(2,'0')}`;const cooldown=multiplayer?(network.local()?.skillCooldownRemaining||0):Math.max(0,(this.skillAt-this.time.now)/1000);$('cooldown').textContent=cooldown>0?`${cooldown.toFixed(1)}s`:'就绪';this.draw();
  }
  updateNetwork(dt:number,frame:InputIntent){
    let dx=0,dy=0;
    const localState=network.local();
    if(localState){this.hp=localState.hp;this.energy=localState.personality;if(this.velocityTick!==network.tick){this.velocityTick=network.tick;this.predictionVelocityX=localState.velocityX;this.predictionVelocityY=localState.velocityY;}const latest=network.snapshots.at(-1)!.value;if(latest.round!==this.networkRound){this.networkRound=latest.round;this.effects=[];this.hitFlashes.clear();network.combatQueue=[];this.px=localState.x;this.py=localState.y;this.clearInput();}}
    if(network.connected&&this.hp>0&&(!network.lobby||network.lobby.room?.phase==='PLAYING')){dx=frame.moveX;dy=frame.moveY;}
    if(this.hp<=0&&localState){this.px=localState.x;this.py=localState.y;this.predictionVelocityX=0;this.predictionVelocityY=0;}
    const divisor=Math.max(1,Math.hypot(dx,dy));dx/=divisor;dy/=divisor;
    if(network.connected&&this.hp>0&&(!network.lobby||network.lobby.room?.phase==='PLAYING')){
      if(localState?.dashSpeed||localState?.skillCooldownRemaining)this.predictedDashUntil=0;
      if(frame.skillPressed&&selectedType==='ESTP'&&!localState?.skillCooldownRemaining){this.predictedDashUntil=this.time.now+100;this.predictedDashAngle=frame.aimAngle;}
      const anticipating=this.predictedDashUntil>this.time.now;
      const predicted=movement({x:this.px,y:this.py,velocityX:this.predictionVelocityX,velocityY:this.predictionVelocityY,moveSpeed:localState?.moveSpeed,dashSpeed:anticipating?currentCharacter().skill.params.speed:localState?.dashSpeed,dashAngle:anticipating?this.predictedDashAngle:localState?.dashAngle},{moveX:dx,moveY:dy},dt,this.terrain);
      this.moving=Math.hypot(predicted.x-this.px,predicted.y-this.py)>.001;this.px=predicted.x;this.py=predicted.y;this.predictionVelocityX=predicted.velocityX;this.predictionVelocityY=predicted.velocityY;
      if(frame.basicAttackPressed){
        this.attackAt=this.time.now+currentCharacter().basicAttack.cooldownMs;
        this.effects.push({x:this.px+Math.cos(this.angle)*36,y:this.py+Math.sin(this.angle)*36,text:'',color:'#d6ad43',life:.12,total:.12,radius:20});
      }
      const protectedSpawn=!!network.lobby&&network.lobby.now()<(network.lobby.room?.match?.protectionEnd||0);
      network.sendIntent({...frame,moveX:dx,moveY:dy,...(protectedSpawn?{basicAttackPressed:false,skillPressed:false,ultimatePressed:false}:{})});
      const authority=network.local();
      if(authority&&!anticipating){
        const latest=network.snapshots.at(-1)!;
        const age=Math.min(.2,(performance.now()-latest.at)/1000+network.ping/2000+1/NET.tickRate);
        const target=movement(authority,{moveX:dx,moveY:dy},age,this.terrain);
        const error=this.predictionError=Math.hypot(target.x-this.px,target.y-this.py);
        if(error>NET.snapError){this.correctionCount++;this.px=target.x;this.py=target.y;}
        else if(error>NET.smallError){this.correctionCount++;
          const alpha=Math.min(1,NET.correctionRate*dt);const x=this.px+(target.x-this.px)*alpha,y=this.py+(target.y-this.py)*alpha;
          if(!this.blocked(x,y)){this.px=x;this.py=y;}
        }
      }
    }
    $('network-status').textContent=network.connected?'CONNECTED':network.status;
    document.querySelector('.arena-hud div div>span')!.textContent='四人 LAN · 人格对战';
    $('network-status').classList.toggle('offline',!network.connected);
    const count=network.snapshots.at(-1)?.value.players.length||0;
    $('network-stats').textContent=`Player: ${network.id || '—'}    Players: ${count} / ${NET.maxPlayers}\nPing: ${network.ping} ms\nServer: ${NET.tickRate} ticks/s · Tick ${network.tick}\nSnapshot: ${NET.snapshotRate}/s`+(debugNetwork?`\nLOCAL ${network.id} X:${this.px.toFixed(1)} Y:${this.py.toFixed(1)} Aim:${this.angle.toFixed(2)}\nSeq ${network.seq} / Ack ${localState?.lastAckSeq||0}\nError ${this.predictionError.toFixed(1)} / Corrections ${this.correctionCount}\nJitter ${network.jitter} ms / Character Alpha\nLast Attack Tick ${localState?.lastAttackTick??'—'}`:'');
    for(const event of network.combatQueue.splice(0)){
      if(event.round!==this.networkRound)continue;
      if(event.type==='damage'){
        this.hitFlashes.set(event.targetId,this.time.now+160);
        const c=getCharacter(network.snapshots.at(-1)?.value.players.find(p=>p.id===event.attackerId)?.mbti||'ENTP'),p=c.presentation;this.effects.push({x:event.x,y:event.y-30,text:`−${event.damage}`,meme:p.projectile.hitText[event.id%p.projectile.hitText.length],symbol:p.projectile.impactType==='heart'?p.ultimateSymbol:p.prop,impact:p.projectile.impactType,color:p.ink,life:.65,total:.65,radius:42});
        if(event.targetId===network.id)this.cameras.main.shake(80,.002);
      }else if(event.type==='death')this.effects.push({x:event.x,y:event.y-50,text:'倒下了！',color:'#8e7a9c',life:1,total:1,radius:65});
      else if(event.type==='cast'){const c=getCharacter(network.snapshots.at(-1)?.value.players.find(p=>p.id===event.attackerId)?.mbti||'ENTP');this.effects.push({x:event.x,y:event.y-40,text:event.ultimate?c.ultimate.name:c.presentation.skillText,symbol:event.ultimate?c.presentation.ultimateSymbol:c.presentation.skillSymbol,impact:event.ultimate&&c.ultimate.primitive==='zone'?'shockwave':'ring',color:c.presentation.ink,life:event.ultimate?1.1:.6,total:event.ultimate?1.1:.6,radius:event.radius});if(event.ultimate)this.cameras.main.shake(140,.003);}
      else if(event.kind==='melee'){const c=getCharacter(network.snapshots.at(-1)?.value.players.find(p=>p.id===event.attackerId)?.mbti||'ESTP');this.effects.push({x:event.x+Math.cos(event.aimAngle)*48,y:event.y+Math.sin(event.aimAngle)*48,text:'',symbol:c.presentation.prop,color:c.presentation.ink,life:.22,total:.22,radius:32,impact:'bonk'});}
      else if(event.attackerId!==network.id)this.effects.push({x:event.x+Math.cos(event.aimAngle)*36,y:event.y+Math.sin(event.aimAngle)*36,text:'',color:'#88b58d',life:.15,total:.15,radius:20});
    }
    this.hud();
    if(network.lobby){const room=network.lobby.room;const alive=room?.match?.players.filter(p=>p.alive).length||0;$('remaining').textContent=String(alive).padStart(2,'0');document.querySelector('.targets small')!.textContent=`/ ${room?.players.length||0} 存活`;document.querySelector('.arena-hud div div>span')!.textContent='自由混战 · 最后存活者获胜';return;}
    $('reset').title='重置对练';$('reset').querySelector('span')!.textContent='重置对练';
    const status=$('combat-status');status.hidden=this.hp>0||!network.connected;
    status.textContent='你已被击倒 · 点击右下角「重置对练」让全员重新开始';
    $('remaining').textContent=String(count).padStart(2,'0');
    const caption=document.querySelector('.targets small')!;caption.innerHTML='/ 04<br>在线玩家';
  }
  text(x:number,y:number,text:string,size=14,color='#8b969b'){const label=this.labels.pop()||this.add.text(0,0,'',{fontFamily:'Arial, sans-serif'});label.setPosition(x,y).setText(text).setFontSize(size).setColor(color).setOrigin(.5).setAlpha(1).setDepth(size>=39?1:55).setVisible(true);this.used.push(label);return label;}
  used:Phaser.GameObjects.Text[]=[];
  person(x:number,y:number,color:number,label:string,hp:number,max:number,player=false,hit=false,aim=this.angle,walking=this.moving,remote=false,role:string='ENTP',actorId?:string){const g=this.characterGraphics;g.fillStyle(0x80648f,.12);g.fillEllipse(x,y+37,57,15);if(hp<=0){g.lineStyle(5,0x52575b,.65);g.lineBetween(x-18,y+20,x+18,y+30);g.lineBetween(x-14,y+34,x+14,y+16);this.text(x,y-15,label+' ×',13,'#596167');return;}
    if(player){g.lineStyle(2,0x9874c0,.7);g.strokeEllipse(x,y+33,65,24);g.lineStyle(1,0x9874c0,.2);g.strokeCircle(x,y,48);}
    const state=actorId?network.snapshots.at(-1)?.value.players.find(p=>p.id===actorId):undefined;const swing=(player||remote)&&walking?Math.sin(this.stamp*15)*9:0;const attacking=(player?this.time.now<this.attackAt:remote&&!!state&&network.tick-state.lastAttackTick<5);const tilt=(role==='ESTP'?6:role==='ENTP'&&attacking?5:role==='INFP'&&hit?-6:0);g.lineStyle(5,hit?0xffffff:color);g.lineBetween(x+tilt,y-3,x,y+20);g.lineBetween(x,y+20,x-13-swing,y+36);g.lineBetween(x,y+20,x+13+swing,y+36);g.lineBetween(x+tilt,y+2,x-17,role==='INFP'?y+19:y+13);g.lineBetween(x+tilt,y+3,x+(role==='ENTP'&&attacking?28:18),role==='ESTJ'?y-19:role==='ESTP'&&attacking?y-12:y-4);g.fillStyle(hit?0xffffff:color);g.fillRoundedRect(x-21,y-42,42,39,12);g.fillStyle(0x262731);g.fillRect(x-22,y-43,43,12);g.fillTriangle(x-21,y-32,x-11,y-28,x-17,y-44);g.fillStyle(0x252830);g.fillCircle(x-8,y-24,2);g.fillCircle(x+8,y-24,2);g.lineStyle(2,0x252830);g.lineBetween(x-5,y-13,x+7,y-15);
    if(role==='INFP'){g.lineStyle(3,0x527665);g.lineBetween(x-9,y-12,x-4,y-10);g.lineBetween(x+4,y-10,x+9,y-12);}
    if(role==='ESTJ'){g.fillStyle(0x526b86);g.fillRect(x-24,y-46,48,8);}
    if(role==='ESTP'){g.fillStyle(0xf0b679);g.fillRect(x-22,y-35,44,7);}

    this.visuals.prop(x,y,role,aim,this.stamp,!!attacking,hit,!!state?.dashSpeed||player&&this.predictedDashUntil>this.time.now,!!state?.statuses.some(s=>s.id==='adrenaline'));
    this.text(x,y-68,label,12,player?'#674782':'#706478');if(!player){g.fillStyle(0xe0d7e8);g.fillRoundedRect(x-25,y+48,50,4,2);g.fillStyle(color);g.fillRoundedRect(x-25,y+48,50*hp/max,4,2);if(!network.lobby)this.text(x,y+67,`${hp} / ${max}`,10,'#8a7e93');}
  }
  draw(){this.visuals.begin();this.characterGraphics.clear();this.used.forEach(t=>t.setVisible(false));this.labels.push(...this.used);this.used=[];const g=this.g;g.clear();g.fillStyle(0xfaf9f5);g.fillRoundedRect(45,60,1310,840,18);g.lineStyle(1,0xe6e1e8,.7);for(let x=60;x<1360;x+=50)g.lineBetween(x,65,x,895);for(let y=65;y<900;y+=50)g.lineBetween(50,y,1350,y);g.lineStyle(3,0xc5bacd);g.strokeRoundedRect(55,70,1290,820,12);g.lineStyle(1,0xe1d9e8,.7);g.strokeCircle(700,480,220);g.strokeCircle(700,480,215);g.lineBetween(700,90,700,870);g.lineBetween(70,480,1330,480);
    if(!multiplayer){g.fillStyle(0xf4a99c,.22);g.fillRect(560,85,280,95);g.lineStyle(1,0xd48f80,.4);g.strokeRect(560,85,280,95);this.text(700,120,'⚠ 伤害试验区',16,'#a95e51');this.text(700,148,'接触 −10 HP',11,'#ae7668');}
    this.text(700,390,'MBTI',66,'#e6dfeb');this.text(700,545,'B R A W L',39,'#e6dfeb');this.text(700,588,'LET YOUR PERSONALITY DO THE TALKING.',9,'#bab0c2');
    for(const pool of this.terrain.mud){
      g.fillStyle(0xd4bd91,.85);g.fillPoints(pool.points.map(p=>({x:p.x,y:p.y+5})),true);
      g.fillStyle(0xe9d19f,.85);g.fillPoints(pool.points,true);
      g.lineStyle(2,0xbe9b5e,.8);g.strokePoints(pool.points,true);
      g.fillStyle(0xf8e5bb,.22);g.fillPoints(pool.points.map(p=>({x:pool.x+(p.x-pool.x)*.7,y:pool.y+(p.y-pool.y)*.7})),true);
      g.lineStyle(2,0xc4a46b,.45);g.strokeEllipse(pool.x-22,pool.y-9,33,12);g.strokeEllipse(pool.x+25,pool.y+12,24,9);
      this.text(pool.x,pool.y-3,'泥潭',13,'#775d33');this.text(pool.x,pool.y+16,'移速 −50%',10,'#8c7044');
    }
    for(const w of this.terrain.walls){g.fillStyle(0xbeb1cc,.5);g.fillRoundedRect(w.x+4,w.y+9,w.w,w.h,7);g.fillStyle(0xcdddF0);g.fillRoundedRect(w.x,w.y,w.w,w.h,6);g.lineStyle(2,0x97afc6);g.strokeRoundedRect(w.x,w.y,w.w,w.h,6);g.lineStyle(2,0xf7fbff,.5);g.lineBetween(w.x+12,w.y+10,w.x+w.w-12,w.y+10);}
    if(multiplayer){const snap=network.snapshots.at(-1)?.value;if(snap)for(const zone of snap.zones)this.visuals.zone(zone,snap.players.find(p=>p.id===zone.ownerId)?.mbti||'ENTP',network.tick,this.stamp);}
    for(const t of this.targets){this.person(t.x,t.y,t.color,t.type+' / DUMMY',t.hp,t.max,false,t.hit>this.time.now,this.angle,false,false,t.type);if(t.broken>this.time.now&&t.hp>0)this.text(t.x,t.y-88,'破防 ↑50%',12,'#9165b7');}this.person(this.px,this.py,currentCharacter().color,`${currentCharacter().mbti} / ${playerNickname}`,this.hp,localStateMaxHp(),true,multiplayer&&(this.hitFlashes.get(network.id)||0)>this.time.now,this.angle,this.moving,false,currentCharacter().mbti,multiplayer?network.id:undefined);if(this.hp>0&&terrainSpeed(this.px,this.py,this.terrain.mud)<1)this.text(this.px,this.py-91,'泥潭 · 减速 50%',13,'#a47a37');
    if(multiplayer){
      const snapshot=network.snapshots.at(-1);
      if(snapshot&&network.connected){
        for(const p of snapshot.value.players){const pos=p.id===network.id?{x:this.px,y:this.py}:p;if(p.alive&&network.lobby&&network.lobby.now()<(network.lobby.room?.match?.protectionEnd||0)){g.lineStyle(3,0xb8a2e1,.7);g.strokeCircle(pos.x,pos.y,52);}
        if(p.alive&&p.statuses.some(s=>s.id==='reduction'||s.id==='adrenaline')){g.fillStyle(getCharacter(p.mbti).color,.12);g.fillCircle(pos.x,pos.y,51);g.lineStyle(3,getCharacter(p.mbti).color,.65);g.strokeCircle(pos.x,pos.y,51);}
          const names:string[]=p.statuses.map(s=>s.id==='vulnerable'?'破防 ↑50%':s.id==='reduction'?'忍耐 −50%':s.id==='adrenaline'?'再来！': '减速');if(p.mbti==='INFP'&&p.grievance>0)names.push(`委屈 ${p.grievance}`);if(names.length)this.text(pos.x,pos.y-90,names.join(' · '),12,'#a56686');}
        for(const shot of network.projectiles()){
          const {x,y}=shot;
          const owner=snapshot.value.players.find(p=>p.id===shot.ownerId);this.visuals.projectile(shot,x,y,owner?.mbti||'ENTP',this.stamp);
        }
      }
      for(const remote of network.remotes()){
        this.person(remote.x,remote.y,getCharacter(remote.mbti).color,`${remote.mbti} / ${remote.nickname}`,remote.hp,remote.maxHp,false,(this.hitFlashes.get(remote.id)||0)>this.time.now,remote.aimAngle,remote.movementState==='walk',true,remote.mbti,remote.id);
        if(debugNetwork)this.text(remote.x,remote.y+64,`REMOTE ${remote.id} X:${remote.x.toFixed(0)} Y:${remote.y.toFixed(0)} Aim:${remote.aimAngle.toFixed(2)}`,11,'#42765f');
      }
      if(debugNetwork){const a=network.local();if(a){g.fillStyle(0xe87768);g.fillCircle(a.x,a.y,5);}}
    }
    if(multiplayer&&currentCharacter().skill.aimMode==='position'&&this.hp>0&&(mobileInput.skill.pointer!==null||mobileInput.ultimatePointer!==null)){
      const x=this.px+Math.cos(this.angle)*280*mobileInput.targetDistance,y=this.py+Math.sin(this.angle)*280*mobileInput.targetDistance;g.lineStyle(3,currentCharacter().color,.6);g.strokeCircle(x,y,mobileInput.ultimatePointer!==null?190:125);this.text(x,y,'松手指定区域',14,'#6487a5');
    }
    if(mobileInput.enabled&&mobileInput.aiming&&this.hp>0){
      this.visuals.geometry.aimLine(this.px,this.py,this.angle,150,currentCharacter().color);
    }
    for(const s of this.shots)this.visuals.projectile({id:s.id,source:s.skill?'skill':'basic',vx:s.vx,vy:s.vy},s.x,s.y,'ENTP',this.stamp);
    if(this.effects.length>80)this.effects.splice(0,this.effects.length-80);
    for(const e of this.effects)this.visuals.effect(e);
    if(debugNetwork){const stats=this.visuals.stats;this.visuals.memes.draw(235,155,`VFX ${stats.symbols.active}/${stats.symbols.limit} emoji · ${stats.text.active}/${stats.text.limit} text · ${Math.round(this.game.loop.actualFps)} FPS`,{fontSize:12,color:'#574160',screenSpace:true});}

  }
}
new Phaser.Game({type:Phaser.AUTO,parent:'game',backgroundColor:'#f4f2ed',scale:{mode:Phaser.Scale.RESIZE,width:'100%',height:'100%'},scene:Arena,render:{antialias:true},input:{keyboard:true,mouse:true}});

flow=new LobbyFlow(()=>{active=false;multiplayer=false;network.close();document.body.classList.remove('lan-mode');$('network-hud').hidden=true;scene?.reset();$('start-overlay').hidden=false;($('game-mode') as HTMLSelectElement).value='single';mbtiInput.value='ENTP';if(scene?.input.keyboard)scene.input.keyboard.enabled=false;},settings,(welcome,client)=>{
  network.attach(welcome,client);multiplayer=true;active=false;scene.reset();
  scene.terrain=welcome.map;scene.targets=[];const local=welcome.snapshot.players.find(p=>p.id===welcome.id)!;
  selectedType=local.mbti;playerNickname=local.nickname;scene.px=local.x;scene.py=local.y;
  const c=currentCharacter();mobileInput.skillAimMode=c.skill.aimMode;mobileInput.ultimateAimMode=c.ultimate.aimMode;scene.desktopInput.cooldownMs=c.basicAttack.cooldownMs;
  document.querySelector('.arena-hud b')!.textContent=`${c.mbti} / ${playerNickname}`;document.querySelector('.mini-avatar')!.textContent=c.presentation.symbol;
  document.querySelector<HTMLElement>('.mini-avatar')!.style.background=c.colorCss;
  $('card').querySelector('b')!.textContent=`${c.mbti} · ${c.nickname}`;
  $('card').querySelector('.entry-avatar')!.textContent=c.presentation.symbol;
  ($('card').querySelector('.entry-avatar') as HTMLElement).style.background=c.colorCss;
  $('toast').hidden=true;
  document.body.classList.add('lan-mode','match-mode');$('network-hud').hidden=true;$('start-overlay').hidden=true;
  active=true;scene.input.keyboard!.enabled=true;suggestTouch();
},()=>{active=false;scene.clearInput();network.close();multiplayer=false;document.body.classList.remove('lan-mode','match-mode');scene.input.keyboard!.enabled=false;});
