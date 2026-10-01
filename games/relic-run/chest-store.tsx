import {gemzText,gemzValue} from './gemz.ts';
import {useState,type CSSProperties} from 'react';
import type {FriendSoundCue} from '@rarefriends/friendsdk/sounds';
import {CHESTS,BASE_CHEST,CHEST_ROLL_SIZE,chestFor,chanceLabel,gemzLabel,expectedTierCost,type ChestId} from './chests.ts';
import {openChest,revealChest,equip,draw,type Economy} from './economy.ts';
import {ChestArt,ChestReveal} from './chest-reveal.tsx';
import {LootComparison} from './loot-comparison.tsx';
import {ItemCatalog} from './economy-ui.tsx';

type Props={economy:Economy;scope:string;friendKey:string;mutate:(fn:(e:Economy)=>void)=>boolean;play:(cue:FriendSoundCue)=>void;reduced:boolean;refresh:()=>void};
const recipient=(key:string)=>key==='generation:sample'?'Generation · demo':key==='genesis:sample'?'Genesis · demo':key.replace('generation:','Friend #').replace('genesis:','Genesis #');
export function ChestPanel({economy,scope,friendKey,mutate,play,reduced,refresh}:Props){
  const p=economy.accounts[scope],pending=p.chestReceipt&&!p.chestReceipt.revealed;
  const [selected,setSelected]=useState<ChestId>(pending?p.chestReceipt!.chest:'overgrowth');
  const chest=chestFor(pending?p.chestReceipt!.chest:selected),receipt=p.chestReceipt?.chest===chest.id?p.chestReceipt:undefined;
  function open(){if(pending)return;if(mutate(next=>{openChest(next,scope,friendKey,draw(CHEST_ROLL_SIZE),draw(),draw(12),chest.id);})){play('purchase');}}
  return <div className="rr-chest-store">
    <div className="rr-shop-summary"><span>YOUR GEMZ <b>{gemzText(p)}</b></span><span>Buying for <b>{recipient(friendKey)}</b></span></div>
    {!pending&&<div className="rr-chest-choices" aria-label="Choose a chest">{CHESTS.map(c=><button key={c.id} aria-pressed={c.id===chest.id} onClick={()=>setSelected(c.id)} style={{'--chest-color':c.color} as CSSProperties}>
      <ChestArt floor={c.floor}/><span><strong>{c.name}</strong><small>T{c.floor}+ equipment</small><b>{gemzLabel(c.cost)} GEMZ</b></span>
    </button>)}</div>}
    <ChestReveal key={`${chest.id}:${receipt?.number??0}`} chest={chest} receipt={receipt} reduced={reduced} play={play} onReveal={number=>{mutate(next=>revealChest(next,scope,number));}}/>
    {receipt?.revealed&&p.characters[receipt.friend]&&<LootComparison itemId={receipt.item} character={p.characters[receipt.friend]} recipient={recipient(receipt.friend)} onEquip={()=>{if(mutate(next=>equip(next,scope,receipt.friend,receipt.item))){play('select');if(receipt.friend===friendKey)refresh();}}}/>}
    {receipt&&<p className="rr-chest-recipient">{receipt.revealed?'Delivered to':'Opening for'} <strong>{recipient(receipt.friend)}</strong>. {pending?'Closing this window keeps the saved chest. Reopen to continue the reveal.':''}</p>}
    <div className="rr-chest-odds" aria-label={`${chest.name} odds`}>{chest.odds.map(o=><span key={o.tier}><b>T{o.tier}</b>{chanceLabel(o.chancePpm)}</span>)}</div>
    {!pending&&<>
      <p className="rr-chest-pitch">{chest.description}</p>
      <div className="rr-chest-buy"><button className="rr-primary" disabled={p.gemz<chest.cost} onClick={open}>Open chest · {gemzLabel(chest.cost)} GEMZ</button><span>{p.gemz<chest.cost?`${gemzLabel(chest.cost-gemzValue(p))} more GEMZ needed`:'One item guaranteed'}</span></div>
      <div className="rr-chest-progress"><i style={{width:Math.min(100,p.gemz/chest.cost*100)+'%'}}/></div>
      <p className="rr-muted">{chest.id==='overgrowth'?'About 2–3 base-entry level-one clears per chest. ':''}GEMZ spent here cannot also be submitted to the RF pot.</p>
    </>}
    <p className="rr-muted">Each slot has a 25% chance. Within the slot, each type is equally likely. Higher chests guarantee a higher minimum tier, not a specific weapon. Ordinary equipped items can be lost on death; soulbound weapons come from bosses.</p>
    <details className="rr-chest-math"><summary>Why are the higher chests more expensive?</summary>
      <p>T5 targets about 10,000× the expected GEMZ cost of a T1 item. Higher chests improve the odds per opening, with prices increasing alongside them.</p>
      <table><thead><tr><th>Chest</th><th>Price</th><th>T5 chance</th></tr></thead><tbody>{CHESTS.map(c=><tr key={c.id}><td>{c.name}</td><td>{gemzLabel(c.cost)}</td><td>{chanceLabel(c.odds.find(o=>o.tier===5)!.chancePpm)}</td></tr>)}</tbody></table>
      <p>Any T1 item: about {gemzLabel(Math.round(expectedTierCost(BASE_CHEST,1)))} GEMZ on average in the base chest. Any T5: about {gemzLabel(Math.round(expectedTierCost(chest,5)))} GEMZ on average in every chest. This is acquisition rarity, not damage, resale value or a guaranteed payout. There is no pity counter.</p>
    </details>
    <details className="rr-item-browser"><summary>Browse all 75 chest items</summary><ItemCatalog chestId={chest.id}/></details>
  </div>;
}
