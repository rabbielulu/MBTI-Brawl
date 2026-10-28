import {characterCard,characterAbilities,escapeHtml} from '../presentation/CharacterCard';
import './flow-structure.css';
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
type FlowView='home'|'identity'|'modes'|'characters'|'room-entry'|'practice-confirm'|'lobby'|'match';
/** Lobby UI presents authoritative match state; gameplay stays in the Phaser adapter. */
export class LobbyFlow {
 private characterReturn:'modes'|'lobby'|'match'='modes';private identityReturn:'home'|'modes'|'lobby'='home';private returningToModes=false;
 private conclusion?:MatchConclusion;
 readonly spectator=new SpectatorController();
 root:HTMLDivElement;client:LobbyClient;view:FlowView='home';private editing=false;private identity:PlayerIdentity={mbti:'ENTP',nickname:''};private requestedRoom?:string;private renderKey='';private timer:ReturnType<typeof setInterval>;private disconnectMessage='';private attempt=0;private displayedRoom?:LobbyRoomState;private addingBot=false;private startingDebug=false;private botMessage='';
 constructor(private settings:()=>void,private startMatch:(welcome:Welcome,client:LobbyClient)=>void,private stopMatch:()=>void){
  this.root=document.createElement('div');this.root.id='flow-root';document.querySelector('#app')!.append(this.root);
  this.client=new LobbyClient(room=>{if(this.client.playerId){this.disconnectMessage='';if(this.returningToModes)return;if(this.view==='characters'&&this.characterReturn==='match')return;if(this.view==='match'){if(room.phase==='LOBBY')this.returnToLobby(room);else this.updateMatch();return;}if(this.editing&&room.phase!=='LOBBY'){this.editing=false;this.attempt++;this.showLobby(room,true);this.element('lobby-message').textContent='已进入开局准备，角色已锁定。';}else if(room.mode!=='practice')this.showLobby(room);}},reason=>{this.disconnectMessage=reason||(this.view==='match'?'连接中断，正在尝试恢复席位（最多 10 秒）……':'与服务器断开了，当前席位已释放。请重新连接房间。');if(this.view==='identity')this.element('identity-error').textContent=this.disconnectMessage;else this.updateStatus();});
  this.client.onMatch=welcome=>this.showMatch(welcome);
  try{const saved=JSON.parse(localStorage.getItem('mbti-lobby-identity')||'null');if(saved&&isPlayable(saved.mbti)&&typeof saved.nickname==='string')this.identity={mbti:saved.mbti,nickname:saved.nickname};}catch{}
  const params=new URLSearchParams(location.search);if(params.has('room')){this.requestedRoom=params.get('room')||'';this.showIdentity();}else this.home();
  window.addEventListener('keydown',event=>{
   if(document.hidden||document.querySelector<HTMLDialogElement>('#dialog')?.open)return;
   const target=event.target instanceof Element?event.target:undefined;
   const editing=!!target?.closest('input,textarea,select,[contenteditable]:not([contenteditable="false"])');
   if(this.view==='home'&&event.key==='Enter'&&!editing&&!target?.closest('button,a')){event.preventDefault();this.showIdentity();return;}
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
 private shell(content:string){document.querySelector<HTMLElement>('main')!.inert=true;this.root.hidden=false;document.body.classList.add('flow-active');this.root.innerHTML=`<div class="flow-bar"><button id="flow-brand" class="flow-brand">✳ MBTI BRAWL</button><div><button id="flow-fullscreen" aria-label="全屏">⛶ 全屏</button><button id="flow-settings" aria-label="设置">⚙</button></div></div>${content}`;this.root.scrollTop=0;this.element('flow-brand').onclick=()=>this.home();this.element('flow-settings').innerHTML='<img src="/figma-flow/settings.svg" alt="">';this.element('flow-settings').onclick=this.settings;this.element('flow-fullscreen').onclick=()=>document.querySelector<HTMLButtonElement>('#fullscreen')!.click();}
 private setUrl(roomId?:string){const url=new URL(location.href);if(roomId!==undefined)url.searchParams.set('room',roomId);else url.searchParams.delete('room');history.replaceState(null,'',url);}
 private remember(){try{localStorage.setItem('mbti-lobby-identity',JSON.stringify(this.identity));}catch{}}
 private leaveGame(){const wasPlaying=!!this.client.room?.match||this.view==='match';this.attempt++;this.conclusion?.destroy();this.conclusion=undefined;this.spectator.reset();document.body.classList.remove('spectator-mode','practice-mode');this.returningToModes=true;this.client.close();if(wasPlaying)this.stopMatch();this.returningToModes=false;document.querySelector('#match-ui')?.remove();this.displayedRoom=undefined;this.disconnectMessage='';this.editing=false;this.botMessage='';this.requestedRoom=undefined;this.setUrl();}
 home(){this.leaveGame();this.view='home';this.shell(`<section class="welcome-stage" data-design-node="32:69"><img class="welcome-person" src="/figma-flow/welcome.png" alt="欢迎来到 MBTI 大乱斗"><h1 class="welcome-title" aria-label="MBTI大乱斗"><span>MBTI</span><span>Brawl</span></h1><button id="flow-enter" class="welcome-enter">Enter <span aria-hidden="true">↗</span></button><p class="welcome-note">16 PERSONALITIES. ONE BIG MESS.</p></section>`);this.element('flow-enter').onclick=()=>{this.identityReturn='home';this.showIdentity();};}
 private showIdentity(editing=false){
  this.attempt++;this.editing=editing;this.view='identity';this.shell(`<section class="identity-stage" data-design-node="11:274"><div class="identity-paper"><img class="identity-person" src="/figma-flow/identity.png" alt="准备创建你的角色"><button id="identity-back" class="identity-close" aria-label="关闭角色创建"><img src="/figma-flow/close.svg" alt=""></button><form id="identity-form" novalidate><div class="flow-kicker">MAKE IT YOURS</div><h1>创建你的角色</h1><label for="identity-mbti">输入你的 MBTI</label><select id="identity-mbti">${PLAYABLE_TYPES.map(type=>`<option value="${type}">${type} · ${CHARACTERS[type].nickname}</option>`).join('')}</select><label for="identity-nickname">输入你的昵称 <small>1–12 个字符</small></label><input id="identity-nickname" maxlength="24" autocomplete="nickname" placeholder="朋友们怎么叫你？" aria-describedby="identity-error"><p id="identity-room-note"></p><p id="identity-error" role="alert"></p><button id="identity-submit" type="submit" class="flow-primary">确认 ↗</button></form></div></section>`);
  const mbti=this.element<HTMLSelectElement>('identity-mbti'),nickname=this.element<HTMLInputElement>('identity-nickname');mbti.value=this.identity.mbti;nickname.value=this.identity.nickname;
  this.element('identity-room-note').textContent=this.requestedRoom!==undefined?`确认后加入朋友的房间 ${this.requestedRoom||'（链接不完整）'}`:'';
  this.element('identity-back').onclick=()=>editing&&this.client.room?this.showLobby(this.client.room,true):this.identityReturn==='modes'?this.showModes():this.home();
  this.element<HTMLFormElement>('identity-form').onsubmit=async event=>{
   event.preventDefault();const value=nickname.value.trim(),type=mbti.value,error=this.element('identity-error');error.textContent='';
   if(!value||Array.from(value).length>12||/[\u0000-\u001f\u007f]/.test(value)){error.textContent='昵称请输入 1–12 个字符。';nickname.focus();return;}if(!isPlayable(type)){error.textContent='请选择有效的人格。';return;}
   this.identity={mbti:type,nickname:value};this.remember();
   if(!editing&&this.requestedRoom===undefined){this.editing=false;this.showModes();return;}
   const attempt=++this.attempt;this.element<HTMLButtonElement>('identity-submit').disabled=true;
   try{if(editing)await this.client.update(this.identity);else await this.client.enter(this.identity,this.requestedRoom);if(attempt!==this.attempt)return;this.editing=false;this.showLobby(this.client.room!,true);}catch(error){if(attempt===this.attempt&&this.view==='identity'){this.element('identity-error').textContent=(error as Error).message;this.element<HTMLButtonElement>('identity-submit').disabled=false;}}
  };
 }
 private showModes(){
  this.view='modes';this.editing=false;this.setUrl();this.shell(`<section class="mode-stage" data-design-node="11:254"><div class="mode-persona"><div id="mode-character"></div><button id="flow-change-character" class="change-character" aria-label="更换人格"><img src="/figma-flow/change.svg" alt=""></button><button id="flow-edit-identity" class="flow-text">修改昵称 / 角色资料</button></div><div class="mode-choices"><button id="flow-practice" class="mode-choice"><small>MODE 01</small><b>试炼场</b><span>自由练习 · 随时换人格 ↗</span></button><button id="flow-multiplayer" class="mode-choice"><small>MODE 02</small><b>多人乱斗</b><span>邀请朋友 · 最后存活者获胜 ↗</span></button><button id="flow-garden" class="mode-choice" disabled><small>MODE 03 · COMING SOON</small><b>小小花园</b><span>放松一下，未来在这里相遇 · 暂未开放</span></button><button id="flow-ranking" class="flow-text" disabled>排行榜 · 敬请期待</button></div></section>`);
  this.element('mode-character').innerHTML=characterCard(this.identity.mbti,this.identity.nickname);this.element('flow-change-character').onclick=()=>this.openCharacterBrowser('modes');this.element('flow-edit-identity').onclick=()=>{this.identityReturn='modes';this.showIdentity();};this.element('flow-practice').onclick=()=>this.showPracticeConfirm();this.element('flow-multiplayer').onclick=()=>this.showRoomEntry();
 }
 private showRoomEntry(){
  this.view='room-entry';this.shell(`<section class="room-entry-panel"><button id="room-entry-back" class="flow-text">← 返回玩法菜单</button><div class="room-current-persona"></div><button id="room-create" class="flow-primary">创建房间 ↗</button><form id="room-join-form"><label for="identity-room">加入朋友的房间</label><div><input id="identity-room" maxlength="4" autocomplete="off" spellcheck="false" placeholder="输入 4 位房间号"><button type="submit" id="room-join" class="flow-secondary">加入</button></div></form><p id="room-entry-error" role="alert"></p></section>`);
  const c=getCharacter(this.identity.mbti);this.root.querySelector('.room-current-persona')!.textContent=`${c.presentation.symbol} ${c.mbti} / ${this.identity.nickname}`;this.element('room-entry-back').onclick=()=>{this.attempt++;this.client.close();this.showModes();};this.element('room-create').onclick=()=>void this.enterRoom();this.element<HTMLFormElement>('room-join-form').onsubmit=event=>{event.preventDefault();const id=this.element<HTMLInputElement>('identity-room').value.trim().toUpperCase();if(!/^[A-HJ-NP-Z2-9]{4}$/.test(id)){this.element('room-entry-error').textContent='请输入 4 位有效房间号。';return;}void this.enterRoom(id);};
 }
 private async enterRoom(roomId?:string){const attempt=++this.attempt;for(const id of ['room-create','room-join'])this.element<HTMLButtonElement>(id).disabled=true;try{await this.client.enter(this.identity,roomId);if(attempt!==this.attempt)return;this.showLobby(this.client.room!,true);}catch(error){if(attempt===this.attempt&&this.view==='room-entry'){this.element('room-entry-error').textContent=(error as Error).message;for(const id of ['room-create','room-join'])this.element<HTMLButtonElement>(id).disabled=false;}}}
 private showPracticeConfirm(){
  this.view='practice-confirm';this.shell(`<section class="practice-confirm-stage" data-design-node="13:326"><div class="practice-confirm-content"><img src="/figma-flow/practice.png" class="practice-person" alt="试炼场等你来挑战"><h1>这TM有什么好练的？！</h1><div class="practice-confirm-paper"><label for="practice-bots">机器人对手</label><select id="practice-bots"><option value="2">2 位 · 轻松热身</option><option value="3" selected>3 位 · 人格碰撞</option><option value="5">5 位 · 热闹一点</option><option value="7">7 位 · 全员开练</option></select><p>独立试炼场，随时换人格、重置练习。</p><div class="practice-confirm-actions"><button id="practice-cancel" class="flow-secondary">不练了</button><button id="practice-start" class="flow-primary">我就要练 ↗</button></div><p id="practice-error" role="alert"></p></div></div></section>`);
  this.element('practice-cancel').onclick=()=>{this.attempt++;this.client.close();this.showModes();};this.element('practice-start').onclick=async()=>{const attempt=++this.attempt;this.element<HTMLButtonElement>('practice-start').disabled=true;try{await this.client.enter(this.identity,undefined,Number(this.element<HTMLSelectElement>('practice-bots').value));}catch(error){if(attempt===this.attempt&&this.view==='practice-confirm'){this.element('practice-error').textContent=(error as Error).message;this.element<HTMLButtonElement>('practice-start').disabled=false;}}};
 }
 openCharacterBrowser(origin:'modes'|'lobby'|'match'='modes'){
  if(origin==='match'&&this.client.room?.mode!=='practice')return;
  this.characterReturn=origin;this.editing=origin==='lobby';this.view='characters';this.shell(`<section class="character-browser" data-design-node="33:91"><div class="character-browser-heading"><button id="characters-back" class="character-back" aria-label="返回"><img src="/figma-flow/back.svg" alt=""></button><div><p class="flow-kicker">PICK ANOTHER SIDE OF YOU</p><h1>换个人格，换种玩法。</h1></div><span>16 PERSONALITIES</span></div><div id="character-grid" class="character-grid"></div><p id="character-message" role="alert"></p></section>`);
  const back=()=>{if(origin==='modes')this.showModes();else if(origin==='lobby')this.showLobby(this.client.room!,true);else{this.view='match';this.root.hidden=true;document.body.classList.remove('flow-active');document.querySelector<HTMLElement>('main')!.inert=false;this.updateMatch();}};this.element('characters-back').onclick=back;
  const grid=this.element('character-grid');for(const type of PLAYABLE_TYPES){const tile=document.createElement('button');tile.className='character-tile';tile.setAttribute('aria-label',`查看 ${type} ${getCharacter(type).nickname}`);tile.innerHTML=characterCard(type);if(type===this.identity.mbti)tile.classList.add('selected');tile.onclick=()=>{
   const dialog=document.createElement('dialog');dialog.className='character-choice-dialog';dialog.setAttribute('aria-label',`${type} 人格档案`);dialog.innerHTML=`<button class="character-detail-close" aria-label="关闭人格档案"><img src="/figma-flow/close.svg" alt=""></button><div class="character-detail-layout">${characterCard(type)}${characterAbilities(type)}</div><div class="character-detail-actions"><p role="alert"></p><button id="character-confirm" class="flow-primary">确认使用 ${type} ↗</button></div>`;this.root.append(dialog);dialog.showModal();dialog.querySelector<HTMLButtonElement>('.character-detail-close')!.onclick=()=>dialog.close();dialog.onclose=()=>{dialog.remove();tile.focus();};dialog.querySelector<HTMLButtonElement>('#character-confirm')!.onclick=async()=>{
    const button=dialog.querySelector<HTMLButtonElement>('#character-confirm')!;button.disabled=true;const previous=this.identity.mbti;this.identity={...this.identity,mbti:type};
    try{if(origin!=='modes')await this.client.update(this.identity);this.remember();dialog.close();if(origin==='modes')this.showModes();else if(origin==='lobby')this.showLobby(this.client.room!,true);else if(this.view==='characters'){this.view='match';this.root.hidden=true;document.body.classList.remove('flow-active');document.querySelector<HTMLElement>('main')!.inert=false;}}
    catch(error){this.identity={...this.identity,mbti:previous};if(dialog.isConnected){dialog.querySelector('p[role="alert"]')!.textContent=(error as Error).message;button.disabled=false;}}
   };
  };grid.append(tile);}
 }
 returnToModes(){this.leaveGame();this.showModes();}
 async resetPractice(){try{await this.client.resetPractice();}catch(error){const message=document.querySelector('#match-test-message');if(message)message.textContent=(error as Error).message;}}
 private returnToLobby(room:LobbyRoomState){
  this.conclusion?.destroy();this.conclusion=undefined;this.spectator.reset();document.body.classList.remove('spectator-mode');this.stopMatch();document.querySelector('#match-ui')?.remove();this.view='lobby';this.botMessage='新一局准备中：点击自己的角色卡可以更换人格。';this.showLobby(room,true);
 }
 private showLobby(room:LobbyRoomState,force=false){
  if(this.view==='match'){this.updateMatch();return;}
  if(this.editing&&!force){this.updateStatus();return;}
  const key=JSON.stringify([room.id,room.maxPlayers,room.phase,room.players]);if(this.view==='lobby'&&key===this.renderKey&&!force)return;
  const scrollTop=this.view==='lobby'?this.root.scrollTop:0;
  this.displayedRoom=room;this.renderKey=key;this.view='lobby';this.editing=false;this.setUrl(room.mode==='practice'?undefined:room.id);
  this.shell(`<section class="lobby-panel"><div class="lobby-heading"><div><div class="flow-kicker">LET THE PERSONALITIES COLLIDE</div><h1>多人乱斗 <span id="lobby-room-code"></span></h1></div><div class="lobby-clock" id="lobby-clock">--:--</div></div><div id="lobby-slots" class="lobby-slots"></div><div class="lobby-footer"><b id="lobby-count"></b><p id="lobby-status" aria-live="polite"></p><div class="lobby-actions"><button id="lobby-invite" class="flow-primary">🔗 邀请朋友</button><button id="lobby-add-bot" class="flow-secondary">🤖 添加机器人 · N</button><button id="lobby-exit" class="flow-secondary">退出房间</button></div><small class="lobby-test-hint">测试：N 添加机器人 · 2 人及以上按 Enter 跳过大厅倒计时。</small><p id="lobby-message" role="status"></p><div id="invite-fallback" hidden><label for="invite-url">复制这个链接发给朋友</label><input id="invite-url" readonly><small>同一局域网打开链接即可加入，无需输入房间号。</small></div><div id="lobby-disconnected" hidden><p id="lobby-disconnect-message" role="alert"></p><button id="lobby-reconnect" class="flow-secondary">重新连接</button><button id="lobby-home" class="flow-text">返回主页</button></div></div></section>`);
  this.element('lobby-room-code').textContent=`# ${room.id}`;this.element('lobby-count').textContent=`${room.players.length} / ${room.maxPlayers} 位人格已入场`;
  const slots=this.element('lobby-slots');for(let slot=0;slot<room.maxPlayers;slot++){
   const player=room.players.find(p=>p.slot===slot);if(!player){const empty=document.createElement('div');empty.className='lobby-slot empty';empty.innerHTML='<span>?</span><b>等待中</b><small>下一个会是谁？</small>';slots.append(empty);continue;}
   const c=getCharacter(player.mbti),own=player.id===this.client.playerId;const card=document.createElement(own?'button':'div');card.className=`lobby-slot occupied ${own?'own':''}`;card.style.setProperty('--persona',c.colorCss);card.innerHTML='<span class="slot-avatar"></span><b></b><span class="slot-nickname"></span><small></small>';card.querySelector('.slot-avatar')!.textContent=c.presentation.symbol;card.querySelector('b')!.textContent=player.mbti;card.querySelector('.slot-nickname')!.textContent=player.nickname;card.querySelector('small')!.textContent=player.bot?'🤖 自动对战机器人':own?'你 · 点击修改角色':c.presentation.skillText;
   if(own){(card as HTMLButtonElement).disabled=room.phase!=='LOBBY';card.setAttribute('aria-label',`修改我的角色 ${player.mbti} ${player.nickname}`);card.onclick=()=>{this.identity={mbti:player.mbti,nickname:player.nickname};this.openCharacterBrowser('lobby');};}slots.append(card);
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
  document.querySelector('#match-ui')?.remove();const hud=document.createElement('section');hud.id='match-ui';document.body.classList.toggle('practice-mode',this.client.room?.mode==='practice');
  hud.innerHTML='<div class="match-roster" id="match-roster"></div><div id="match-notice" role="status"></div><div id="match-outcome" role="status" hidden></div><div id="death-actions" hidden><button id="spectate-now" type="button">继续观战</button><small id="spectate-auto" role="status"></small></div><section id="spectator-controls" aria-label="观战控制" hidden><button id="spectator-prev" type="button" aria-label="上一位存活玩家">◀</button><div><small>正在观战</small><b id="spectator-target" aria-live="polite"></b><span id="spectator-count"></span></div><button id="spectator-next" type="button" aria-label="下一位存活玩家">▶</button></section><p id="match-test-message" role="status"></p><button id="match-exit" type="button">退出本局</button>';
  document.querySelector('#game-wrap')!.append(hud);this.conclusion?.destroy();this.conclusion=new MatchConclusion(hud,()=>this.home(),()=>this.client.rematch());hud.querySelector<HTMLButtonElement>('#match-exit')!.onclick=()=>this.returnToModes();if(this.client.room?.mode==='practice'){hud.querySelector('#match-exit')!.textContent='返回玩法菜单';const tools=document.createElement('div');tools.className='practice-tools';tools.innerHTML='<button id="practice-change" type="button">更换人格</button><button id="practice-reset" type="button">重置试炼</button>';hud.append(tools);tools.querySelector<HTMLButtonElement>('#practice-change')!.onclick=()=>this.openCharacterBrowser('match');tools.querySelector<HTMLButtonElement>('#practice-reset')!.onclick=()=>void this.resetPractice();}hud.querySelector<HTMLButtonElement>('#spectate-now')!.onclick=()=>{this.spectator.enter();this.updateMatch();};
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
  else if(room.mode==='practice'&&match.players.filter(p=>p.alive).length<=1)title='本轮练习结束 · 重置试炼，或换个人格再试试';
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
