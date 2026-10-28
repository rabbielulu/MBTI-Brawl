import type {LobbyRoomState,MatchResult} from '../../shared/LobbyProtocol';
import {VICTORY_LINES} from '../../shared/MatchPresentation';
import {getCharacter} from '../presentation/CharacterPresentation';
export function formatSurvival(ms:number){const seconds=Math.max(0,Math.floor(ms/1000));return `${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;}
/** Renders only the server's frozen result; client time never changes the phase. */
export class MatchConclusion {
 readonly root=document.createElement('section');private key='';
 constructor(parent:Element,private exit:()=>void,private rematch:()=>Promise<void>){this.root.id='match-conclusion';this.root.hidden=true;this.root.setAttribute('aria-label','比赛结算');parent.append(this.root);}
 destroy(){this.root.remove();document.body.classList.remove('conclusion-mode');}
 update(room:LobbyRoomState,ownId:string,now:number){
  const match=room.match,result=match?.result,visible=!!result&&(room.phase==='WINNER'||room.phase==='RESULT');
  this.root.hidden=!visible;document.body.classList.toggle('conclusion-mode',visible);if(!result||!visible){this.key='';return;}
  const key=`${room.id}:${result.endedAt}:${room.phase}`;
  if(key!==this.key){this.key=key;if(room.phase==='WINNER')this.celebrate(result);else this.results(result,ownId);}
  const countdown=this.root.querySelector('#celebration-time');if(countdown)countdown.textContent=`${Math.max(0,Math.ceil(((match?.resultAt??now)-now)/1000))} 秒后查看本局战绩`;
 }
 private shell(content:string){this.root.innerHTML=`<div class="conclusion-inner">${content}<button type="button" id="conclusion-exit">返回主页</button></div>`;this.root.querySelector<HTMLButtonElement>('#conclusion-exit')!.onclick=this.exit;this.root.querySelector<HTMLElement>('h1')?.focus({preventScroll:true});}
 private celebrate(result:MatchResult){
  const winner=result.players.find(p=>p.id===result.winnerId);
  if(result.draw||!winner){this.shell('<div class="celebration"><div class="draw-symbol" aria-hidden="true">🤝</div><p class="conclusion-eyebrow">EVERYONE WENT ALL IN</p><h1 tabindex="-1">同归于尽！</h1><p>本局平局，没有最后存活者。</p><small id="celebration-time" role="status"></small></div>');return;}
  this.shell(`<div class="confetti" aria-hidden="true"></div><div class="celebration"><p class="conclusion-eyebrow">LAST PERSONALITY STANDING</p><div class="victory-avatar" aria-hidden="true"><span class="victory-crown">👑</span><svg viewBox="0 0 180 200"><path d="M90 86 L90 136 M90 99 L42 64 M90 99 L138 64 M90 136 L59 183 M90 136 L121 183" fill="none" stroke="currentColor" stroke-width="9" stroke-linecap="round"/><rect x="65" y="26" width="50" height="53" rx="16" fill="currentColor"/><circle cx="79" cy="48" r="3" fill="#40354d"/><circle cx="101" cy="48" r="3" fill="#40354d"/><path d="M79 60 Q90 72 101 60" fill="none" stroke="#40354d" stroke-width="3"/></svg></div><h1 tabindex="-1">本局 MBTI 之王</h1><p id="victory-identity" class="victory-identity"></p><p id="victory-line" class="victory-line"></p><small id="celebration-time" role="status"></small></div>`);
  const character=getCharacter(winner.mbti);this.root.querySelector<HTMLElement>('.victory-avatar')!.style.color=character.colorCss;
  this.root.querySelector('#victory-identity')!.textContent=`${winner.mbti} / ${winner.nickname}${winner.bot?' · 🤖':''}`;
  this.root.querySelector('#victory-line')!.textContent=VICTORY_LINES[winner.mbti];
  const colors=['#b99aeb','#ffe58b','#a8d9bc','#f7b8c4','#9fc9ed'];
  for(let i=0;i<32;i++){const piece=document.createElement('i');piece.style.setProperty('--left',`${(i*37)%100}%`);piece.style.setProperty('--delay',`${-(i%8)*.45}s`);piece.style.setProperty('--turn',`${i*31}deg`);piece.style.background=colors[i%colors.length];this.root.querySelector('.confetti')!.append(piece);}
 }
 private results(result:MatchResult,ownId:string){
  this.shell('<div class="result-heading"><p class="conclusion-eyebrow">THE PERSONALITY REPORT</p><h1 tabindex="-1">本局战绩</h1><p id="result-summary"></p></div><div class="result-table-wrap" tabindex="0" aria-label="本局排名，可横向滚动"><table class="result-table"><thead><tr><th scope="col">名次</th><th scope="col">人格 / 昵称</th><th scope="col">击杀</th><th scope="col">伤害</th><th scope="col">存活时间</th></tr></thead><tbody id="result-rows"></tbody></table></div><section class="fun-awards" aria-label="趣味称号"><h2>本局名场面</h2><ul id="award-list"></ul></section>');
  const button=document.createElement('button');button.id='conclusion-rematch';button.type='button';button.textContent='再来一局 ↗';
  const message=document.createElement('p');message.id='rematch-message';message.setAttribute('role','status');message.textContent='在线玩家一起返回原房间，30 秒准备，可更换人格。';
  const exit=this.root.querySelector('#conclusion-exit')!;const actions=document.createElement('div');actions.className='conclusion-actions';exit.before(message,actions);actions.append(button,exit);
  button.onclick=async()=>{button.disabled=true;button.textContent='正在返回大厅…';try{await this.rematch();}catch(error){if(button.isConnected){message.textContent=(error as Error).message;button.disabled=false;button.textContent='重试再来一局 ↗';}}};
  const winner=result.players.find(p=>p.id===result.winnerId);this.root.querySelector('#result-summary')!.textContent=result.draw?'本局平局 · 每个人都拼到了最后':`最后存活：${winner?.mbti} / ${winner?.nickname} · 共 ${result.players.length} 人`;
  const rows=this.root.querySelector('#result-rows')!;
  for(const p of result.players){const row=document.createElement('tr');row.classList.toggle('result-self',p.id===ownId);row.setAttribute('data-player-id',p.id);
   const rank=!result.draw&&p.placement<=3?['🥇','🥈','🥉'][p.placement-1]:`#${p.placement}`;
   for(const value of [rank,`${p.mbti} / ${p.nickname}${p.bot?' · 🤖':''}${p.id===ownId?' · 你':''}`,String(p.kills),String(Math.round(p.damageDealt)),formatSurvival(p.survivalMs)]){const cell=document.createElement('td');cell.textContent=value;row.append(cell);}rows.append(row);
  }
  const list=this.root.querySelector('#award-list')!;
  for(const award of result.awards){
   const line=document.createElement('li');
   const names=award.playerIds.map(id=>{const p=result.players.find(p=>p.id===id)!;return `${p.mbti} / ${p.nickname}`;}).join('、');
   const descriptions={kills:'拿下',damage:'打出',distance:'移动了',focus:'累计',taken:'承受了'};
   line.textContent=`${award.icon} ${award.title}：${names}${award.playerIds.length>1?'（并列）':''}，${descriptions[award.id]} ${Math.round(award.value)} ${award.id==='taken'?'点伤害':award.id==='distance'?'距离单位':award.unit}。`;
   list.append(line);
  }
  if(!result.awards.length){const empty=document.createElement('li');empty.textContent='这一局，大家都很克制。';list.append(empty);}
 }
}
