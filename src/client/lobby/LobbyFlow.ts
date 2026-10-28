import {MatchConclusion} from '../results/MatchConclusion';
import '../results/results.css';
import {addBotShortcut,debugStartShortcut} from './BotShortcut';
import {SpectatorController,spectatorShortcut} from '../spectator/SpectatorController';
import type {Welcome} from '../../shared/NetworkProtocol';
import {LobbyClient} from './LobbyClient';
import {CHARACTERS,getCharacter} from '../presentation/CharacterPresentation';
import {PLAYABLE_TYPES,isPlayable} from '../../shared/characters/CharacterDatabase';
import type {LobbyRoomState,PlayerIdentity} from '../../shared/LobbyProtocol';
import './lobby.css';
type FlowView='home'|'identity'|'lobby'|'match';
/** Lobby UI presents authoritative match state; gameplay stays in the Phaser adapter. */
export class LobbyFlow {
 private conclusion?:MatchConclusion;
 readonly spectator=new SpectatorController();
 root:HTMLDivElement;client:LobbyClient;view:FlowView='home';private editing=false;private identity:PlayerIdentity={mbti:'ENTP',nickname:''};private requestedRoom?:string;private renderKey='';private timer:ReturnType<typeof setInterval>;private disconnectMessage='';private attempt=0;private displayedRoom?:LobbyRoomState;private addingBot=false;private startingDebug=false;private botMessage='';
 constructor(private practice:()=>void,private settings:()=>void,private startMatch:(welcome:Welcome,client:LobbyClient)=>void,private stopMatch:()=>void){
  this.root=document.createElement('div');this.root.id='flow-root';document.querySelector('#app')!.append(this.root);
  this.client=new LobbyClient(room=>{if(this.client.playerId){this.disconnectMessage='';if(this.view==='match'){if(room.phase==='LOBBY')this.returnToLobby(room);else this.updateMatch();return;}if(this.editing&&room.phase!=='LOBBY'){this.editing=false;this.attempt++;this.showLobby(room,true);this.element('lobby-message').textContent='已进入开局准备，角色已锁定。';}else this.showLobby(room);}},reason=>{this.disconnectMessage=reason||(this.view==='match'?'连接中断，正在尝试恢复席位（最多 10 秒）……':'与服务器断开了，当前席位已释放。请重新连接房间。');if(this.view==='identity')this.element('identity-error').textContent=this.disconnectMessage;else this.updateStatus();});
  this.client.onMatch=welcome=>this.showMatch(welcome);
  try{const saved=JSON.parse(localStorage.getItem('mbti-lobby-identity')||'null');if(saved&&isPlayable(saved.mbti)&&typeof saved.nickname==='string')this.identity={mbti:saved.mbti,nickname:saved.nickname};}catch{}
  const params=new URLSearchParams(location.search);if(params.has('room')){this.requestedRoom=params.get('room')||'';this.showIdentity();}else this.home();
  window.addEventListener('keydown',event=>{
   if(document.hidden||document.querySelector<HTMLDialogElement>('#dialog')?.open)return;
   const target=event.target instanceof Element?event.target:undefined;
   const editing=!!target?.closest('input,textarea,select,[contenteditable]:not([contenteditable="false"])');
   if(this.view==='lobby'&&debugStartShortcut(event,editing||!!target?.closest('a,button:not(#lobby-add-bot)'))){event.preventDefault();event.stopImmediatePropagation();void this.debugStart();return;}
   if((this.view==='lobby'||this.view==='match')&&addBotShortcut(event,editing)){
    event.preventDefault();event.stopImmediatePropagation();
    if(this.view==='lobby')void this.addBot();
    else{const message=document.querySelector('#match-test-message');if(message)message.textContent='本局已开战，机器人请在下一局大厅添加。';}
    return;
   }
   if(this.view!=='match'||!this.spectator.active)return;
   const direction=spectatorShortcut(event,editing);
   if(direction){event.preventDefault();event.stopImmediatePropagation();if(!this.disconnectMessage){this.spectator.switch(direction);this.updateMatch();}}
  },true);
  this.timer=setInterval(()=>this.updateStatus(),200);
  window.addEventListener('pagehide',()=>this.client.close());
  window.addEventListener('pageshow',event=>{if(event.persisted){const params=new URLSearchParams(location.search);this.requestedRoom=params.has('room')?params.get('room')||'':undefined;this.requestedRoom!==undefined?this.showIdentity():this.home();}});
 }
 private element<T extends HTMLElement=HTMLElement>(id:string){return this.root.querySelector<T>(`#${id}`)!;}
 private shell(content:string){document.querySelector<HTMLElement>('main')!.inert=true;this.root.hidden=false;document.body.classList.add('flow-active');this.root.innerHTML=`<div class="flow-bar"><button id="flow-brand" class="flow-brand">✳ MBTI BRAWL</button><div><button id="flow-fullscreen" aria-label="全屏">⛶ 全屏</button><button id="flow-settings" aria-label="设置">⚙</button></div></div>${content}`;this.root.scrollTop=0;this.element('flow-brand').onclick=()=>this.home();this.element('flow-settings').onclick=this.settings;this.element('flow-fullscreen').onclick=()=>document.querySelector<HTMLButtonElement>('#fullscreen')!.click();}
 private setUrl(roomId?:string){const url=new URL(location.href);if(roomId!==undefined)url.searchParams.set('room',roomId);else url.searchParams.delete('room');history.replaceState(null,'',url);}
 private remember(){try{localStorage.setItem('mbti-lobby-identity',JSON.stringify(this.identity));}catch{}}
 home(){this.conclusion?.destroy();this.conclusion=undefined;this.botMessage='';this.spectator.reset();document.body.classList.remove('spectator-mode');this.client?.close();if(this.view==='match')this.stopMatch();document.querySelector('#match-ui')?.remove();this.attempt++;this.client?.close();this.displayedRoom=undefined;this.requestedRoom=undefined;this.disconnectMessage='';this.editing=false;this.view='home';this.setUrl();this.shell(`<section class="flow-home"><div class="flow-kicker">16 PERSONALITIES. ONE BIG MESS.</div><div class="flow-stickers" aria-hidden="true">💬 <span>♥️</span> 📋 <span>👊</span></div><h1>MBTI<span>大乱斗</span></h1><p>发个链接，来场人格碰撞。</p><button id="flow-multiplayer" class="flow-primary">多人乱斗 <span>↗</span></button><button id="flow-practice" class="flow-secondary">单人试玩</button><button id="flow-ranking" class="flow-text" disabled>🏆 排行榜 · 敬请期待</button><small>16 种人格 · 16 种乱斗方式</small></section>`);this.element('flow-multiplayer').onclick=()=>{this.requestedRoom=undefined;this.showIdentity();};this.element('flow-practice').onclick=()=>{this.root.hidden=true;document.querySelector<HTMLElement>('main')!.inert=false;document.body.classList.remove('flow-active');this.practice();};}
 private showIdentity(editing=false){
  this.attempt++;this.editing=editing;this.view='identity';this.shell(`<section class="identity-panel"><button id="identity-back" class="flow-text">← ${editing?'返回大厅':'返回主页'}</button><div class="flow-kicker">PICK YOUR PERSONALITY</div><h1>${editing?'换个人格，换种玩法':'你今天是什么人格？'}</h1><p id="identity-room-note"></p><form id="identity-form" novalidate><label for="identity-mbti">选择你的 MBTI</label><select id="identity-mbti">${PLAYABLE_TYPES.map(type=>`<option value="${type}">${type} · ${CHARACTERS[type].nickname}</option>`).join('')}</select><label for="identity-nickname">昵称 <small>1–12 个字符</small></label><input id="identity-nickname" maxlength="24" autocomplete="nickname" placeholder="朋友们怎么叫你？" aria-describedby="identity-error"><div class="identity-preview"><span id="identity-symbol"></span><div><b id="identity-name"></b><small id="identity-line"></small></div></div><label for="identity-room">房间号 <small>${this.requestedRoom!==undefined?'来自邀请链接':'可选，留空创建新房间'}</small></label><input id="identity-room" maxlength="4" autocomplete="off" spellcheck="false" placeholder="例如 ABCD"><p id="identity-error" role="alert"></p><button id="identity-submit" type="submit" class="flow-primary">${editing?'保存角色':this.requestedRoom!==undefined?'加入朋友的房间':'进入房间'} ↗</button><button id="identity-new-room" type="button" class="flow-text" ${editing?'hidden':''}>创建新房间</button></form></section>`);
  const mbti=this.element<HTMLSelectElement>('identity-mbti'),nickname=this.element<HTMLInputElement>('identity-nickname'),room=this.element<HTMLInputElement>('identity-room');mbti.value=this.identity.mbti;nickname.value=this.identity.nickname;room.value=editing?this.client.room?.id||'':this.requestedRoom||'';room.readOnly=editing||this.requestedRoom!==undefined;
  this.element('identity-room-note').textContent=editing?'开局前可以随时修改。':this.requestedRoom!==undefined?`朋友邀请你加入房间 ${this.requestedRoom||'（链接不完整）'}`:'选好人格和昵称，其他的交给房间。';

  const updatePreview=()=>{const c=getCharacter(mbti.value);this.element('identity-symbol').textContent=c.presentation.symbol;this.element('identity-name').textContent=`${c.mbti} · ${nickname.value.trim()||'你的昵称'}`;this.element('identity-line').textContent=c.presentation.fantasy;};updatePreview();mbti.onchange=updatePreview;nickname.oninput=updatePreview;
  this.element('identity-back').onclick=()=>editing&&this.client.room?this.showLobby(this.client.room,true):this.home();
  this.element('identity-new-room').onclick=()=>{this.requestedRoom=undefined;this.setUrl();this.showIdentity();};
  this.element<HTMLFormElement>('identity-form').onsubmit=async event=>{
   event.preventDefault();const value=nickname.value.trim(),type=mbti.value;const error=this.element('identity-error');error.textContent='';
   if(!value||Array.from(value).length>12||/[\u0000-\u001f\u007f]/.test(value)){error.textContent='昵称请输入 1–12 个字符。';nickname.focus();return;}
   if(!isPlayable(type)){error.textContent='请选择已开放的人格。';return;}
   const roomId=editing?undefined:(this.requestedRoom!==undefined?this.requestedRoom:room.value.trim().toUpperCase());
   if(!editing&&(this.requestedRoom!==undefined||roomId)&&!(/^[A-HJ-NP-Z2-9]{4}$/).test(roomId||'')){error.textContent='房间号应为 4 位字母或数字，请检查邀请链接。';return;}
   const attempt=++this.attempt;const button=this.element<HTMLButtonElement>('identity-submit');button.disabled=true;button.textContent=editing?'正在保存…':'正在进入…';this.identity={mbti:type,nickname:value};this.remember();
   try{if(editing)await this.client.update(this.identity);else await this.client.enter(this.identity,roomId||undefined);if(attempt!==this.attempt)return;this.requestedRoom=this.client.room!.id;this.setUrl(this.requestedRoom);this.editing=false;this.showLobby(this.client.room!,true);}catch(reason){if(attempt!==this.attempt)return;if(this.view!=='identity')this.showIdentity(editing);this.element('identity-error').textContent=(reason as Error).message;}finally{if(attempt===this.attempt&&this.view==='identity'){const submit=this.element<HTMLButtonElement>('identity-submit');submit.disabled=false;submit.textContent=editing?'保存角色':'进入房间 ↗';}}
  };
 }
 private returnToLobby(room:LobbyRoomState){
  this.conclusion?.destroy();this.conclusion=undefined;this.spectator.reset();document.body.classList.remove('spectator-mode');this.stopMatch();document.querySelector('#match-ui')?.remove();this.view='lobby';this.botMessage='新一局准备中：点击自己的角色卡可以更换人格。';this.showLobby(room,true);
 }
 private showLobby(room:LobbyRoomState,force=false){
  if(this.view==='match'){this.updateMatch();return;}
  if(this.editing&&!force){this.updateStatus();return;}
  const key=JSON.stringify([room.id,room.maxPlayers,room.phase,room.players]);if(this.view==='lobby'&&key===this.renderKey&&!force)return;
  const scrollTop=this.view==='lobby'?this.root.scrollTop:0;
  this.displayedRoom=room;this.renderKey=key;this.view='lobby';this.editing=false;this.setUrl(room.id);
  this.shell(`<section class="lobby-panel"><div class="lobby-heading"><div><div class="flow-kicker">LET THE PERSONALITIES COLLIDE</div><h1>多人乱斗 <span id="lobby-room-code"></span></h1></div><div class="lobby-clock" id="lobby-clock">--:--</div></div><div id="lobby-slots" class="lobby-slots"></div><div class="lobby-footer"><b id="lobby-count"></b><p id="lobby-status" aria-live="polite"></p><div class="lobby-actions"><button id="lobby-invite" class="flow-primary">🔗 邀请朋友</button><button id="lobby-add-bot" class="flow-secondary">🤖 添加机器人 · N</button><button id="lobby-exit" class="flow-secondary">退出房间</button></div><small class="lobby-test-hint">测试：N 添加机器人 · 2 人及以上按 Enter 跳过大厅倒计时。</small><p id="lobby-message" role="status"></p><div id="invite-fallback" hidden><label for="invite-url">复制这个链接发给朋友</label><input id="invite-url" readonly><small>同一局域网打开链接即可加入，无需输入房间号。</small></div><div id="lobby-disconnected" hidden><p id="lobby-disconnect-message" role="alert"></p><button id="lobby-reconnect" class="flow-secondary">重新连接</button><button id="lobby-home" class="flow-text">返回主页</button></div></div></section>`);
  this.element('lobby-room-code').textContent=`# ${room.id}`;this.element('lobby-count').textContent=`${room.players.length} / ${room.maxPlayers} 位人格已入场`;
  const slots=this.element('lobby-slots');for(let slot=0;slot<room.maxPlayers;slot++){
   const player=room.players.find(p=>p.slot===slot);if(!player){const empty=document.createElement('div');empty.className='lobby-slot empty';empty.innerHTML='<span>?</span><b>等待中</b><small>下一个会是谁？</small>';slots.append(empty);continue;}
   const c=getCharacter(player.mbti),own=player.id===this.client.playerId;const card=document.createElement(own?'button':'div');card.className=`lobby-slot occupied ${own?'own':''}`;card.style.setProperty('--persona',c.colorCss);card.innerHTML='<span class="slot-avatar"></span><b></b><span class="slot-nickname"></span><small></small>';card.querySelector('.slot-avatar')!.textContent=c.presentation.symbol;card.querySelector('b')!.textContent=player.mbti;card.querySelector('.slot-nickname')!.textContent=player.nickname;card.querySelector('small')!.textContent=player.bot?'🤖 自动对战机器人':own?'你 · 点击修改角色':c.presentation.skillText;
   if(own){(card as HTMLButtonElement).disabled=room.phase!=='LOBBY';card.setAttribute('aria-label',`修改我的角色 ${player.mbti} ${player.nickname}`);card.onclick=()=>{this.identity={mbti:player.mbti,nickname:player.nickname};this.showIdentity(true);};}slots.append(card);
  }
  this.element('lobby-add-bot').onclick=()=>void this.addBot();if(this.botMessage)this.element('lobby-message').textContent=this.botMessage;
  this.element('lobby-exit').onclick=()=>this.home();this.element('lobby-home').onclick=()=>this.home();
  this.element('lobby-reconnect').onclick=async()=>{const button=this.element<HTMLButtonElement>('lobby-reconnect');button.disabled=true;try{await this.client.enter(this.identity,room.id);this.disconnectMessage='';this.showLobby(this.client.room!,true);}catch(reason){this.disconnectMessage=`重新连接失败：${(reason as Error).message}`;this.updateStatus();}finally{if(this.view==='lobby')this.element<HTMLButtonElement>('lobby-reconnect').disabled=false;}};
  this.element('lobby-invite').onclick=async()=>{
   const url=this.client.inviteUrl||`${location.origin}/?room=${room.id}`;
   const fallback=this.element('invite-fallback'),message=this.element('lobby-message');
   const input=this.element<HTMLInputElement>('invite-url'),button=this.element('lobby-invite');
   fallback.hidden=false;input.value=url;
   // Confirm immediately: clipboard permission may remain pending in a browser.
   message.textContent='邀请链接已生成！复制下方链接，发给朋友即可加入。';
   button.textContent='✓ 邀请链接已生成';
   fallback.scrollIntoView({block:'nearest'});
   try{
    if(!navigator.clipboard)throw new Error('Clipboard unavailable');
    await navigator.clipboard.writeText(url);
    message.textContent='✓ 邀请链接已生成并复制，发给朋友吧！';
    button.textContent='✓ 链接已复制';
   }catch{
    message.textContent='邀请链接已生成，请长按或选中下方链接复制。';
   }
  };
  this.updateStatus();this.root.scrollTop=scrollTop;
 }
 private async debugStart(){
  const roomId=this.client.room?.id;if(!roomId||this.startingDebug||this.view!=='lobby')return;this.startingDebug=true;
  try{await this.client.debugStart();}
  catch(error){if(this.view==='lobby'&&this.client.room?.id===roomId){this.botMessage=(error as Error).message;this.element('lobby-message').textContent=this.botMessage;}}
  finally{this.startingDebug=false;}
 }
 private async addBot(){
  const roomId=this.client.room?.id;if(this.addingBot||!roomId||this.view!=='lobby')return;
  this.addingBot=true;this.botMessage='正在添加机器人……';this.element('lobby-message').textContent=this.botMessage;this.updateStatus();
  try{await this.client.addBot();this.botMessage='🤖 机器人已加入，开局后会自动移动和对战。';}
  catch(error){this.botMessage=(error as Error).message;}
  finally{this.addingBot=false;if(this.view==='lobby'&&this.client.room?.id===roomId){this.element('lobby-message').textContent=this.botMessage;this.updateStatus();}}
 }
 private showMatch(welcome:Welcome){
  this.editing=false;this.attempt++;this.view='match';this.root.hidden=true;
  document.body.classList.remove('flow-active');document.querySelector<HTMLElement>('main')!.inert=false;
  this.startMatch(welcome,this.client);
  document.querySelector('#match-ui')?.remove();const hud=document.createElement('section');hud.id='match-ui';
  hud.innerHTML='<div class="match-roster" id="match-roster"></div><div id="match-notice" role="status"></div><div id="match-outcome" role="status" hidden></div><div id="death-actions" hidden><button id="spectate-now" type="button">继续观战</button><small id="spectate-auto" role="status"></small></div><section id="spectator-controls" aria-label="观战控制" hidden><button id="spectator-prev" type="button" aria-label="上一位存活玩家">◀</button><div><small>正在观战</small><b id="spectator-target" aria-live="polite"></b><span id="spectator-count"></span></div><button id="spectator-next" type="button" aria-label="下一位存活玩家">▶</button></section><p id="match-test-message" role="status"></p><button id="match-exit" type="button">退出本局</button>';
  document.querySelector('#game-wrap')!.append(hud);this.conclusion?.destroy();this.conclusion=new MatchConclusion(hud,()=>this.home(),()=>this.client.rematch());hud.querySelector<HTMLButtonElement>('#match-exit')!.onclick=()=>this.home();hud.querySelector<HTMLButtonElement>('#spectate-now')!.onclick=()=>{this.spectator.enter();this.updateMatch();};
  for(const [id,direction] of [['spectator-prev',-1],['spectator-next',1]] as const)hud.querySelector<HTMLButtonElement>(`#${id}`)!.onclick=()=>{this.spectator.switch(direction);this.updateMatch();};
  this.updateMatch();
 }
 private updateMatch(){
  const room=this.client.room,match=room?.match,hud=document.querySelector('#match-ui');if(!room||!match||!hud)return;
  const own=match.players.find(p=>p.id===this.client.playerId),now=this.client.now();
  this.spectator.update(room,this.client.playerId,now);
  document.body.classList.toggle('spectator-mode',this.spectator.active);
  const dead=room.phase==='PLAYING'&&!!own&&!own.alive;
  hud.querySelector<HTMLElement>('#death-actions')!.hidden=!dead||this.spectator.active;
  hud.querySelector<HTMLElement>('#spectator-controls')!.hidden=!this.spectator.active;
  hud.querySelector<HTMLElement>('#spectate-auto')!.textContent=dead&&!this.spectator.active?`${Math.ceil(this.spectator.autoRemainingMs(now)/1000)} 秒后自动观战`:'';
  const target=room.players.find(p=>p.id===this.spectator.targetId),targetState=match.players.find(p=>p.id===target?.id);
  const targetText=target?`${target.mbti} / ${target.nickname}${targetState?.connected?'':' · 离线'}`:'等待存活玩家状态……';
  const label=hud.querySelector('#spectator-target')!;if(label.textContent!==targetText)label.textContent=targetText;
  hud.querySelector('#spectator-count')!.textContent=`剩余 ${match.players.filter(p=>p.alive).length} 人 · A / D 或 ← / → 切换`;
  for(const id of ['spectator-prev','spectator-next'])hud.querySelector<HTMLButtonElement>(`#${id}`)!.disabled=!this.spectator.canSwitch||!!this.disconnectMessage;
  hud.setAttribute('data-phase',room.phase);
  const notice=hud.querySelector('#match-notice')!;
  notice.textContent=this.disconnectMessage|| (room.phase==='COUNTDOWN'?String(Math.max(1,Math.ceil((match.startAt-now)/1000))):room.phase==='PLAYING'&&now<match.protectionEnd?'MBTI 大乱斗！ · 出生保护，暂不可攻击':room.phase==='PLAYING'?'':'');
  const roster=hud.querySelector('#match-roster')!;const rosterKey=JSON.stringify(match.players.map(p=>[p.id,p.alive,p.connected]));
  if(roster.getAttribute('data-state')!==rosterKey){roster.setAttribute('data-state',rosterKey);roster.replaceChildren();for(const player of room.players){const state=match.players.find(p=>p.id===player.id)!;const badge=document.createElement('span');badge.className=`match-badge ${player.id===this.client.playerId?'self':''} ${state.alive?'':'dead'}`;badge.textContent=state.alive?getCharacter(player.mbti).presentation.symbol:'💀';badge.title=`${player.bot?'🤖 ':''}${player.mbti} · ${player.nickname}${state.connected?'':' · 离线'}`;badge.setAttribute('aria-label',`${badge.title} · ${state.alive?'存活':'淘汰'}`);roster.append(badge);}}
  const outcome=hud.querySelector<HTMLElement>('#match-outcome')!;let title='';
  if(room.phase==='CANCELLED')title='本局已取消 · 无有效结果';
  else if(room.phase==='WINNER'){const winner=room.players.find(p=>p.id===match.winnerId);title=match.draw?'同归于尽！ · 本局平局':`最后存活：${winner?.mbti} · ${winner?.nickname}`;}
  else if(own&&!own.alive&&!this.spectator.active){const killer=room.players.find(p=>p.id===own.killerId);title=`💀 你被淘汰了 · 第 ${own.placement} 名${killer?` · 击杀者 ${killer.mbti} · ${killer.nickname}`:''}`;}
  outcome.hidden=!title;outcome.textContent=title;this.conclusion?.update(room,this.client.playerId,now);
 }
 private updateStatus(){
  if(this.view==='match'){this.updateMatch();return;}

  const room=this.client.room||this.displayedRoom;if(this.view!=='lobby'||!room)return;const left=room.lobbyCountdownEnd===undefined?undefined:Math.max(0,Math.ceil((room.lobbyCountdownEnd-this.client.now())/1000));
  const clock=left===undefined?'--:--':`00:${String(left).padStart(2,'0')}`;if(this.element('lobby-clock').textContent!==clock)this.element('lobby-clock').textContent=clock;
  const status=this.disconnectMessage?'连接已断开':room.phase==='COUNTDOWN'?'人格到齐，即将开战！':left===undefined?'等待其他玩家加入……':left===0?'正在确认开局……':`${left} 秒后自动准备开战${room.players.length===room.maxPlayers?' · 房间已满！':''}`;
  if(this.element('lobby-status').textContent!==status)this.element('lobby-status').textContent=status;
  this.element('lobby-disconnected').hidden=!this.disconnectMessage;this.element('lobby-disconnect-message').textContent=this.disconnectMessage;
  const own=this.root.querySelector<HTMLButtonElement>('.lobby-slot.own');if(own)own.disabled=!!this.disconnectMessage||room.phase!=='LOBBY';
  this.element<HTMLButtonElement>('lobby-add-bot').disabled=this.addingBot||!!this.disconnectMessage||room.phase!=='LOBBY'||room.players.length>=room.maxPlayers;
  this.element<HTMLButtonElement>('lobby-invite').disabled=!!this.disconnectMessage||room.phase!=='LOBBY';
 }
}
