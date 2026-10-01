import {gemzText} from './gemz.ts';
import {SOULBOUND_COLLECTIONS,FORTUNE_FANG_ID} from './soulbound.ts';
import {useState} from 'react';
import {GearIcon,PotionIcon} from './icons.tsx';
import {CHEST_GEAR,gearFor,gearLabel,SLOTS,TIERS,ITEM_TYPES,type Slot} from './gear.ts';
import {POTIONS,STATS,POTION_CAP,potionDrinks,potionEffect,potionName} from './potions.ts';
import {ENTRY_SPLIT,entryAllocation,redemptionPreview,consumePotion,contribute,ROUND_MS,totalContributed,fmtRF,type Economy} from './economy.ts';
import {BASE_CHEST,chestFor,type ChestId} from './chests.ts';
import {entryQuote,weaponRewardLabel,maxEntryMultiple,fortuneChanceBps} from './entry.ts';
import {EXPEDITION_CONCEPTS} from './expeditions.ts';
import {LEVELS,levelFor,gemzRangeLabel,clearGemzRange,type LevelId} from './levels.ts';
type Props={economy:Economy;scope:string;friendKey:string;mutate:(fn:(e:Economy)=>void)=>boolean;refresh:()=>void};

export function ItemCatalog({chestId='overgrowth'}:{chestId?:ChestId}){
  const [slot,setSlot]=useState<Slot>('weapon'),[tier,setTier]=useState(1);
  const chest=chestFor(chestId),chance=(chest.odds.find(o=>o.tier===tier)?.chancePpm??0)/10000/4/ITEM_TYPES.filter(t=>t.slot===slot).length;
  return <section aria-label="Chest item catalog" className="rr-catalog">
    <p>75 items · 15 types · five tiers. Higher tiers improve the same type’s strengths.</p>
    <div className="rr-tabs" aria-label="Catalog slot">{SLOTS.map(s=><button key={s} aria-pressed={slot===s} className={slot===s?'active':''} onClick={()=>setSlot(s)}>{s}</button>)}</div>
    <div className="rr-tier-tabs" aria-label="Catalog tier">{TIERS.map(t=><button key={t} aria-pressed={tier===t} className={tier===t?'active':''} onClick={()=>setTier(t)}>T{t}</button>)}</div>
    <p className="rr-muted">Each item below: {Number(chance.toPrecision(5))}% per {chest.name}. Stats shown before equipment and potion bonuses.</p>
    <div className="rr-gear-grid rr-catalog-grid">{CHEST_GEAR.filter(g=>g.slot===slot&&g.tier===tier).map(g=><article className="rr-gear-card" key={g.id}>
      <div className="rr-item-heading"><GearIcon gear={g} size={40}/><span className="rr-rarity">{gearLabel(g)}</span></div><strong>{g.name}</strong><span>{ITEM_TYPES.find(t=>t.type===g.itemType)!.label}</span><small>{g.detail}</small>
    </article>)}</div>
    {slot==='weapon'&&<p className="rr-muted">Weapons auto-aim at the nearest vulnerable enemy within reach. Swords and daggers sweep once through enemies in their arc; bows fire two parallel arrows.</p>}
    {slot==='ability'&&<p className="rr-muted">Q / Ability uses this item. Dash and Bash follow your movement direction; while stationary, they use your last direction. Space remains your separate dodge. Shield blocks one hit and cannot stack.</p>}
  </section>;
}
export function RedemptionPanel({economy,scope,mutate}:Props){
  const [amount,setAmount]=useState('100'),p=economy.accounts[scope],pool=economy.pool,total=totalContributed(economy),mine=pool.contributions[scope]??0;
  const n=Number(amount),valid=Number.isSafeInteger(n)&&n>0&&n<=p.gemz,current=redemptionPreview(economy,scope),preview=redemptionPreview(economy,scope,valid&&pool.rf>0?n:0);
  const left=Math.max(0,pool.closesAt-Date.now()),countdown=`${Math.floor(left/3600000)}h ${Math.floor(left%3600000/60000)}m ${Math.floor(left%60000/1000)}s`;
  return <>
    <div className="rr-pool-hero"><span className="rr-eyebrow">THE SHARED $RAREFRIENDS POT · 24-HOUR SEASON {pool.round}</span><strong>{fmtRF(pool.rf)} <small>RF</small></strong><p>Contribute this season. Collect RF when it ends.</p><span>Ends in <b>{countdown}</b> · every day at 00:00 UTC</span></div>
    <ol className="rr-pool-steps"><li><b>1</b> Earn GEMZ in any dungeon</li><li><b>2</b> Choose how much to submit</li><li><b>3</b> RF arrives when the season closes</li></ol>
    <p>GEMZ is internal game currency, like gold. Use it for chests or turn it in here for $RAREFRIENDS. One RF pool serves every level and player.</p>
    <div className="rr-facts"><span><b>{fmtRF(pool.rf)}</b>RF in pool</span><span><b>{total}</b>GEMZ contributed</span><span><b>{total?(mine/total*100).toFixed(2):'0'}%</b>your share</span></div>
    <p className="rr-season-window"><strong>{new Date(pool.closesAt-ROUND_MS).toLocaleString()} → {new Date(pool.closesAt).toLocaleString()}</strong><br/>24 hours · dates in your local time · one global pot across L1–L5.</p><p className="rr-muted">Settlement: {new Date(pool.closesAt).toLocaleString()} (your local time). Only GEMZ committed during this season counts toward this season’s payout. Previously earned GEMZ can be submitted, but contributions never roll into the next season. GEMZ submitted here cannot be withdrawn or spent on chests.</p>
    <p className="rr-muted">Available: {gemzText(p)} GEMZ. Submit whole GEMZ; any quarter-GEMZ remainder stays in your purse.</p>
    <label className="rr-amount-label">GEMZ to contribute<input type="number" min="1" step="1" max={p.gemz} value={amount} onChange={e=>setAmount(e.target.value)}/></label>
    <div className="rr-action-row"><button className="rr-primary" disabled={!valid||pool.rf===0} onClick={()=>mutate(next=>contribute(next,scope,n,Date.now()))}>Contribute GEMZ</button><button className="rr-text-button" disabled={!p.gemz} onClick={()=>setAmount(String(p.gemz))}>Use available ({p.gemz})</button></div>
    <p><strong>{mine} GEMZ committed · {fmtRF(current.rf)} RF estimated</strong></p>
    {valid&&pool.rf>0&&<div className="rr-quote" aria-live="polite"><span>AFTER ADDING {n} GEMZ</span><strong>{fmtRF(preview.rf)} RF estimated total</strong><small>{(preview.share*100).toFixed(2)}% of this season · {gemzText({...p,gemz:p.gemz-n})} GEMZ left for chests or later seasons</small></div>}
    <div className="rr-share-track" role="img" aria-label={`Your projected share: ${(preview.share*100).toFixed(2)} percent`}><i style={{width:`${preview.share*100}%`}}/></div><p className="rr-muted">Colored share: you · remainder: other contributors. This is a changing estimate, not a fixed exchange rate.</p>
    <p className="rr-muted">Your payout = all RF in the season × your contributed GEMZ ÷ total contributed GEMZ. Contributions are locked until settlement, then consumed. RF goes straight to your purse at settlement. Estimates change as entries fund the pool and others contribute. Unfunded seasons accept no contributions; seasons without contributors carry RF forward.</p>
    <p className="rr-muted">There is no fixed RF price per GEMZ. If you are the only contributor, you receive the entire season pool regardless of how many GEMZ you commit. Uncommitted GEMZ earn nothing.</p>
    {pool.last&&<p className="rr-notice" role="status">Season {pool.last.round} settled: {fmtRF(pool.last.rf)} RF distributed. Your payout: <strong>{fmtRF(pool.last.payouts[scope]??0)} RF</strong>.</p>}
    {(pool.history?.length||pool.last)&&<section className="rr-season-history" aria-label="Season payout history"><h3>Completed seasons</h3><table><thead><tr><th>Season / ended</th><th>RF pot paid</th><th>Your RF</th></tr></thead><tbody>{[...(pool.history??(pool.last?[pool.last]:[]))].reverse().map(result=><tr key={result.round}><td>Season {result.round}{result.endedAt&&<small>{new Date(result.endedAt).toLocaleString()}</small>}</td><td>{fmtRF(result.rf)}</td><td>{fmtRF(result.payouts[scope]??0)}</td></tr>)}</tbody></table></section>}
    <p className="rr-muted">Local playtest: seasons and RF payouts are simulated in this browser. If you return after a season ends, its payout is credited once when the game loads. Your level jackpots carry over independently.</p>
  </>;
}
export function PotionPanel({economy,scope,friendKey,mutate,refresh}:Props){
  const c=economy.accounts[scope].characters[friendKey];
  return <>
    <p>Build this Friend’s stats across successful runs. Stored potions have no quantity cap and survive death; consumed bonuses reset on defeat, including Genesis.</p>
    <div className="rr-potion-stats">{STATS.map(stat=><span key={stat}><b>{potionDrinks(c)[stat]} / {POTION_CAP}</b>{stat} potions<small>{potionEffect(stat,c.points[stat])}</small></span>)}</div>
    <p className="rr-muted">Start at 10 HP. A minor potion adds +5 max HP, +5% damage, +5 movement speed, or +5% attack rate. Major potions give twice the bonus. Each stat accepts 20 drinks per life, of either size. Twenty minor health potions add 100 HP; gear adds more. Bonuses are additive within each stat.</p>
    <div className="rr-potion-grid">{POTIONS.map(p=>{const count=c.potions[p.id]??'0';return <div className="rr-potion-card" key={p.id}><PotionIcon major={p.size==='major'}/><strong>{potionName(p.id)}</strong><small>{potionEffect(p.stat,p.points)} · stored <b>{count}</b></small><button className="rr-secondary" disabled={BigInt(count)===0n||potionDrinks(c)[p.stat]>=POTION_CAP} onClick={()=>{if(mutate(next=>consumePotion(next,scope,friendKey,p.id)))refresh();}}>Drink {p.size} {p.stat}</button></div>;})}</div>
    <table><thead><tr><th>Dungeon levels</th><th>Potion drops</th></tr></thead><tbody><tr><td>1–2</td><td>Minor (+5)</td></tr><tr><td>3–4</td><td>Minor / Major, 50% each</td></tr><tr><td>5</td><td>Major (+10)</td></tr></tbody></table>
    <p className="rr-muted">All five expeditions use these potion tables. Your stored potions survive defeat.</p>
  </>;
}
export function LootGuide({levelId=1,multiple=1,gemzBonusBps=0}:{levelId?:LevelId;multiple?:number;gemzBonusBps?:number}){
  const level=levelFor(levelId),q=entryQuote(levelId,multiple,gemzBonusBps),weapons=level.weaponIds.map(gearFor),collection=SOULBOUND_COLLECTIONS[levelId-1];
  const factor=multiple*(1+gemzBonusBps/10000),range=clearGemzRange(level),fortune=gearFor(FORTUNE_FANG_ID);
  return <>
    <p><strong>{level.boss} · {level.bossHP} HP</strong><br/>Clear three waves of {level.minionNames.join(', ')}. At half health, the boss shields and summons two guards. Defeat both to break the shield. {level.hint}</p>
    <div className="rr-facts"><span><b>{q.costRF.toLocaleString()} RF</b>entry · {multiple}×</span><span><b>{q.minGemz.toLocaleString()}–{q.maxGemz.toLocaleString()} GEMZ</b>full clear</span><span><b>0.25%</b>jackpot roll</span></div>
    {gemzBonusBps>0&&<p className="rr-notice">Fortune’s Fang equipped · all GEMZ figures include your +25% bonus.</p>}
    <p>Eleven minions drop {(level.monsterGemz*factor).toLocaleString()} GEMZ each. The boss drops {((range.min-level.minions*level.monsterGemz)*factor).toLocaleString()}–{((range.max-level.minions*level.monsterGemz)*factor).toLocaleString()} GEMZ, one potion, and a 20% chance of a second. Potion size: {level.potions}. Each stat has a 25% chance.</p>
    <h3>{collection.name} collection · L{levelId}</h3>
    <p>Four soulbound weapons. Each has a <strong>1.25% base drop chance</strong> at 1× entry: 5% for any regular weapon.</p>
    <div className="rr-gear-grid rr-soulbound-grid">{weapons.map(g=><article className="rr-gear-card" key={g.id}><GearIcon gear={g} size={56}/><span className="rr-rarity">{gearLabel(g)} · {g.family}</span><strong>{g.name}</strong><small>{g.detail}</small></article>)}</div>
    <p className="rr-muted">At your {multiple}× entry: {weaponRewardLabel(q)} ({q.boost.toFixed(2)}× regular weapon rewards). Each awarded regular weapon is chosen equally from the four above. Consecutive-hit effects require the same target within 1.25s. Chest odds and potion drops do not change. Soulbound weapons belong to the earning Friend and survive death.</p>
    {levelId===5&&<article className="rr-notice" aria-label="Fortune’s Fang special drop"><GearIcon gear={fortune} size={56}/><h3>Fortune’s Fang · extra L5 drop</h3><p><strong>{fortuneChanceBps(levelId,multiple)/100}% at {multiple}× entry</strong> · 0.25% base chance · independent of regular weapons and the jackpot.</p><p>{fortune.detail}</p></article>}
    <h3>Separate jackpot · {level.jackpot}</h3>
    <p>Each boss clear rolls 0.25% once, regardless of entry boost. A hit pays 80% of this level’s jackpot plus {level.jackpot}. The remaining 20% stays in that level’s pool. All weapon rewards and the jackpot can happen together.</p>
    <h3>Chest item catalog</h3><ItemCatalog/>
  </>;
}
export function EconomyGuide({economy,levelId=1,multiple=1,gemzBonusBps=0}:{economy:Economy;levelId?:LevelId;multiple?:number;gemzBonusBps?:number}){
  const level=levelFor(levelId),q=entryQuote(levelId,multiple,gemzBonusBps),cost=q.costRF*1_000_000;
  const funding=entryAllocation(cost),reserved=Object.values(economy.jackpots).reduce((n,v)=>n+v,0);
  return <>
    <p>Every {q.costRF.toLocaleString()} RF level-{level.id} entry funds these destinations immediately, including failed runs:</p>
    <div className="rr-split"><span><b>{ENTRY_SPLIT.redemption/100}%</b>Global redemption<small>{fmtRF(funding.redemption)} RF</small></span><span><b>{ENTRY_SPLIT.jackpot/100}%</b>Level jackpot<small>{fmtRF(funding.jackpot)} RF</small></span><span><b>{ENTRY_SPLIT.ecosystem/100}%</b>Ecosystem<small>{fmtRF(funding.ecosystem)} RF</small></span></div>
    <ol className="rr-cycle"><li><strong>Enter with RF</strong><span>{q.costRF.toLocaleString()} RF opens {level.name}. The fee funds the pools once.</span></li><li><strong>Fight for GEMZ</strong><span>{level.monsterGemz*multiple*(1+gemzBonusBps/10000)} per minion + a variable boss drop = {q.minGemz.toLocaleString()}–{q.maxGemz.toLocaleString()} per full clear, averaging {q.gemz.toLocaleString()}. Potions and rare soulbound weapons are extra rewards.</span></li><li><strong>Choose equipment or RF</strong><span>{BASE_CHEST.cost} GEMZ opens the base chest. Or commit GEMZ to the shared 24-hour season pot. The same GEMZ cannot fund both.</span></li><li><strong>Collect and return</strong><span>At settlement, contributed GEMZ are consumed and your pro-rata RF arrives in your purse. Use RF for your next run.</span></li></ol>
    <div className="rr-quote"><span>FIVE BASE LEVEL-ONE CLEARS · WITHOUT GEMZ BONUS</span><strong>500 RF spent → about 500 GEMZ earned</strong><small>Those entries fund 400 RF in redemption, 75 RF in the L1 jackpot, and 25 RF for the ecosystem. 500 GEMZ can buy two base chests or compete for a share of the current season pot.</small></div>
    <p>Entry boosts multiply GEMZ exactly and apply a slower logarithmic increase to regular boss weapons and Fortune’s Fang’s independent L5 drop chance. At 50× entry, weapon rewards are 20×. Excess chance becomes additional weapons. Potions, chest odds, enemy strength and jackpot odds stay the same.</p>
    <p><strong>Fortune’s Fang adds 25% GEMZ while equipped.</strong> This L5 soulbound dagger has a 0.25% base drop chance, boosted by entry. Its bonus applies to minions and bosses in every level, after the entry multiplier. It starts with the next expedition you enter wearing it. Quarter-GEMZ remainders are saved. Owning it in your backpack gives no bonus.</p>
    <p><strong>The jackpot is a separate boss-clear reward.</strong> Each clear rolls 0.25% once. A hit pays 80% of that level’s jackpot plus its special soulbound weapon; 20% carries forward. A failed run funds the jackpot but never rolls it.</p>
    <p><strong>95% is the player funding allocation, not a guaranteed RTP.</strong> Realized RF returns depend on contributions, boss clears, jackpot timing and reserves still in the pools. Equipment has no fixed RF redemption value.</p>
    <p>Every GEMZ contributed in one season has the same redemption value, regardless of where it came from. The five playable dungeons average 1 / 1.15 / 1.3 / 1.45 / 1.6 GEMZ per RF spent on a successful full clear, before equipment bonuses. These are initial playtest values.</p>
    <details className="rr-demo"><summary>World reward accounting</summary><table><tbody><tr><td>RF distributed through redemption</td><td>{fmtRF(economy.redemptionPaid)}</td></tr><tr><td>RF paid through jackpots</td><td>{fmtRF(economy.jackpotPaid)}</td></tr><tr><td>RF awaiting redemption</td><td>{fmtRF(economy.pool.rf)}</td></tr><tr><td>RF retained across level jackpots</td><td>{fmtRF(reserved)}</td></tr><tr><td>RF allocated to ecosystem</td><td>{fmtRF(economy.ecosystem)}</td></tr><tr><td>GEMZ consumed by chests and redemption</td><td>{economy.gemzBurned}</td></tr></tbody></table></details>
    <p className="rr-muted">Local simulation. New accounts receive 500 test RF. Pools are shared between accounts in this browser only. GEMZ is internal game currency, not a token. RF balances and settlement are simulated here; live RF transfers are not enabled.</p>
  </>;
}

export function ExpeditionGuide({selected,onSelect,canSelect}:{selected:LevelId;onSelect:(id:LevelId)=>void;canSelect:boolean}){
  return <>
    <p>One room. One boss. A new lesson at every depth.</p>
    <div className="rr-notice">All five expeditions are playable. Higher levels have stronger enemies and more GEMZ per RF. Gear recommendations are not entry gates. Balance is in playtest.</div>
    <div className="rr-expeditions">{LEVELS.map(level=>{const concept=EXPEDITION_CONCEPTS.find(c=>c.level===level.id);return <article className={'rr-expedition rr-region-'+level.color} key={level.id}>
      <div className="rr-expedition-heading"><span>0{level.id}</span><div><small>PLAYABLE · RECOMMENDED {level.gear} GEAR</small><h3>{level.name}</h3><p>{level.boss} · {level.bossHP} HP</p></div></div>
      <div className="rr-expedition-facts"><span><b>{level.entryRF} RF</b>entry</span><span><b>{gemzRangeLabel(level)} GEMZ</b>full clear</span><span><b>{level.gemz/level.entryRF}</b>GEMZ / RF (avg.)</span></div>
      <p className="rr-muted">Entry boost available: 1×–{maxEntryMultiple(level.id).toLocaleString()}×. Full-clear GEMZ scales exactly with your entry.</p><p>{concept?.arena??'An open meadow square. Dodge thorn rings and the Warden’s marked charge.'}</p><p><strong>Boss fight.</strong> {level.hint} Two guards must fall at half health.</p>
      <details><summary>Minions, loot & combat lesson</summary><p>{concept?.minions??level.minionNames.join(', ')}</p><p>{concept?.lesson}</p><p><strong>Potions:</strong> {level.potions}. One guaranteed; 20% chance of a second. Stat chosen equally.</p><p><strong>Rare weapons:</strong> {level.weapons.join(', ')} — 1.25% each at base entry; 5% for any regular weapon. These weapons are soulbound.</p>{level.id===5&&<p><strong>Extra special drop:</strong> Fortune’s Fang · 0.25% base chance, entry-boosted. Equip for +25% GEMZ in any expedition.</p>}<p><strong>Jackpot weapon:</strong> {level.jackpot}. Awarded on the separate 0.25% boss-clear jackpot hit.</p></details>
      <button className="rr-secondary" disabled={!canSelect} onClick={()=>onSelect(level.id)}>{selected===level.id?'Selected':'Select level '+level.id}</button>
    </article>;})}</div>
    <p className="rr-muted">Every entry retains the 80 / 15 / 5 split, one global redemption pool and a separate jackpot per level. GEMZ totals include the room and boss; they are not RF payout quotes. Chests start at {BASE_CHEST.cost} GEMZ, with three higher collections and minimum tiers T2, T3 and T4. Final encounter balance remains in playtest.</p>
  </>;
}
