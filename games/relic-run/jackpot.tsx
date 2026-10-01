import {useEffect,useRef,useState} from 'react';
import type {FriendSoundCue} from '@rarefriends/friendsdk/sounds';
import {fmtRF,type Entry} from './economy.ts';
import {GearIcon} from './icons.tsx';
import {gearFor} from './gear.ts';
import {levelFor} from './levels.ts';

export function JackpotReveal({entry,carry,reduced,play}:{entry:Entry;carry:number;reduced:boolean;play:(cue:FriendSoundCue)=>void}){
  const [done,setDone]=useState(reduced),[tick,setTick]=useState(0),voice=useRef(play),announced=useRef(false);voice.current=play;
  const hit=entry.jackpot!==null&&entry.jackpot>0;
  useEffect(()=>{
    if(done){if(!announced.current){voice.current(hit?'reveal-legendary':'reveal-common');announced.current=true;}return;}
    if(reduced){setDone(true);return;}
    // Presentation only: the ledger has already committed this exact outcome.
    const interval=setInterval(()=>{setTick(t=>t+1);voice.current('anticipation');},260);
    const finish=setTimeout(()=>setDone(true),2400);
    return()=>{clearInterval(interval);clearTimeout(finish);};
  },[done,reduced,hit]);
  return <section className={`rr-jackpot-reveal ${done?'settled':'spinning'} ${done&&hit?'hit':''}`} aria-label="Boss jackpot" data-result={done?(hit?'hit':'miss'):'spinning'}>
    <span className="rr-eyebrow">LEVEL {entry.level} JACKPOT · 0.25% CHANCE</span>
    <div className="rr-jackpot-reels" aria-hidden="true">{[0,1,2].map((n)=><span key={n}>{done?(hit?'★':['◇','○','△'][n]):['◇','○','△','✦'][(tick+n)%4]}</span>)}</div>
    <div role="status" aria-live="polite">{done?<><strong>{hit?`JACKPOT! +${fmtRF(entry.jackpot!)} RF`:'No jackpot this time'}</strong><small>{hit?'80% paid + a soulbound weapon.':'Your GEMZ, potions and loot are yours.'} {fmtRF(carry)} RF carries forward.</small></>:<strong>Rolling your boss-clear jackpot…</strong>}</div>
    {done&&hit&&<div className="rr-jackpot-weapon"><GearIcon gear={gearFor(levelFor(entry.level).jackpotWeapon)} size={48}/><small>{gearFor(levelFor(entry.level).jackpotWeapon).name} · Soulbound</small></div>}
    {!done&&<button className="rr-text-button" onClick={()=>setDone(true)}>Reveal result now</button>}
  </section>;
}
