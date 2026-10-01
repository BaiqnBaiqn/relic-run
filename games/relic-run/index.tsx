import {gameStorage,isBridgedStorage} from './persistence.ts';
import {gemzText,gemzValue} from './gemz.ts';
import {useEffect,useRef,useState,type ReactNode,type PointerEvent,type CSSProperties} from 'react';
import {createFriendReader,type GenerationSprites} from '@rarefriends/friendsdk/sprites';
import {createFriendSoundKit,type FriendSoundKit,type FriendSoundCue} from '@rarefriends/friendsdk/sounds';
import {makeRun,startRoom,enterBoss,step,type Run,type Phase} from './engine.ts';
import {render} from './render.ts';
import {PALETTE} from './palette.ts';
import {LEVELS,levelFor,gemzRangeLabel,type LevelId} from './levels.ts';
import {unproject,screenDirection,VIEW_WIDTH as W,VIEW_HEIGHT as H} from './camera.ts';
import {sampleFriendSprites} from './art/friend-sample.ts';
import {GEAR,STARTERS,SLOTS,gearFor,gearLabel,statsFor,type Slot} from './gear.ts';
import {character,beginEntry,creditKill,finishVictory,finishDeath,equip,draw,drawBossRolls,fmtRF,RF,settleRound,addTestRF,type Economy,type CharacterKind} from './economy.ts';
import {entryQuote,maxEntryMultiple,weaponRewardLabel} from './entry.ts';
import {EntryPicker} from './entry-picker.tsx';
import {JackpotReveal} from './jackpot.tsx';
import type {PlayableFriend} from './identity.ts';
import {GearIcon} from './icons.tsx';
import {RedemptionPanel,PotionPanel,LootGuide,EconomyGuide,ExpeditionGuide} from './economy-ui.tsx';
import {potionName} from './potions.ts';
import {loadSave,save,recoverAbandoned,resetSave} from './storage.ts';
import './style.css';
import './camp.css';
import './chests.css';
import {BASE_CHEST} from './chests.ts';
import {ChestPanel} from './chest-store.tsx';

type Props={friendId:bigint;paused:boolean;guestMode?:boolean;walletUrl?:string;storageScope?:string;friendKind?:CharacterKind;portrait?:string;ownerAddress?:string;friendWalletAddress?:string;onChooseFriend?:()=>void;friends?:PlayableFriend[];onSelectFriend?:(friend:PlayableFriend)=>void;client?:unknown};
type Menu='gear'|'odds'|'help'|'chests'|'pool'|'potions'|'loot'|'leave'|'expeditions'|'entry'|null;
const elapsed=(s:number)=>`${Math.floor(s/60).toString().padStart(2,'0')}:${Math.floor(s%60).toString().padStart(2,'0')}`;
const recovery=(ms:number)=>{const minutes=Math.ceil(ms/60000);return `${Math.floor(minutes/60)}h ${minutes%60}m`;};
function Mark(){return <svg width="24" height="24" viewBox="0 0 16 16" fill="currentColor" shapeRendering="crispEdges" aria-hidden="true"><path d="M2 1h3v3h6V1h3v5h1v6h-3v3h-2v-3H6v3H4v-3H1V6h1z"/><path d="M4 6h2v2H4zm6 0h2v2h-2z" fill="var(--paper)"/></svg>;}
function RosterAvatar({sprites,portrait}:{sprites:GenerationSprites|null;portrait?:string}){
  if(portrait)return <img src={portrait} alt=""/>;
  if(!sprites)return <Mark/>;
  return <svg viewBox="0 0 16 16" shapeRendering="crispEdges" aria-hidden="true">{sprites.clips.idle.down[0].rows.map((row,y)=>[...row].map((pixel,x)=>pixel==='#'&&<rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="currentColor"/>))}</svg>;
}
function Modal({title,onClose,children}:{title:string;onClose:()=>void;children:ReactNode}){
  const ref=useRef<HTMLDivElement>(null);
  useEffect(()=>{const previous=document.activeElement as HTMLElement|null;ref.current?.querySelector<HTMLButtonElement>('button')?.focus();return()=>{if(previous?.isConnected)previous.focus();};},[]);
  return <div className="rr-scrim" onKeyDown={e=>{if(e.key==='Escape'){e.stopPropagation();onClose();}if(e.key==='Tab'){
    const controls=[...(ref.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input,select,a[href],[tabindex="0"]')??[])];
    const first=controls[0],last=controls.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}
  }}}><div ref={ref} className="rr-modal" role="dialog" aria-modal="true" aria-label={title}><div className="rr-modal-head"><h2>{title}</h2><button className="rr-icon-button" aria-label="Close" onClick={onClose}>×</button></div><div className="rr-modal-body">{children}</div></div></div>;
}
export default function RelicRun({friendId,paused,guestMode=false,walletUrl,storageScope='guest',friendKind='generation',portrait,ownerAddress,friendWalletAddress,onChooseFriend,friends=[],onSelectFriend}:Props){
  const [economy,setEconomy]=useState<Economy|null>(null),[sprites,setSprites]=useState<GenerationSprites|null>(null);
  const [error,setError]=useState(''),[artError,setArtError]=useState(''),[portraitReady,setPortraitReady]=useState(false),[ready,setReady]=useState(false),[revision,setRevision]=useState(0);
  const [menu,setMenu]=useState<Menu>(null),[slot,setSlot]=useState<Slot>('weapon'),[phase,setPhase]=useState<Phase>('camp');
  const [muted,setMuted]=useState(()=>gameStorage().getItem('relic-run:muted')==='true'),[reduced,setReduced]=useState(false),[userPaused,setUserPaused]=useState(false);
  const [hud,setHud]=useState({hp:10,maxHp:10,kills:0,time:0,bossHp:0,bossMax:650,bossShield:false,dash:0,ability:0,shield:false});
  const [stick,setStick]=useState({x:0,y:0}),[now,setNow]=useState(Date.now());
  const [guestKind,setGuestKind]=useState<CharacterKind>('generation');
  const [selectedLevel,setSelectedLevel]=useState<LevelId>(1),[entryMultiple,setEntryMultiple]=useState(1);
  const kind=guestMode?guestKind:friendKind,key=`${kind}:${guestMode?'sample':friendId.toString()}`;
  const canvas=useRef<HTMLCanvasElement>(null),stage=useRef<HTMLDivElement>(null),run=useRef<Run>(makeRun());
  const econ=useRef<Economy|null>(null),keys=useRef(new Set<string>()),joy=useRef({x:0,y:0}),dash=useRef(false),ability=useRef(false),target=useRef<{x:number;y:number}|null>(null);
  const sound=useRef<FriendSoundKit|null>(null),art=useRef<HTMLImageElement|null>(null);
  const live=useRef({paused,menu,userPaused,reduced,sprites,ready,guestMode,key,storageScope});live.current={paused,menu,userPaused,reduced,sprites,ready,guestMode,key,storageScope};
  function stopInput(){keys.current.clear();joy.current={x:0,y:0};target.current=null;dash.current=false;ability.current=false;setStick({x:0,y:0});}
  function publish(next:Economy){save(storageScope,next);econ.current=next;setEconomy(structuredClone(next));}
  function mutate(work:(next:Economy)=>void){if(!econ.current||!ready||paused)return false;try{const next=structuredClone(econ.current);work(next);publish(next);setError('');return true;}catch(cause){setError(cause instanceof Error?cause.message:'The action failed.');return false;}}
  function syncHud(){const s=run.current,boss=s.enemies.find(e=>e.kind==='boss');setHud({hp:s.hp,maxHp:s.maxHp,kills:s.kills,time:s.time,bossHp:boss?.hp??0,bossMax:boss?.maxHp??levelFor(s.level).bossHP,bossShield:boss?.shielded??false,dash:s.dashCool,ability:s.abilityCool,shield:s.shield});setPhase(s.phase);}
  useEffect(()=>{
    let cancelled=false,release:(()=>void)|undefined;const lockRequest=new AbortController();
    setReady(false);setEconomy(null);econ.current=null;setError('');setMenu(null);setUserPaused(false);stopInput();
    const start=()=>{
      if(cancelled)return;
      try{const value=loadSave(storageScope);character(value,storageScope,key,kind).kind=kind;recoverAbandoned(value,storageScope,Date.now());save(storageScope,value);econ.current=value;setEconomy(structuredClone(value));run.current=makeRun(value.accounts[storageScope].characters[key].loadout,1,value.accounts[storageScope].characters[key].points,selectedLevel);syncHud();setReady(true);}
      catch(cause){setError(cause instanceof Error?cause.message:'Local save unavailable.');}
    };
    if(!isBridgedStorage()&&navigator.locks)void navigator.locks.request('relic-run:world:v3',{signal:lockRequest.signal},async()=>{
      start();if(cancelled)return;await new Promise<void>(resolve=>{release=resolve;});
    }).catch(cause=>{if(!cancelled)setError(cause instanceof Error?cause.message:'Could not open this playtest.');});else start();
    const timer=setInterval(()=>setNow(Date.now()),1000);
    const leave=()=>{const value=econ.current,a=value?.accounts[storageScope]?.active;if(value&&a&&!a.ended){finishDeath(value,storageScope,a.id,Date.now());try{save(storageScope,value);}catch{}}};
    const restore=(event:PageTransitionEvent)=>{if(event.persisted)setRevision(v=>v+1);};
    window.addEventListener('pagehide',leave);
    window.addEventListener('pageshow',restore);
    return()=>{cancelled=true;leave();clearInterval(timer);window.removeEventListener('pagehide',leave);window.removeEventListener('pageshow',restore);release?.();lockRequest.abort();};
  },[storageScope,key,revision]);
  useEffect(()=>{
    let alive=true;setSprites(null);art.current=null;setPortraitReady(false);setArtError('');
    if(portrait){const image=new Image();image.onload=()=>{if(alive){art.current=image;setPortraitReady(true);}};image.onerror=()=>{if(alive)setArtError('Your Genesis portrait could not load.');};image.src=portrait;}
    else if(guestMode)setSprites(sampleFriendSprites(7730n)??null);
    else void createFriendReader().read(friendId).then(value=>{if(alive)setSprites(value);}).catch(()=>{if(alive)setArtError('Your Friend artwork could not load. Retry from the character picker.');});
    return()=>{alive=false;};
  },[friendId,guestMode,portrait]);
  useEffect(()=>{sound.current=createFriendSoundKit({muted:gameStorage().getItem('relic-run:muted')==='true',volume:.55});const mq=matchMedia('(prefers-reduced-motion: reduce)');setReduced(mq.matches);return()=>sound.current?.dispose();},[]);
  useEffect(()=>{if(paused||menu||userPaused)stopInput();},[paused,menu,userPaused]);
  useEffect(()=>{if((phase==='room'||phase==='boss')&&!paused&&!menu&&!userPaused)canvas.current?.focus({preventScroll:true});},[phase,paused,menu,userPaused]);
  useEffect(()=>{
    const node=canvas.current,container=stage.current,c=node?.getContext('2d');if(!node||!container||!c)return;
    let raf=0,previous=0,uiTime=0,accumulator=0;
    const paint=(stamp:number)=>{
      const delta=Math.min((stamp-previous)/1000||0,.1);previous=stamp;
      const current=live.current,active=current.ready&&!current.paused&&!current.menu&&!current.userPaused&&!document.hidden;
      if(active){accumulator+=delta;while(accumulator>=1/60){
        let x=joy.current.x+Number(keys.current.has('d')||keys.current.has('arrowright'))-Number(keys.current.has('a')||keys.current.has('arrowleft'));
        let y=joy.current.y+Number(keys.current.has('s')||keys.current.has('arrowdown'))-Number(keys.current.has('w')||keys.current.has('arrowup'));
        if(x||y){target.current=null;const direction=screenDirection(x,y);x=direction.x;y=direction.y;}
        if(target.current){const dx=target.current.x-run.current.x,dy=target.current.y-run.current.y,d=Math.hypot(dx,dy);if(d<6)target.current=null;else{x=dx/d;y=dy/d;}}
        const before=run.current.phase;step(run.current,{x,y,dash:dash.current,ability:ability.current},1/60);dash.current=false;ability.current=false;accumulator-=1/60;
        const value=econ.current,a=value?.accounts[current.storageScope]?.active;
        if(value&&a&&!a.ended&&(run.current.defeated.length>a.kills.length||run.current.phase==='dead')){
          try{
            const next=structuredClone(value);
            for(const enemy of run.current.defeated)if(!next.accounts[current.storageScope].active!.kills.includes(enemy.id)){const gemz=creditKill(next,current.storageScope,a.id,enemy.id,enemy.boss,drawBossRolls());if(gemz)run.current.texts.push({x:enemy.x,y:enemy.y+12,text:`+${gemz} GEMZ`,life:1.6,color:'#111'});sound.current?.play('reward',{volume:enemy.boss?1:.45});}
            if(run.current.phase==='won')finishVictory(next,current.storageScope,a.id,run.current.time,draw());
            if(run.current.phase==='dead')finishDeath(next,current.storageScope,a.id,Date.now());
            save(current.storageScope,next);econ.current=next;setEconomy(structuredClone(next));
          }catch(cause){setError(cause instanceof Error?cause.message:'Could not save progress.');setUserPaused(true);}
        }
        for(const cue of run.current.sounds)sound.current?.play(cue==='attack'?'select':'action-start',{volume:cue==='attack'?.32:.8});run.current.sounds=[];
        if(run.current.event==='hit')sound.current?.play('impact');
        if(run.current.phase!==before){stopInput();syncHud();if(run.current.phase==='won')sound.current?.play('reward');}
      }}else accumulator=0;
      const box=container.getBoundingClientRect(),ratio=Math.min(devicePixelRatio||1,2),width=Math.round(box.width*ratio),height=Math.round(box.height*ratio);
      if(node.width!==width||node.height!==height){node.width=width;node.height=height;}
      c.setTransform(ratio,0,0,ratio,0,0);c.fillStyle=PALETTE.paper;c.fillRect(0,0,box.width,box.height);
      const scale=Math.min(box.width/W,box.height/H);c.translate((box.width-W*scale)/2,(box.height-H*scale)/2);c.scale(scale,scale);
      render(c,run.current,current.sprites,current.reduced?0:stamp/1000,current.reduced,art.current);
      if(stamp-uiTime>100){syncHud();uiTime=stamp;node.dataset.x=run.current.x.toFixed(1);node.dataset.y=run.current.y.toFixed(1);node.dataset.hp=String(run.current.hp);}
      raf=requestAnimationFrame(paint);
    };
    const down=(e:KeyboardEvent)=>{
      if(e.key==='Escape'&&!live.current.menu){setUserPaused(v=>!v);stopInput();return;}
      if(live.current.paused||live.current.menu||live.current.userPaused||!['room','boss'].includes(run.current.phase))return;
      if(['INPUT','SELECT','TEXTAREA','BUTTON'].includes((e.target as HTMLElement)?.tagName))return;
      const key=e.key.toLowerCase();if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright',' ','shift','q'].includes(key)){
        e.preventDefault();keys.current.add(key);if((key===' '||key==='shift')&&!e.repeat)dash.current=true;if(key==='q'&&!e.repeat)ability.current=true;
      }
    };
    const up=(e:KeyboardEvent)=>keys.current.delete(e.key.toLowerCase());
    const blur=()=>{stopInput();if(['room','boss'].includes(run.current.phase))setUserPaused(true);};
    const visibility=()=>{if(document.hidden)blur();};
    window.addEventListener('keydown',down);window.addEventListener('keyup',up);window.addEventListener('blur',blur);document.addEventListener('visibilitychange',visibility);
    raf=requestAnimationFrame(paint);return()=>{cancelAnimationFrame(raf);window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);window.removeEventListener('blur',blur);document.removeEventListener('visibilitychange',visibility);};
  },[]);
  const purse=economy?.accounts[storageScope],player=purse?.characters[key],stats=player?statsFor(player.loadout,player.points):statsFor(makeRun().loadout),inCombat=phase==='room'||phase==='boss',isCamp=phase==='camp';
  const level=levelFor(isCamp?selectedLevel:run.current.level);
  const lockRemaining=Math.max(0,(player?.lockedUntil??0)-now),entry=purse?.active,hasArt=!artError&&(guestMode||Boolean(sprites)||portraitReady);
  const activeMultiple=isCamp?entryMultiple:entry?.multiple??1,gemzBonusBps=isCamp?gearFor(player?.loadout.weapon??0).gemzBonusBps??0:entry?.gemzBonusBps??0,quote=entryQuote(level.id,activeMultiple,gemzBonusBps);
  const gemzLabel=`${quote.minGemz.toLocaleString('en-US')}–${quote.maxGemz.toLocaleString('en-US')}`;
  const disabled=!ready||paused;
  const friendLabel=guestMode?(kind==='genesis'?'Genesis · demo':'Generation · demo'):`${kind==='genesis'?'Genesis':'Friend'} #${friendId}`;
  const roster=guestMode?[{id:7730n,kind:'generation' as const,label:'Generation · demo'},{id:0n,kind:'genesis' as const,label:'Genesis · demo'}]:friends;
  const potionCount=Object.values(player?.potions??{}).reduce((n,v)=>n+BigInt(v??'0'),0n).toString();
  function play(cue:FriendSoundCue){sound.current?.play(cue);}
  function uiSound(e:React.MouseEvent){const node=(e.target as HTMLElement).closest?.('button,a,select,summary');if(node&&!(node as HTMLButtonElement).disabled)void sound.current?.unlock().then(()=>sound.current?.play('select',{volume:.5}));}
  useEffect(()=>{if(ready&&econ.current&&now>=econ.current.pool.closesAt)mutate(next=>settleRound(next,now));},[now,ready]);
  function begin(){if(!hasArt||!['camp','dead'].includes(run.current.phase))return;const entered=mutate(next=>{beginEntry(next,storageScope,key,Date.now(),selectedLevel,entryMultiple);});if(entered&&econ.current){run.current=makeRun(econ.current.accounts[storageScope].characters[key].loadout,crypto.getRandomValues(new Uint32Array(1))[0],econ.current.accounts[storageScope].characters[key].points,selectedLevel);startRoom(run.current);setUserPaused(false);stopInput();syncHud();void sound.current?.unlock();}}
  function camp(){if(!econ.current)return;run.current=makeRun(econ.current.accounts[storageScope].characters[key].loadout,1,econ.current.accounts[storageScope].characters[key].points,selectedLevel);setUserPaused(false);stopInput();syncHud();}
  function chooseLevel(id:LevelId){if(!isCamp||!econ.current)return;setSelectedLevel(id);setEntryMultiple(n=>Math.min(n,maxEntryMultiple(id)));const c=econ.current.accounts[storageScope].characters[key];run.current=makeRun(c.loadout,1,c.points,id);stopInput();syncHud();}
  function pointer(e:PointerEvent<HTMLCanvasElement>){if(!inCombat||paused||menu||userPaused)return;const b=e.currentTarget.getBoundingClientRect(),scale=Math.min(b.width/W,b.height/H);target.current=unproject((e.clientX-b.left-(b.width-W*scale)/2)/scale,(e.clientY-b.top-(b.height-H*scale)/2)/scale);}
  function joystick(e:PointerEvent<HTMLDivElement>){if(!inCombat||paused||menu||userPaused)return;const b=e.currentTarget.getBoundingClientRect(),dx=e.clientX-b.left-b.width/2,dy=e.clientY-b.top-b.height/2,len=Math.hypot(dx,dy),max=27;joy.current={x:dx/Math.max(max,len),y:dy/Math.max(max,len)};target.current=null;setStick({x:joy.current.x*max,y:joy.current.y*max});}
  return <section className="rr-game rr-guest rr-level-one" data-phase={phase} data-expedition={!isCamp} data-level={level.id} data-reduced={reduced} style={{'--region':PALETTE[level.color]} as CSSProperties} data-avatar-id={guestMode?'7730':friendId.toString()} data-character-kind={kind} data-owner-address={ownerAddress} data-friend-wallet={friendWalletAddress} aria-label="Relic Run" onClickCapture={uiSound}>
    <header className="rr-topbar"><div className="rr-brand"><Mark/><span>RELIC RUN</span><small>RARE FRIENDS</small></div><div className="rr-top-actions">
      <span className="rr-preview">PLAYTEST</span>{guestMode&&walletUrl&&<a className="rr-connect" href={walletUrl}>Connect wallet</a>}
      {!guestMode&&<button className="rr-player-id" onClick={()=>{if(econ.current?.accounts[storageScope]?.active&&!econ.current.accounts[storageScope].active!.ended)setMenu('leave');else onChooseFriend?.();}} aria-label="Choose Friend">{portrait?<img src={portrait} alt={`Genesis #${friendId} avatar`}/>:sprites&&<svg viewBox="0 0 16 16" aria-label={`Friend #${friendId} avatar`}>{sprites.clips.idle.down[0].rows.map((row,y)=>[...row].map((pixel,x)=>pixel==='#'&&<rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="currentColor"/>))}</svg>}#{friendId.toString()}</button>}
      <button className="rr-icon-button" aria-label={muted?'Enable sound':'Mute sound'} onClick={()=>{setMuted(!muted);gameStorage().setItem('relic-run:muted',String(!muted));sound.current?.setMuted(!muted);if(muted)void sound.current?.unlock();}}>{muted?'♪̸':'♪'}</button><button className="rr-icon-button" aria-label="How to play" onClick={()=>setMenu('help')}>?</button></div></header>
    <nav className="rr-econ-nav" aria-label="Game purse"><span><b data-testid="gemz-balance">{gemzText(purse??{gemz:0})}</b> GEMZ</span><span><b data-testid="rf-balance">{fmtRF(purse?.rf??0)}</b> test RF</span><button className="rr-sim-label rr-cycle-link" onClick={()=>setMenu('odds')}>RF / GEMZ cycle ↗</button><button disabled={inCombat||phase==='door'||disabled} onClick={()=>setMenu('pool')}>GEMZ → RF season ↗</button></nav>
    <section className="rr-roster" aria-label="Your Rarefriends"><span className="rr-roster-label">YOUR FRIENDS<small>Separate gear & stats</small></span>{roster.map(f=>{const k=`${f.kind}:${guestMode?'sample':f.id}`,c=purse?.characters[k],remaining=Math.max(0,(c?.lockedUntil??0)-now);return <button key={k} className={`rr-roster-card ${key===k?'selected':''}`} aria-pressed={key===k} disabled={inCombat||phase==='door'||disabled} onClick={()=>{if(key===k)return;if(guestMode)setGuestKind(f.kind);else onSelectFriend?.(f);}}><span className="rr-roster-avatar"><RosterAvatar portrait={f.portrait??(key===k?portrait:undefined)} sprites={key===k?sprites:null}/></span><span><strong>{f.label}</strong><small className={remaining?'recovering':''}>{remaining?`Cooldown · ${recovery(remaining)}`:key===k?'Playing · ready':'Ready to explore'}</small></span></button>;})}{!guestMode&&<button className="rr-text-button" disabled={inCombat||phase==='door'} onClick={onChooseFriend}>All Friends ↗</button>}</section>
    {!isCamp&&<div className="rr-expedition-hud">      <div className="rr-combat-hud"><div><span className="rr-eyebrow">{`L${level.id} / ${phase==='boss'?level.boss:level.name}`}</span><div className="rr-health"><span>HP</span><div className="rr-health-track"><i style={{width:`${100*hud.hp/hud.maxHp}%`}}/></div><b>{Math.ceil(hud.hp)}<small> / {hud.maxHp}</small></b></div></div><div className="rr-clock">{elapsed(hud.time)}<small>{phase==='room'?`${Math.min(hud.kills,9)} / 9 CLEARED`:`${gemzText(entry??{gemz:0})} GEMZ FOUND`}</small></div></div>
      {phase==='boss'&&<div className="rr-boss-meter"><span>{level.boss.toUpperCase()}{hud.bossShield?' · SHIELDED':hud.bossHp<=hud.bossMax*.5?' · ENRAGED':''}</span><div><i style={{width:`${100*hud.bossHp/hud.bossMax}%`}}/></div></div>}<div className="rr-run-tools">{inCombat&&<button className="rr-secondary" disabled={userPaused} onClick={()=>setUserPaused(true)}>{userPaused?'Paused':'Pause'}</button>}<button className="rr-icon-button" aria-label={muted?'Enable sound':'Mute sound'} onClick={()=>{setMuted(!muted);gameStorage().setItem('relic-run:muted',String(!muted));sound.current?.setMuted(!muted);if(muted)void sound.current?.unlock();}}>{muted?'♪̸':'♪'}</button>{!guestMode&&<button className="rr-text-button" aria-label="Choose Friend" onClick={()=>inCombat||phase==='door'?setMenu('leave'):onChooseFriend?.()}>Choose Friend</button>}</div></div>}
    <div className="rr-stage" ref={stage}>
      <canvas ref={canvas} tabIndex={0} onPointerDown={pointer} onPointerMove={e=>{if(e.buttons===1)pointer(e);}} aria-label="Island arena. WASD or touch to move, Space to dodge, Q to use your ability."/>

      {isCamp&&<div className="rr-camp"><div className="rr-camp-copy"><label className="rr-level-select">EXPEDITION<select aria-label="Expedition level" value={selectedLevel} disabled={disabled} onChange={e=>chooseLevel(Number(e.target.value) as LevelId)}>{LEVELS.map(l=><option key={l.id} value={l.id}>L{l.id} · {l.name}</option>)}</select></label><h1>{level.name.toUpperCase()}.</h1><p>{level.boss} · {level.gear} recommended<br/>{gemzLabel} GEMZ per full clear · avg. {quote.gemz.toLocaleString('en-US')} GEMZ{gemzBonusBps>0&&<small className="rr-gemz-perk">Fortune’s Fang · +25% GEMZ included</small>}</p><button className="rr-entry-boost" onClick={()=>setMenu('entry')}>Entry boost · {entryMultiple.toLocaleString('en-US')}× <span>{weaponRewardLabel(quote)} ↗</span></button><div className="rr-camp-actions"><button className="rr-primary" disabled={disabled||!hasArt||lockRemaining>0||(purse?.rf??0)<quote.costRF*RF} onClick={begin}>{lockRemaining>0?'Recovering…':`Enter · ${quote.costRF.toLocaleString('en-US')} RF`}</button><button className="rr-text-button" onClick={()=>setMenu('loot')}>Boss & loot</button></div><button className="rr-text-button rr-expedition-link" onClick={()=>setMenu('expeditions')}>Explore levels 2–5 ↗</button><span className="rr-camp-note">{lockRemaining>0?`Ready in ${recovery(lockRemaining)}. Your unequipped items are safe.`:kind==='genesis'?'GENESIS · equipment protected · no recovery timer':'Ordinary equipped gear is lost on death · 12h recovery. Soulbound weapons survive.'}</span></div><div className="rr-camp-side"><span className="rr-run-number">LEVEL {level.id} JACKPOT</span><div className="rr-small-stat"><b>{fmtRF(economy?.jackpots[level.id]??0)}</b><span>RF · 0.25% PER BOSS CLEAR</span></div><div className="rr-small-stat"><b>{String(player?.clears??0).padStart(2,'0')}</b><span>BOSSES CLEARED</span></div></div></div>}
      {phase==='door'&&<div className="rr-state-panel"><span className="rr-eyebrow">BOSS GATE · LEVEL {level.id}</span><h2>{level.boss} awaits.</h2><p>{gemzText(entry??{gemz:0})} GEMZ collected. Recover up to 25% of max HP.<br/>{level.hint}</p><button className="rr-primary" disabled={disabled} onClick={()=>{enterBoss(run.current);stopInput();syncHud();}}>Face the boss</button></div>}
      {phase==='dead'&&<div className="rr-state-panel"><span className="rr-eyebrow">{kind==='genesis'?'GENESIS PROTECTION':'TEMP-DEATH'}</span><h2>{kind==='genesis'?'Your Friend endures.':'Rest, little Friend.'}</h2><p>{kind==='genesis'?'Your equipment is safe. Potion bonuses reset. You can explore again immediately.':`Ordinary equipped items and potion bonuses were lost. Soulbound weapons survive. Recover for ${recovery(lockRemaining)}.`}</p><p>{gemzText(entry??{gemz:0})} GEMZ and unequipped drops are safe.</p><button className="rr-primary" onClick={camp}>Return to camp</button></div>}
      {phase==='won'&&<div className="rr-state-panel rr-reward"><div className="rr-reward-body"><span className="rr-eyebrow">{level.boss.toUpperCase()} DEFEATED</span><h2>Expedition spoils.</h2><>{entry&&<JackpotReveal key={entry.id} entry={entry} carry={economy?.jackpots[level.id]??0} reduced={reduced} play={play}/>}</><div className="rr-loot-balance">+{gemzText(entry??{gemz:0})} <small>GEMZ THIS RUN</small></div><div className="rr-loot-list">{entry?.items.filter(id=>id!==level.jackpotWeapon).map((id,i)=><div key={i}><GearIcon gear={gearFor(id)} size={22}/><span>{gearFor(id).name}<small>{gearLabel(gearFor(id))} · {gearFor(id).slot}</small></span></div>)}{entry?.potions.map((id,i)=><div key={`potion-${i}`}><span>♙ {potionName(id)}<small>Stored · consume at camp</small></span></div>)}</div></div><div className="rr-reward-actions"><button className="rr-primary" onClick={()=>{camp();setMenu('gear');}}>Manage equipment</button><button className="rr-text-button" onClick={()=>{camp();setMenu('chests');}}>Open the chest store</button><button className="rr-text-button" onClick={()=>{camp();setMenu('pool');}}>Redeem GEMZ for RF</button></div></div>}
      {inCombat&&<div className="rr-touch-controls"><div className="rr-joystick" role="group" aria-label="Movement joystick" onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);joystick(e);}} onPointerMove={e=>{if(e.currentTarget.hasPointerCapture(e.pointerId))joystick(e);}} onPointerUp={stopInput} onPointerCancel={stopInput}><i style={{transform:`translate(${stick.x}px,${stick.y}px)`}}/></div><div className="rr-combat-actions"><button className="rr-dodge" aria-label="Use ability" disabled={hud.ability>0||userPaused||(hud.shield&&stats.ability.ability==='shield')} onClick={()=>{ability.current=true;canvas.current?.focus();}}>{stats.ability.ability?.toUpperCase()??'ABILITY'}<small>{hud.shield&&stats.ability.ability==='shield'?'1 HIT':hud.ability>0?`${hud.ability.toFixed(1)}s`:'Q'}</small></button><button className="rr-dodge" aria-label="Dodge" disabled={hud.dash>0||userPaused} onClick={()=>{dash.current=true;canvas.current?.focus();}}>DODGE<small>{hud.dash>0?`${hud.dash.toFixed(1)}s`:'SPACE'}</small></button></div></div>}
      {inCombat&&userPaused&&<div className="rr-state-panel"><span className="rr-eyebrow">TAKE A BREATHER</span><h2>Paused.</h2><button className="rr-primary" onClick={()=>setUserPaused(false)}>Resume</button></div>}
      {(!ready||!hasArt)&&<div className="rr-loading"><p>{artError||error||(!hasArt?'Loading your Friend’s artwork…':'')||'Opening your playtest. If another copy is open, close it to continue.'}</p>{artError&&onChooseFriend&&<button className="rr-secondary" onClick={onChooseFriend}>Retry Friend selection</button>}{error&&<><button className="rr-secondary" onClick={()=>setRevision(v=>v+1)}>Retry</button>{!isBridgedStorage()&&<button className="rr-text-button" onClick={()=>{resetSave(storageScope);setRevision(v=>v+1);}}>Reset shared playtest world</button>}</>}</div>}
    </div>
    <div className="rr-camp-dock"><section className="rr-inventory-dock" aria-label="Friend inventory"><div className="rr-dock-heading"><span><b>{friendLabel}</b><small>Equipment belongs to this Friend</small></span><button disabled={inCombat||phase==='door'||disabled} onClick={()=>setMenu('potions')}>Potions ↗ <b>{potionCount}</b></button></div><footer className="rr-four-slots" aria-label="Equipped items">{SLOTS.map(s=>{const g=gearFor(player?.loadout[s]??STARTERS[SLOTS.indexOf(s)].id);return <button key={s} className="rr-equipped-slot" disabled={inCombat||phase==='door'||disabled} onClick={()=>{setSlot(s);setMenu('gear');}} aria-label={`${s}: ${g.name}`}><GearIcon gear={g} size={56}/><span><small>{s.toUpperCase()}</small><strong>{g.name}</strong></span></button>;})}</footer><button className="rr-backpack-button" disabled={inCombat||phase==='door'||disabled} onClick={()=>setMenu('gear')}>Open {friendLabel}’s backpack ↗</button></section><aside className="rr-storefront" aria-label="Chest store"><div className="rr-store-art" aria-hidden="true"><GearIcon gear={gearFor(225)} size={58}/><GearIcon gear={gearFor(304)} size={52}/></div><span className="rr-eyebrow">GEAR UP FOR YOUR NEXT RUN</span><h2>CHEST STORE</h2><p>Four chests. Higher tier floors.</p><button className="rr-primary" disabled={inCombat||phase==='door'||disabled} onClick={()=>setMenu('chests')}>Shop chests · from {BASE_CHEST.cost} GEMZ</button><small>{(purse?.gemz??0)>=BASE_CHEST.cost?'You can open a chest!':`${BASE_CHEST.cost-gemzValue(purse??{gemz:0})} GEMZ to your next chest`}</small></aside></div>
    <div className="rr-underbar"><span>{stats.health} HP · {stats.defense} DEF · {Math.round(stats.speed)} SPD · ×{stats.power.toFixed(2)} DMG · ×{stats.attackRate.toFixed(2)} RATE{gemzBonusBps>0?' · +25% GEMZ':''}</span><button className="rr-text-button" onClick={()=>inCombat?setUserPaused(v=>!v):setMenu('help')}>{inCombat?'Pause':'Controls'}</button></div>
    {error&&ready&&<div className="rr-error" role="alert"><span>{error}</span><button aria-label="Dismiss error" onClick={()=>setError('')}>×</button></div>}
    {menu&&<Modal title={{gear:'Your equipment',odds:'Economy & odds',help:'Field guide',chests:'Chest store · four collections',pool:'24-hour RF seasons',potions:'Your potion stash',loot:`Level ${level.id} · ${level.boss}`,leave:'Leave this expedition?',expeditions:'Expedition guide · levels 1–5',entry:'Choose your entry boost'}[menu]} onClose={()=>setMenu(null)}>
      {menu==='leave'&&<><p>{kind==='genesis'?'Your Genesis keeps its equipped items and can re-enter immediately.':'Leaving counts as defeat. Ordinary equipped items and potion bonuses are lost. Soulbound weapons survive; this Friend recovers for 12 hours.'}</p><p>The entry fee stays spent and potion bonuses reset. Collected GEMZ, stored potions and backpack items are kept.</p><div className="rr-action-row"><button className="rr-primary" onClick={()=>setMenu(null)}>Keep exploring</button><button className="rr-secondary" onClick={onChooseFriend}>Leave & choose Friend</button></div></>}
      {menu==='gear'&&<><div className="rr-tabs">{SLOTS.map(s=><button key={s} className={slot===s?'active':''} onClick={()=>setSlot(s)}>{s}</button>)}</div><p className="rr-muted"><strong>{friendLabel}’s backpack.</strong> Equip one item per slot at camp. Each drop is a separate copy; only ordinary equipped copies are lost on death. Soulbound weapons stay with their earning Friend.</p><div className="rr-gear-grid">{[...STARTERS,...GEAR.filter(g=>(player?.inventory[g.id]??0)>0)].filter(g=>g.slot===slot).map(g=><button className={`rr-gear-card ${player?.loadout[slot]===g.id?'selected':''}`} key={g.id} aria-pressed={player?.loadout[slot]===g.id} onClick={()=>{mutate(next=>equip(next,storageScope,key,g.id));camp();}}><GearIcon gear={g} size={40}/><span className="rr-rarity">{gearLabel(g)}</span><strong>{g.name}</strong><small>{g.detail}</small><b>{player?.loadout[slot]===g.id?'Equipped':`Equip ${slot}`}{g.id>0?` · ×${player?.inventory[g.id]}`:''}</b></button>)}</div></>}
      {menu==='chests'&&economy&&<ChestPanel economy={economy} scope={storageScope} friendKey={key} mutate={mutate} play={play} reduced={reduced} refresh={camp}/>}
      {menu==='pool'&&economy&&<RedemptionPanel economy={economy} scope={storageScope} friendKey={key} mutate={mutate} refresh={camp}/>}
      {menu==='potions'&&economy&&<PotionPanel economy={economy} scope={storageScope} friendKey={key} mutate={mutate} refresh={camp}/>}
      {menu==='entry'&&<EntryPicker levelId={level.id} multiple={entryMultiple} gemzBonusBps={gemzBonusBps} onChange={setEntryMultiple} onDone={()=>setMenu(null)}/>}
      {menu==='loot'&&<LootGuide levelId={level.id} multiple={activeMultiple} gemzBonusBps={gemzBonusBps}/>}
      {menu==='expeditions'&&<ExpeditionGuide selected={selectedLevel} onSelect={id=>{chooseLevel(id);setMenu(null);}} canSelect={isCamp}/>}
      {menu==='odds'&&economy&&<EconomyGuide economy={economy} levelId={level.id} multiple={activeMultiple} gemzBonusBps={gemzBonusBps}/>}
      {menu==='help'&&<><div className="rr-howto"><p><b>01</b><span><strong>Build across four slots.</strong>Weapon, ability, armor and ring. Walk with WASD / arrows or the touch stick. Attacks fire automatically. Q triggers your equipped ability; Space dodges.</span></p><p><b>02</b><span><strong>Choose your expedition.</strong>Pay {quote.costRF.toLocaleString('en-US')} simulated RF for {level.name}. Minions and the boss drop {gemzLabel} GEMZ per full clear · avg. {quote.gemz.toLocaleString('en-US')} GEMZ. The boss drops potions, boosted soulbound weapon rewards, and rolls its 0.25% jackpot once.</span></p><p><b>03</b><span><strong>Survive. Equip. Redeem.</strong>Spend {BASE_CHEST.cost} GEMZ on a chest or contribute GEMZ to the global RF pool. Generation death loses ordinary equipped items and locks that Friend for 12 hours. Genesis keeps equipment and avoids recovery. Every death resets potion bonuses. Leaving a run counts as defeat.</span></p></div><label className="rr-toggle"><input type="checkbox" checked={reduced} onChange={e=>setReduced(e.target.checked)}/> Reduce motion</label>{guestMode&&<label className="rr-profile">Guest rules profile <select value={guestKind} disabled={!isCamp} onChange={e=>setGuestKind(e.target.value as CharacterKind)}><option value="generation">Generation · temp-death</option><option value="genesis">Genesis · protected (rules test)</option></select></label>}<p className="rr-muted" data-testid="save-status">{isBridgedStorage()?`Saved for ${friendLabel}’s canonical NFT wallet in this browser. Connected owner: ${ownerAddress}. `:ownerAddress?`Saved for wallet ${ownerAddress}, ${friendLabel}, in this browser. `:'Guest progress is saved in this browser. '}{friendWalletAddress&&`Verified Friend wallet: ${friendWalletAddress}. `}These items are local game records, not wallet tokens. Reconnect and choose this Friend on this site to restore them; they do not sync across devices.</p><p className="rr-muted">Simulated preview only. Friends share one world in this browser, with separate purses and inventory. New and migrated accounts get a one-time 500 test RF grant. Previous balances, equipment and progress are retained. Saves and recovery timers persist separately from NFT ownership. Clearing browser data or resetting the playtest resets them. A server must enforce these rules before real-value play.</p><button className="rr-text-button" onClick={()=>setMenu('odds')}>Economy, odds & funding</button>{!inCombat&&phase!=='door'&&<><button className="rr-text-button" onClick={()=>mutate(next=>addTestRF(next,storageScope))}>Add 100 test RF</button><button className="rr-text-button" onClick={()=>mutate(next=>addTestRF(next,storageScope,quote.costRF))}>Add this entry’s cost · {quote.costRF.toLocaleString('en-US')} test RF</button></>}{!isBridgedStorage()&&!inCombat&&phase!=='door'&&<button className="rr-text-button" onClick={()=>{resetSave(storageScope);setMenu(null);setRevision(v=>v+1);}}>Reset shared playtest world</button>}</>}
    </Modal>}
  </section>;
}
