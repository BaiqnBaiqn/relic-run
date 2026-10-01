// Quarter-GEMZ carries preserve the exact 25% bonus without rounding away
// small minion drops. Chests and redemption still spend whole GEMZ.
export type GemzAmount={gemz:number;gemzFraction?:number};
export const gemzValue=(value:GemzAmount)=>value.gemz+(value.gemzFraction??0)/4;
export const gemzText=(value:GemzAmount)=>gemzValue(value).toLocaleString('en-US',{maximumFractionDigits:2});
export function addGemzQuarters(value:GemzAmount,quarters:number){
  if(!Number.isSafeInteger(quarters)||quarters<0)throw new RangeError('Invalid GEMZ reward.');
  const total=(value.gemzFraction??0)+quarters;
  value.gemz+=Math.floor(total/4);value.gemzFraction=total%4;
}
