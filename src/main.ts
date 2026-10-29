import {installHudMotion} from './client/ui/HudMotion';
import {CombatArt} from './client/art/CombatArt';
import {characterFace} from './client/presentation/CharacterFace';
import {characterCard,characterAbilities} from './client/presentation/CharacterCard';
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
import './client/ui/hud.css';
import { NET } from './shared/GameConstants';

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
<header><a class="brand" href="./"><span class="brand-icon">✳</span> MBTI<span class="brand-light">BRAWL</span><i>大乱斗</i></a><nav><span class="nav-active">人格试验场</span><span>LAN 对战 <small>即将开放</small></span></nav><div class="build"><b></b> PROTOTYPE <strong>V0.1</strong></div></header>
<main><div class="workspace"><section class="arena-section"><div class="arena-top"><div><span class="live-dot"></span> THE DEBATE CLUB <span class="arena-sub">/ 辩论俱乐部</span></div><div class="arena-actions"><span id="timer">00:00</span><button id="fullscreen" type="button" aria-label="进入全屏" aria-pressed="false">⛶ 全屏</button><button id="settings" aria-label="设置">⚙</button></div></div><div id="game-wrap"><div id="game"></div><div id="combat-status" role="status" hidden></div><div id="network-hud" hidden><b>NETWORK</b><button id="network-debug" type="button" aria-pressed="false">调试 F3</button><span id="network-status">DISCONNECTED</span><pre id="network-stats"></pre><small>WASD 移动 · 鼠标瞄准 · F3 调试</small></div><div class="arena-hud"><div><span class="mini-avatar">E</span><div><b>ENTP <small>YOU</small></b><span>自由练习 · 无时间限制</span></div></div><div class="targets"><span id="remaining">04</span><small>/ 04<br>训练靶存活</small></div></div><div class="arena-caption"><span>01</span><div>人格碰撞实验区<small>PERSONALITY COLLISION ZONE</small></div></div><div id="toast">移动鼠标瞄准，让观点飞一会儿。</div><div id="result" hidden><span>✳</span><p>DEBATE CLOSED</p><h2>辩到最后的人。</h2><p>训练完成。你的观点，非常有杀伤力。</p><button id="again">再来一局 ↗</button></div><div id="start-overlay"><div class="menu-mark" aria-hidden="true">✳</div><h2>MBTI大乱斗</h2><form id="entry-form" novalidate><label for="nickname-input">输入你的昵称</label><input id="nickname-input" name="nickname" placeholder="最多 7 个字" maxlength="7" autocomplete="off" aria-describedby="nickname-error"><p id="nickname-error" role="alert"></p><label for="mbti-input">输入你的 MBTI</label><input id="mbti-input" name="mbti" placeholder="例如 ENTP" maxlength="4" autocomplete="off" autocapitalize="characters" spellcheck="false" aria-describedby="mbti-note mbti-error"><p id="mbti-error" role="alert"></p><div id="roster" class="roster"></div><label for="game-mode">选择模式</label><select id="game-mode"><option value="single">单人训练 · ENTP</option><option value="lan">四人 LAN 对练 · 调试</option></select><p id="connection-error" role="alert"></p><button id="start" type="submit">进入试验场 <span aria-hidden="true">↗</span></button><small id="mbti-note">LAN 开放全部 16 人格 · 单人训练暂为 ENTP</small></form></div></div>
<div class="bottom-hud"><button id="card" class="character-entry" aria-haspopup="dialog"><span class="entry-avatar">E</span><span><b>ENTP <small>辩论家</small></b><span>人格卡与技能 <span aria-hidden="true">↗</span></span></span></button><div class="combat-shortcuts"><span><kbd>LMB</kbd> 普攻</span><span><kbd>RMB</kbd> <b id="cooldown">就绪</b></span></div><div class="health"><span class="status-icon">♡</span><div><div class="meter-label">生命值 <b id="hp-text">100 <em>/ 100</em></b></div><div class="meter"><i id="hp-fill"></i></div></div></div><div class="energy"><span class="status-icon">✳</span><div><div class="meter-label">人格能量 <b id="energy-text">0 <em>/ 100</em></b></div><div class="meter"><i id="energy-fill"></i></div></div><kbd id="ultimate-key">SPACE</kbd></div><button id="reset" title="重置训练">↻ <span>重置训练</span></button></div></section></div>
<footer><div class="controls"><span><kbd>W A S D</kbd> 移动</span><span><kbd>鼠标</kbd> 瞄准</span><span><kbd>左键</kbd> 普攻</span><span><kbd>右键</kbd> 人格技能</span><span><kbd>SPACE</kbd> 大招</span></div><span>16 种人格。无限种不服。 <b>✳</b></span></footer></main><dialog id="dialog" aria-labelledby="dialog-title"></dialog>`;
installHudMotion(app);
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
  if(multiplayer){const c=currentCharacter(),practice=network.lobby?.room?.mode==='practice';modal(`${c.mbti} · ${c.nickname}`,`<div class="character-detail-layout">${characterCard(c.mbti,playerNickname)}${characterAbilities(c.mbti)}</div><p class="muted">${practice?'试炼场可以随时更换人格。':'本局角色已锁定，结束后可在大厅更换。'} 打开档案不暂停对战。</p>`,`${practice?'<button id="profile-change" class="secondary">更换人格</button>':''}<button data-close>返回场地 ↗</button>`);dialog.classList.add('character-dialog');const change=document.querySelector<HTMLButtonElement>('#profile-change');if(change)change.onclick=()=>{dialog.close();flow.openCharacterBrowser('match');};return;}

  modal('人格档案', `<div class="character-detail">${personaMarkup}<div class="skill-details"><div class="eyebrow">COMBAT KIT / ENTP</div><h3><kbd>LMB</kbd> 嘴炮攻击</h3><p>朝鼠标方向发射文字弹，每发造成 ${kit.attackDamage} 点伤害。实际伤害转化为等量人格能量。</p><h3><kbd>RMB</kbd> ${kit.skill}</h3><p>${kit.skillDescription}</p><small>冷却 ${kit.skillCooldown / 1000} 秒</small><h3><kbd>SPACE</kbd> ${kit.ultimate}</h3><p>${kit.ultimateDescription}</p><p class="muted">打开角色卡不暂停战斗。ESC 或下方按钮返回。</p></div></div>`, '<button data-close>返回试验场 ↗</button>');
  dialog.classList.add('character-dialog');
}
$('card').onclick = showCard;
$('network-debug').onclick=()=>{debugNetwork=!debugNetwork;$('network-debug').setAttribute('aria-pressed',String(debugNetwork));};

// Touch debugging is session-only; stale saved settings must not enable it on a new visit.
function setTouch(value:boolean){scene?.clearInput();mobileInput.setEnabled(value);}
mobileInput.setEnabled(false);
try{localStorage.removeItem('mbti-touch');}catch{}
function settings() {
  modal('设置 / 暂时休战', `<label class="touch-setting">画质 <select id="art-quality"><option value="high">高 · 512 粒子</option><option value="medium">中 · 256 粒子</option><option value="low">低 · 96 粒子</option></select></label><h3>MOBILE TEST</h3><label class="touch-setting"><input type="checkbox" id="enable-touch" ${mobileInput.enabled?'checked':''}> Enable Touch Controls · 触屏调试</label><label class="touch-setting"><input type="checkbox" id="show-touch-debug" ${mobileInput.showDebug?'checked':''}> Show Touch Debug · 显示触控数据</label><p class="muted">摇杆死区 ${TOUCH.deadZone} · 透明度 ${TOUCH.opacity}<br>左摇杆移动，右摇杆拖动瞄准、松开攻击。<br>16 个人格的技能、大招已开放。方向技能拖动释放，护盾技能点击释放；ESTJ 大招可拖动瞄准。</p>`, '<button data-close>继续游戏</button><button id="settings-character" class="secondary">人格档案</button><button id="reset-viewport" class="secondary">恢复显示比例</button><button id="exit" class="secondary">返回入口</button>');
  ($('art-quality') as HTMLSelectElement).value=scene?.art?.config.quality||'high';$('art-quality').onchange=()=>scene?.art.setQuality(($('art-quality') as HTMLSelectElement).value as 'high'|'medium'|'low');
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
    $('mbti-error').textContent = isPlayable(type)?'此人格请使用四人 LAN 模式。':'请输入有效的 16 型 MBTI 人格。';
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
  art!:CombatArt;
  g!: Phaser.GameObjects.Graphics; labels: Phaser.GameObjects.Text[] = []; keys!: Record<string, Phaser.Input.Keyboard.Key>;
  px=700; py=710; hp=100; energy=0; angle=-Math.PI/2; targets: Target[]=[]; shots: Shot[]=[]; effects: Effect[]=[];
  predictedDashUntil=0;predictedDashAngle=0;
  localShotId=0;
  attackAt=0; skillAt=0; hazardAt=0; elapsed=0; moving=false; ended=false; stamp=0;
  constructor(){ super('Arena'); }
  create(){ scene=this; this.g=this.add.graphics().setDepth(0);this.characterGraphics=this.add.graphics().setDepth(10);this.visuals=new CombatVisuals(this,false);this.art=new CombatArt(this); this.keys=this.input.keyboard!.addKeys('W,A,S,D,SPACE,ESC,F3') as typeof this.keys;
    this.desktopInput=new DesktopInputAdapter(()=>({moveX:Number(this.keys.D.isDown)-Number(this.keys.A.isDown),moveY:Number(this.keys.S.isDown)-Number(this.keys.W.isDown),attack:this.input.activePointer.isDown&&this.input.activePointer.leftButtonDown()}));
    mobileInput.skillAimMode=kit.skillAimMode;
    this.input.mouse!.disableContextMenu(); this.cameras.main.setBackgroundColor('#e8f0eb');
    this.input.keyboard!.on('keydown-SPACE', (e:KeyboardEvent)=>{ e.preventDefault(); if(active&&!dialogOpen&&!mobileInput.enabled)this.desktopInput.ultimate=true; });
    this.input.keyboard!.on('keydown-F3', (e:KeyboardEvent)=>{e.preventDefault();debugNetwork=!debugNetwork;$('network-debug').setAttribute('aria-pressed',String(debugNetwork));});
    this.input.keyboard!.on('keydown-ESC', ()=>{if(!dialogOpen)settings();});
    this.input.on('pointerdown',(p:Phaser.Input.Pointer)=>{if(active&&!dialogOpen&&!mobileInput.enabled&&p.rightButtonDown())this.desktopInput.skill=true;});
    window.addEventListener('blur',()=>this.clearInput());document.addEventListener('visibilitychange',()=>{if(document.hidden)this.clearInput();});window.addEventListener('resize',()=>this.clearInput()); this.input.keyboard!.enabled = false; this.reset();
  }
  clearInput(){ this.desktopInput?.clear();mobileInput.clear();if(multiplayer)network.send(0,0,this.angle,true);this.input.keyboard?.resetKeys(); this.input.activePointer.reset(); }
  reset(){this.art?.clear();$('combat-status').hidden=true;$('reset').title='重置训练';$('reset').querySelector('span')!.textContent='重置训练';this.networkRound=-1;this.predictedDashUntil=0;this.hitFlashes.clear();document.querySelector('.arena-hud div div>span')!.textContent='自由练习 · 无时间限制';document.querySelector('.targets small')!.innerHTML='/ 04<br>训练靶存活';this.terrain=generateTerrain();this.hazardAt=0;this.px=700;this.py=710;this.hp=100;this.energy=0;this.shots=[];this.effects=[];this.elapsed=0;this.attackAt=0;this.skillAt=0;this.ended=false;this.clearInput();$('result').hidden=true;
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
  hud(){$('hp-text').innerHTML=`${Math.ceil(this.hp)} <em>/ ${localStateMaxHp()}</em>`;$('hp-fill').style.width=`${this.hp/localStateMaxHp()*100}%`;$('energy-text').innerHTML=`${Math.floor(this.energy)} <em>/ 100</em>`;$('energy-fill').style.width=`${this.energy}%`;$('ultimate-key').classList.toggle('ready',this.energy>=100);$('remaining').textContent=String(this.targets.filter(t=>t.hp>0).length).padStart(2,'0');document.querySelector('.mini-avatar')!.classList.toggle('dead',this.hp<=0);}
  update(_time:number,delta:number){if(document.body.classList.contains('flow-active'))return;const dt=Math.min(delta/1000,.04);this.stamp+=dt;const snapshot=network.snapshots.at(-1)?.value;if(multiplayer&&snapshot?.covers)this.terrain.walls=snapshot.covers.map(w=>({...w}));this.art.update(dt,multiplayer?(snapshot?.zones||[]):[],snapshot?.tick||0);const cam=this.cameras.main;const zoom=Math.max(this.scale.width/1400,this.scale.height/960);cam.setZoom(zoom);
    const halfW=this.scale.width/zoom/2,halfH=this.scale.height/zoom/2;
    const spectator=network.lobby&&flow?.spectator.active?flow.spectator:undefined;
    const followed=spectator?.targetId?network.remotes().find(p=>p.id===spectator.targetId&&p.alive):undefined;
    const hold=!!network.lobby&&network.local()?.alive===false&&(!!spectator||network.lobby.room?.phase!=='PLAYING');
    const focus=followed|| (hold?cam.midPoint:{x:this.px,y:this.py});
    const blend=followed?1-Math.exp(-10*dt):1;
    cam.centerOn(Phaser.Math.Linear(cam.midPoint.x,Phaser.Math.Clamp(focus.x,halfW,1400-halfW),blend),Phaser.Math.Linear(cam.midPoint.y,Phaser.Math.Clamp(focus.y,halfH,960-halfH),blend));
    const pointer=this.input.activePointer;const wp=pointer.positionToCamera(cam) as Phaser.Math.Vector2;
    if(multiplayer&&network.local()){this.hp=network.local()!.hp;this.energy=network.local()!.personality;}
    const matchRoom=network.lobby?.room;const matchControl=!matchRoom||(matchRoom.phase==='PLAYING'&&!!matchRoom.match?.players.find(p=>p.id===network.id)?.alive);
    const canControl=matchControl&&active&&!dialogOpen&&!this.ended&&this.hp>0&&(!multiplayer||network.connected)&&!document.hidden&&document.hasFocus()&&(!flow||flow.root.hidden);
    mobileInput.sync(active&&!dialogOpen&&!this.ended&&(!network.lobby||network.local()?.alive===true),canControl,multiplayer,this.energy,multiplayer?(network.local()?.skillCooldownRemaining||0)<=0:this.time.now>=this.skillAt);
    this.desktopInput.cooldownMs=currentCharacter().basicAttack.cooldownMs/(multiplayer?network.local()?.statuses.find(s=>s.id==='haste')?.strength||1:1);
    const mouseAngle=Math.atan2(wp.y-this.py,wp.x-this.px);
    const frame=mobileInput.enabled?mobileInput.read(this.time.now,this.angle,canControl&&!mobileInput.portrait):this.desktopInput.read(this.time.now,mouseAngle,canControl);
    if(network.lobby&&network.lobby.now()<(matchRoom?.match?.protectionEnd||0)){frame.basicAttackPressed=false;frame.skillPressed=false;frame.ultimatePressed=false;}
    if(canControl)this.angle=frame.aimAngle;
    const aimedAbility=frame.ultimatePressed?currentCharacter().ultimate:currentCharacter().skill;
    if(multiplayer&&aimedAbility.aimMode==='position'){
      const range=aimedAbility.params.range;
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
      const predictedInput={moveX:dx,moveY:dy};const confusion=localState?.statuses.find(s=>s.id==='confusion');if(confusion){const a=confusion.strength*(Math.floor(network.tick/6)%2?1:-1);predictedInput.moveX=dx*Math.cos(a)-dy*Math.sin(a);predictedInput.moveY=dx*Math.sin(a)+dy*Math.cos(a);}const forced=localState?.statuses.find(s=>s.id==='forced');if(forced){predictedInput.moveX=Math.cos(forced.angle||0);predictedInput.moveY=Math.sin(forced.angle||0);}
      const predicted=movement({x:this.px,y:this.py,velocityX:this.predictionVelocityX,velocityY:this.predictionVelocityY,moveSpeed:localState?.moveSpeed,dashSpeed:anticipating?currentCharacter().skill.params.speed:localState?.dashSpeed,dashAngle:anticipating?this.predictedDashAngle:localState?.dashAngle},predictedInput,dt,this.terrain);
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
      if(event.type==='cover'){this.art.cover(event.x,event.y,event.destroyed);continue;}
      if(event.type==='damage'){
        if(event.source!=='environment')this.art.hit(event.x,event.y);
        if(event.source==='environment'){if(event.tick%15===0)this.effects.push({x:event.x,y:event.y-35,text:'毒区',color:'#668747',life:.5,total:.5,radius:20});continue;}
        this.hitFlashes.set(event.targetId,this.time.now+160);
        const c=getCharacter(network.snapshots.at(-1)?.value.players.find(p=>p.id===event.attackerId)?.mbti||'ENTP'),p=c.presentation;this.effects.push({x:event.x,y:event.y-30,text:`−${event.damage}`,meme:p.projectile.hitText[event.id%p.projectile.hitText.length],symbol:p.projectile.impactType==='heart'?p.ultimateSymbol:p.prop,impact:p.projectile.impactType,color:p.ink,life:.65,total:.65,radius:42,suppressGeometry:true});
        if(event.targetId===network.id)this.art.shake();
      }else if(event.type==='death')this.effects.push({x:event.x,y:event.y-50,text:'倒下了！',color:'#8e7a9c',life:1,total:1,radius:65});
      else if(event.type==='cast'){this.art.skill(event.x,event.y,event.skillId,event.ultimate);const c=getCharacter(network.snapshots.at(-1)?.value.players.find(p=>p.id===event.attackerId)?.mbti||'ENTP');const outcome=event.skillId.match(/^(idea|hobby|ponder)-([0-4])$/);const outcomeSymbols=outcome?(outcome[1]==='idea'?['💣','💨','❤️','⚡','🐔']:outcome[1]==='hobby'?['💬','⚡','💥','🐔']:['⚡','💨','🛡️']):undefined;const outcomeNames=outcome?(outcome[1]==='idea'?['灵感炸弹','灵感冲刺','回血 +15','灵感加速','小鸡出动']:outcome[1]==='hobby'?['速射！','极速！','爆炸弹！','巨型小鸡！']:['攻速提升','移速提升','防御提升']):undefined;this.effects.push({x:event.x,y:event.y-40,text:outcomeNames?outcomeNames[Number(outcome![2])]:event.ultimate?c.ultimate.name:c.presentation.skillText,symbol:outcomeSymbols?outcomeSymbols[Number(outcome![2])]:event.ultimate?c.presentation.ultimateSymbol:c.presentation.skillSymbol,impact:event.ultimate&&c.ultimate.primitive==='zone'?'shockwave':'ring',color:c.presentation.ink,life:event.ultimate?1.1:.6,total:event.ultimate?1.1:.6,radius:event.radius,suppressGeometry:true});if(event.ultimate)this.art.shake(true);}
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
  text(x:number,y:number,text:string,size=14,color='#8b969b'){const label=this.labels.pop()||this.add.text(0,0,'',{fontFamily:'Arial, sans-serif'});label.setStroke('',0).setPosition(x,y).setText(text).setFontSize(size).setColor(color).setStroke('#f5f8f1',2).setOrigin(.5).setAlpha(1).setDepth(size>=39?1:55).setVisible(true);this.used.push(label);return label;}
  used:Phaser.GameObjects.Text[]=[];
  person(x:number,y:number,color:number,label:string,hp:number,max:number,player=false,hit=false,aim=this.angle,walking=this.moving,remote=false,role:string='ENTP',actorId?:string){const g=this.characterGraphics;g.fillStyle(0x6d8790,.18);g.fillEllipse(x,y+39,72,22);g.fillStyle(0x6d8790,.22);g.fillEllipse(x,y+37,52,13);if(hp<=0){g.lineStyle(5,0x52575b,.65);g.lineBetween(x-18,y+20,x+18,y+30);g.lineBetween(x-14,y+34,x+14,y+16);this.text(x,y-15,label+' ×',13,'#596167');return;}
    if(player){g.fillStyle(0x139aa8,.15);g.fillEllipse(x,y+35,78,28);g.lineStyle(5,0xfffefa,.95);g.strokeEllipse(x,y+35,78,28);g.lineStyle(3,0x139aa8,1);g.strokeEllipse(x,y+35,74,25);}
    const state=actorId?network.snapshots.at(-1)?.value.players.find(p=>p.id===actorId):undefined;const swing=(player||remote)&&walking?Math.sin(this.stamp*15)*9:0;const attacking=(player?this.time.now<this.attackAt:remote&&!!state&&network.tick-state.lastAttackTick<5);const pose=getCharacter(role).presentation.pose;const tilt=(pose==='punch'?6:pose==='debate'&&attacking?5:pose==='shy'&&hit?-6:pose==='perform'?Math.sin(this.stamp*5)*7:pose==='think'?-3:0);const presence=state?.statuses.some(s=>s.id==='escape')?.55:1;const hitPhase=actorId?Math.max(0,(this.hitFlashes.get(actorId)||0)-this.time.now)/160:.5,squash=hit?Math.sin(hitPhase*Math.PI)*.12:0;g.save();g.translateCanvas(x,y+37);g.scaleCanvas(1+squash,1-squash+Math.sin(this.stamp*2)*.012);g.translateCanvas(-x,-y-37);g.lineStyle(5,hit?0xffffff:color,presence);g.lineBetween(x+tilt,y-3,x,y+20);g.lineBetween(x,y+20,x-13-swing,y+36);g.lineBetween(x,y+20,x+13+swing,y+36);g.lineBetween(x+tilt,y+2,x-17,role==='INFP'?y+19:y+13);g.lineBetween(x+tilt,y+3,x+(role==='ENTP'&&attacking?28:18),role==='ESTJ'?y-19:role==='ESTP'&&attacking?y-12:y-4);for(const shape of characterFace(role)){
      if(shape.fill!==undefined)g.fillStyle(hit?0xffffff:shape.fill,presence);
      if(shape.stroke!==undefined)g.lineStyle(shape.width||1,shape.stroke,presence);
      if(shape.kind==='ellipse'){if(shape.fill!==undefined)g.fillEllipse(x+shape.x,y-24+shape.y,shape.w,shape.h);if(shape.stroke!==undefined)g.strokeEllipse(x+shape.x,y-24+shape.y,shape.w,shape.h);}
      else {const points=shape.points.map(p=>({x:x+p.x,y:y-24+p.y}));if(shape.fill!==undefined)g.fillPoints(points,true);if(shape.stroke!==undefined)g.strokePoints(points,shape.kind==='polygon');}
    }

    g.restore();
    this.visuals.prop(x,y,role,aim,this.stamp,!!attacking,hit,!!state?.dashSpeed||player&&this.predictedDashUntil>this.time.now,!!state?.statuses.some(s=>s.id==='adrenaline'),!!state?.statuses.some(s=>s.id==='escape'));
    if(state?.shield){g.lineStyle(2,0x81b8d7,.8);g.strokeCircle(x,y-5,42);this.text(x,y+(player?96:63),`🛡 ${Math.ceil(state.shield)}`,11,'#426c94');}if(state?.statuses.some(s=>s.id==='mark'))this.text(x,y-111,'👁 标记',13,'#477a65');this.text(x,y-90,label,12,player?'#087d89':'#706478');if(player){const ratio=Phaser.Math.Clamp(hp/max,0,1);g.fillStyle(0xfffefa,1);g.fillRoundedRect(x-41,y+48,82,12,5);g.fillStyle(0xc3e1e3,1);g.fillRoundedRect(x-38,y+51,76,6,3);if(ratio>0){g.fillStyle(0x139aa8,1);g.fillRoundedRect(x-38,y+51,76*ratio,6,3);}this.text(x,y+73,`你 · ${Math.ceil(hp)} / ${max}`,11,'#087d89').setStroke('#f5f8f1',2);}else{g.fillStyle(0xe0d7e8);g.fillRoundedRect(x-25,y+48,50,4,2);g.fillStyle(color);g.fillRoundedRect(x-25,y+48,50*hp/max,4,2);if(!network.lobby)this.text(x,y+67,`${hp} / ${max}`,10,'#8a7e93');}
  }
  draw(){this.visuals.begin();this.characterGraphics.clear();this.used.forEach(t=>t.setVisible(false));this.labels.push(...this.used);this.used=[];const g=this.g;g.clear();
    if(!multiplayer){g.fillStyle(0xf4a99c,.22);g.fillRect(560,85,280,95);g.lineStyle(1,0xd48f80,.4);g.strokeRect(560,85,280,95);this.text(700,120,'⚠ 伤害试验区',16,'#a95e51');this.text(700,148,'接触 −10 HP',11,'#ae7668');}
    for(const pool of this.terrain.mud){
      g.fillStyle(0xd4bd91,.85);g.fillPoints(pool.points.map(p=>({x:p.x,y:p.y+5})),true);
      g.fillStyle(0xe9d19f,.85);g.fillPoints(pool.points,true);
      g.lineStyle(2,0xbe9b5e,.8);g.strokePoints(pool.points,true);
      g.fillStyle(0xf8e5bb,.22);g.fillPoints(pool.points.map(p=>({x:pool.x+(p.x-pool.x)*.7,y:pool.y+(p.y-pool.y)*.7})),true);
      g.lineStyle(2,0xc4a46b,.45);g.strokeEllipse(pool.x-22,pool.y-9,33,12);g.strokeEllipse(pool.x+25,pool.y+12,24,9);
      this.text(pool.x,pool.y-3,pool.skin||'泥潭',13,'#775d33');this.text(pool.x,pool.y+16,'移速 −40%',10,'#8c7044');
    }
    for(const pool of this.terrain.toxic||[]){g.fillStyle(0xc4dca0,.6);g.fillPoints(pool.points,true);g.lineStyle(2,0x83a759,.9);g.strokePoints(pool.points,true);g.lineStyle(2,0x83a759,.35);g.strokeCircle(pool.x-25,pool.y+8,10);g.strokeCircle(pool.x+24,pool.y-13,7);this.text(pool.x,pool.y-5,pool.skin||'有毒区域',13,'#527435');this.text(pool.x,pool.y+15,'每秒 −5% 最大生命',10,'#668747');}
    for(const w of this.terrain.walls){if(w.hp===0)continue;g.fillStyle(0x6d8790,.16);g.fillEllipse(w.x+w.w/2+5,w.y+w.h+12,w.w+24,28);g.fillStyle(0x9cbccc);g.fillRoundedRect(w.x,w.y+12,w.w,w.h,7);g.fillStyle(0xcce0eb);g.fillRoundedRect(w.x,w.y,w.w,w.h,6);g.lineStyle(2,0x8faeba,.9);g.strokeRoundedRect(w.x,w.y,w.w,w.h,6);g.lineStyle(2,0xd2d4ee,.4);g.lineBetween(w.x+12,w.y+10,w.x+w.w-12,w.y+10);if(w.hp!==undefined&&w.maxHp){if(w.hp<w.maxHp){const severity=1-w.hp/w.maxHp;g.lineStyle(1.3+severity*2.2,0x242b49,.65+severity*.35);const crack=(points:number[][])=>g.strokePoints(points.map(([x,y])=>({x:w.x+x*w.w,y:w.y+y*w.h})),false);crack([[.3,0],[.42,.22],[.36,.4]]);if(severity>=.35){crack([[.36,.4],[.5,.58],[.43,.78],[.58,1]]);crack([[.42,.22],[.65,.3],[.76,.19]]);}if(severity>=.65){crack([[.5,.58],[.7,.54],[.86,.72],[1,.67]]);crack([[.36,.4],[.18,.56],[0,.48]]);}}}}

    if(multiplayer){const snap=network.snapshots.at(-1)?.value;if(snap)for(const zone of snap.zones){this.visuals.zone(zone,snap.players.find(p=>p.id===zone.ownerId)?.mbti||'ENTP',network.tick,this.stamp);if(zone.kind==='prediction'&&zone.targetId){const t=snap.players.find(p=>p.id===zone.targetId);if(t)this.visuals.geometry.aimLine(t.x,t.y,Math.atan2(zone.y-t.y,zone.x-t.x),Math.hypot(zone.x-t.x,zone.y-t.y),0xac98db);}}}
    for(const t of this.targets){this.person(t.x,t.y,t.color,t.type+' / DUMMY',t.hp,t.max,false,t.hit>this.time.now,this.angle,false,false,t.type);if(t.broken>this.time.now&&t.hp>0)this.text(t.x,t.y-112,'破防 ↑50%',12,'#9165b7');}this.person(this.px,this.py,currentCharacter().color,`${currentCharacter().mbti} / ${playerNickname}`,this.hp,localStateMaxHp(),true,multiplayer&&(this.hitFlashes.get(network.id)||0)>this.time.now,this.angle,this.moving,false,currentCharacter().mbti,multiplayer?network.id:undefined);if(this.hp>0&&terrainSpeed(this.px,this.py,this.terrain.mud)<1)this.text(this.px,this.py-132,'泥潭 · 减速 40%',13,'#a47a37');
    if(multiplayer){
      const snapshot=network.snapshots.at(-1);
      if(snapshot&&network.connected){
        for(const p of snapshot.value.players){const pos=p.id===network.id?{x:this.px,y:this.py}:p;
        if(p.alive&&p.statuses.some(s=>s.id==='reduction'||s.id==='adrenaline')){g.fillStyle(getCharacter(p.mbti).color,.12);g.fillCircle(pos.x,pos.y,51);g.lineStyle(3,getCharacter(p.mbti).color,.65);g.strokeCircle(pos.x,pos.y,51);}
          const names:string[]=p.statuses.map(s=>({vulnerable:'破防 ↑15%',reduction:`减伤 ${Math.round((1-s.strength)*100)}%`,adrenaline:'再来！',slow:'减速',speed:'加速',haste:'速射',power:'伤害强化',thinking:'思考中…',confusion:'方向干扰',forced:'听命移动',procedure:'按流程来',sop:'SOP',guard:'防御反击',escape:'淡出 / 强化一击',explosive:'爆炸弹',shield:'护盾',mark:'弱点标记'})[s.id]);if(p.mbti==='INFP'&&p.grievance>0)names.push(`委屈 ${p.grievance}`);if(names.length)this.text(pos.x,pos.y-112,names.join(' · '),12,'#a56686');}
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
    this.art.draw();
    if(debugNetwork){const map=this.terrain;this.text(700,110,`Seed ${map.seed} · ${map.profile} · Budget ${map.budget}/${30} · Safe R ${map.spawnSafeRadius}`,13,'#574160');g.lineStyle(2,0x83a759,.7);for(const p of map.spawns||[])g.strokeCircle(p.x,p.y,map.spawnSafeRadius||105);g.lineStyle(2,0xe07984,.8);for(const w of map.walls)g.strokeRect(w.x,w.y,w.w,w.h);for(const pool of [...map.mud,...(map.toxic||[])])g.strokePoints(pool.points,true);}
    if(debugNetwork){const stats=this.visuals.stats;this.visuals.memes.draw(235,155,`VFX ${stats.symbols.active}/${stats.symbols.limit} emoji · ${stats.text.active}/${stats.text.limit} text · ${Math.round(this.game.loop.actualFps)} FPS · 粒子 ${this.art.stats.particles}/${this.art.stats.budget}`,{fontSize:12,color:'#574160',screenSpace:true});}

  }
}
new Phaser.Game({type:Phaser.AUTO,parent:'game',backgroundColor:'#e8f0eb',scale:{mode:Phaser.Scale.RESIZE,width:'100%',height:'100%'},scene:Arena,render:{antialias:true},input:{keyboard:true,mouse:true}});

flow=new LobbyFlow(settings,(welcome,client)=>{
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
  document.body.classList.add('lan-mode','match-mode');document.body.classList.toggle('practice-mode',client.room?.mode==='practice');$('network-hud').hidden=true;$('start-overlay').hidden=true;
  active=true;scene.input.keyboard!.enabled=true;suggestTouch();
},()=>{active=false;scene?.clearInput();scene?.art?.clear();network.close();multiplayer=false;document.body.classList.remove('lan-mode','match-mode','practice-mode');if(scene?.input.keyboard)scene.input.keyboard.enabled=false;});
