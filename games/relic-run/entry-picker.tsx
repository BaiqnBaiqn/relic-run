import {entryQuote,weaponRewardLabel,fortuneChanceBps} from './entry.ts';
import {levelFor,type LevelId} from './levels.ts';

const fmt=(n:number)=>n.toLocaleString('en-US');
export function EntryPicker({levelId,multiple,gemzBonusBps=0,onChange,onDone}:{levelId:LevelId;multiple:number;gemzBonusBps?:number;onChange:(n:number)=>void;onDone:()=>void}){
  const q=entryQuote(levelId,multiple,gemzBonusBps),level=levelFor(levelId);
  const change=(n:number)=>{if(Number.isFinite(n))onChange(Math.max(1,Math.min(q.max,Math.round(n))));};
  return <section className="rr-entry-picker" aria-label="Expedition entry amount">
    <p>{level.name} starts at <strong>{fmt(level.entryRF)} RF</strong>. Increase the entry to earn more from the same fight. Enemy strength stays the same.</p>
    <label className="rr-amount-label">Entry multiple<input aria-label="Entry multiple" type="number" min={1} max={q.max} step={1} value={multiple} onChange={e=>change(Number(e.target.value))}/></label>
    <input aria-label="Entry boost slider" aria-valuetext={`${multiple} times entry`} type="range" min={0} max={1000} value={Math.round(Math.log(multiple)/Math.log(q.max)*1000)} onChange={e=>change(Math.exp(Number(e.target.value)/1000*Math.log(q.max)))}/>
    <div className="rr-entry-presets">{[...new Set([1,5,10,50,q.max])].map(n=><button key={n} aria-pressed={multiple===n} onClick={()=>change(n)}>{fmt(n)}×{n===q.max?' · MAX':''}</button>)}</div>
    <div className="rr-quote" aria-live="polite"><span>YOUR ENTRY · {fmt(multiple)}×</span><strong>{fmt(q.costRF)} RF</strong><small>{fmt(q.minGemz)}–{fmt(q.maxGemz)} GEMZ per full clear · average {fmt(q.gemz)}</small></div>
    {gemzBonusBps>0&&<p className="rr-notice">Fortune’s Fang equipped · +25% GEMZ included above, after your entry multiplier.</p>}
    <div className="rr-entry-rewards"><strong>{weaponRewardLabel(q)}</strong><span>{q.boost.toFixed(2)}× normal weapon rewards</span></div>
    <p>GEMZ scales exactly with your entry. Weapon rewards grow more slowly: 50× entry gives 20× loot. Above a 100% chance, you receive guaranteed weapons plus a roll for another. Each regular weapon is chosen equally from this boss’s four-weapon collection.</p>
    {levelId===5&&<p><strong>Fortune’s Fang: {fortuneChanceBps(levelId,multiple)/100}%</strong> on its own boss-clear roll (0.25% base). Your entry boosts this chance; its equipped GEMZ bonus stays at +25%.</p>}
    <p className="rr-muted">Potions remain one guaranteed, with a 20% chance of a second. The jackpot stays at 0.25%, rolled once after a boss clear. Entry still funds 80% global redemption, 15% this level’s jackpot and 5% ecosystem. Losing the fight keeps the fee spent; earned GEMZ stays yours.</p>
    <button className="rr-primary" onClick={onDone}>Use {fmt(multiple)}× entry</button>
  </section>;
}
