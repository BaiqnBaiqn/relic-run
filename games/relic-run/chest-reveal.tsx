import {useEffect,useRef,useState,type CSSProperties} from 'react';
import type {FriendSoundCue} from '@rarefriends/friendsdk/sounds';
import {gearFor,gearLabel} from './gear.ts';
import {GearIcon} from './icons.tsx';
import type {ChestReceipt} from './economy.ts';
import type {Chest} from './chests.ts';

export function ChestArt({floor=1}:{floor?:number}){
  return <svg viewBox="0 0 180 150" className="rr-chest-art" fill="none" stroke="#171913" strokeWidth="3" strokeLinejoin="round" aria-hidden="true">
    <ellipse cx="91" cy="133" rx="65" ry="8" fill="#171913" opacity=".13" stroke="none"/>
    <path d="M28 68h118v53l-59 11-59-15z" fill="var(--chest-color)"/>
    <path d="m87 79 59-11v53l-59 11z" fill="#171913" opacity=".2" stroke="none"/>
    <path d="M43 72v48m28-46v51m36-49v50m23-54v50" strokeWidth="2" opacity=".5"/>
    <g className="rr-chest-lid"><path d="m28 68 16-31 55-11 47 42-59 11z" fill="var(--chest-color)"/><path d="m44 37 43 42 13-29-1-24M58 34l40 38m18-20 13 20"/><path d="m28 68 59 11 59-11" strokeWidth="5"/>
      {floor>=2&&<path d="m52 36 10 11m14 14 10 11m28-22 17 16" stroke="#fff" strokeWidth="5"/>}
      {floor>=3&&<path d="m82 30 12-16 15 13-11 16z" fill="white"/>}
      {floor>=4&&<path d="m54 32-6-16 19 8 13-15 12 12 17-8 8 25" fill="#171913"/>}
    </g>
    <path className="rr-chest-lock" d="m78 74 18 1v23l-18-1z" fill="#fff"/><path className="rr-chest-lock" d="m87 82 0 9"/>
    {floor>=2&&<path d="m33 104 0 10 13 2m90-11v10l-13 2" strokeWidth="5"/>}
  </svg>;
}
type Phase='idle'|'charging'|'unlocking'|'emerging'|'ready'|'revealed';
const rarityColors=['#dce9c9','#7DB4DB','#89ccef','#ba92f0','#ffce59'];
export function ChestReveal({chest,receipt,reduced,play,onReveal}:{chest:Chest;receipt?:ChestReceipt;reduced:boolean;play:(cue:FriendSoundCue)=>void;onReveal:(number:number)=>void}){
  const [phase,setPhase]=useState<Phase>(receipt?(receipt.revealed?'revealed':'charging'):'idle');
  const callbacks=useRef({play,onReveal});callbacks.current={play,onReveal};const finished=useRef(false),container=useRef<HTMLElement>(null);
  const item=receipt?gearFor(receipt.item):null,pending=phase!=='idle'&&phase!=='revealed';
  function finish(){if(!receipt||finished.current)return;finished.current=true;setPhase('revealed');callbacks.current.onReveal(receipt.number);callbacks.current.play((item?.tier??1)>=4?'reveal-legendary':(item?.tier??1)>=3?'reveal-rare':'reveal-common');}
  useEffect(()=>{
    finished.current=false;
    if(!receipt){setPhase('idle');return;}
    if(receipt.revealed){finished.current=true;setPhase('revealed');return;}
    container.current?.scrollIntoView({block:'center'});
    if(reduced){finish();return;}
    setPhase('charging');const timers:ReturnType<typeof setTimeout>[]=[];
    const later=(ms:number,fn:()=>void)=>timers.push(setTimeout(()=>{if(!finished.current)fn();},ms));
    for(const ms of [0,800,1500,2200,2800,3400,4200,4900])later(ms,()=>callbacks.current.play('anticipation'));
    later(2400,()=>setPhase('unlocking'));later(4000,()=>setPhase('emerging'));later(5600,()=>{setPhase('ready');callbacks.current.play('anticipation');});
    return()=>timers.forEach(clearTimeout);
  },[receipt?.number,chest.id,reduced]);
  const lit=phase==='emerging'||phase==='ready'||phase==='revealed';
  return <section ref={container} className="rr-chest-reveal" data-phase={phase} data-tier={lit?item?.tier:undefined} aria-label="Chest result" style={{'--chest-color':chest.color,'--loot-color':lit?rarityColors[(item?.tier??1)-1]:'#fff'} as CSSProperties}>
    <div className="rr-chest-theatre">
      <div className="rr-chest-rays" aria-hidden="true"/><div className="rr-chest-floor" aria-hidden="true"/>
      {phase!=='revealed'&&<ChestArt floor={chest.floor}/>}
      {item&&lit&&<div className="rr-chest-prize" aria-hidden={phase!=='revealed'}><GearIcon gear={item} size={132}/></div>}
      {phase==='revealed'&&<span className="rr-prize-tier">T{item?.tier} · {item?.rarity.toUpperCase()}</span>}
    </div>
    <div className="rr-chest-announcement" role="status" aria-live="polite">
      <strong>{phase==='idle'?chest.name:phase==='charging'?'Breaking the seal…':phase==='unlocking'?'The lid is opening…':phase==='emerging'?'A treasure takes shape…':phase==='ready'?'Your treasure is waiting.':item?.name}</strong>
      <small>{phase==='revealed'?`${gearLabel(item!)} · ${item?.slot} · saved to the recipient’s backpack`:phase==='idle'?`One item · T${chest.floor} minimum`:phase==='ready'?'The seal has broken. Reveal what is inside.':'Listen… something is stirring inside.'}</small>
    </div>
    {phase==='ready'&&<button className="rr-primary rr-reveal-treasure" onClick={finish}>Reveal treasure</button>}
    {pending&&phase!=='ready'&&<button className="rr-text-button" onClick={finish}>Skip to reveal</button>}
  </section>;
}
