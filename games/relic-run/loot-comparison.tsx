import {gearFor,gearLabel,statsFor,weaponProfile} from './gear.ts';
import type {Character} from './economy.ts';
import {GearIcon} from './icons.tsx';

export function LootComparison({itemId,character,recipient,onEquip}:{itemId:number;character:Character;recipient:string;onEquip:()=>void}){
  const item=gearFor(itemId),current=gearFor(character.loadout[item.slot]),equipped=current.id===itemId;
  const before=statsFor(character.loadout,character.points),afterLoadout={...character.loadout,[item.slot]:itemId},after=statsFor(afterLoadout,character.points);
  const oldWeapon=weaponProfile(gearFor(character.loadout.weapon)),newWeapon=weaponProfile(gearFor(afterLoadout.weapon));
  const rows:[string,number,number,boolean,string][]=[
    ['Damage / hit',oldWeapon.damage*before.power,newWeapon.damage*after.power,true,''],
    ['Attack interval',oldWeapon.interval/before.attackRate,newWeapon.interval/after.attackRate,false,'s'],
    ['Weapon range',oldWeapon.range,newWeapon.range,true,''],
    ['Maximum HP',before.health,after.health,true,''],
    ['Defense',before.defense,after.defense,true,''],
    ['Movement speed',before.speed,after.speed,true,''],
    ['Ability cooldown',before.abilityCooldown,after.abilityCooldown,false,'s'],
  ];
  const changed=rows.filter(([,a,b])=>Math.abs(a-b)>.001),format=(n:number)=>Number(n.toFixed(2));
  return <section className="rr-loot-comparison" aria-label="Compare chest loot">
    <h3>{equipped?'Already equipped':`Compare ${item.slot}`} · {recipient}</h3>
    <div className="rr-compare-cards">{[{label:'Equipped now',gear:current},{label:'Chest treasure',gear:item}].map(({label,gear})=><article key={label}><small>{label}</small><GearIcon gear={gear} size={52}/><strong>{gear.name}</strong><span>{gearLabel(gear)}</span><p>{gear.detail}</p></article>)}</div>
    {!equipped&&changed.length>0&&<table><caption>Build changes, including this Friend’s potions</caption><thead><tr><th>Stat</th><th>Now</th><th>With loot</th></tr></thead><tbody>{changed.map(([label,a,b,higher,suffix])=><tr key={label}><td>{label}</td><td>{format(a)}{suffix}</td><td data-better={(b>a)===higher}>{format(b)}{suffix} <small>({b>a?'+':''}{format(b-a)}{suffix})</small></td></tr>)}</tbody></table>}
    {!equipped&&!changed.length&&<p>Build stats are unchanged. Compare the item effects above.</p>}
    <button className="rr-primary" disabled={equipped||!(character.inventory[itemId]>0)} onClick={onEquip}>{equipped?`Equipped to ${recipient}`:`Equip to ${recipient}`}</button>
    <small>The previous item stays in this Friend’s backpack.</small>
  </section>;
}
