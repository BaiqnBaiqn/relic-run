import type {Run,Enemy,Shot,Vec} from './engine.ts';
import type {Gear} from './gear.ts';

export type Dot={time:number;tick:number;damage:number};
export type WeaponState={attacks:number;lastAttack:number;comboTarget:number;comboHits:number;lastHit:number;heat:number;lastHeatAttack:number;fleetUntil:number;dodgeUntil:number};
export type FlameArc=Vec&{angle:number;range:number;arc:number;life:number;tick:number;damage:number};
type Hit=(enemy:Enemy,damage:number)=>void;
type Context={volley:number;arrow?:number;secondary?:boolean};
export const freshWeaponState=():WeaponState=>({attacks:0,lastAttack:-10,comboTarget:0,comboHits:0,lastHit:-10,heat:0,lastHeatAttack:-1,fleetUntil:0,dodgeUntil:0});
const vulnerable=(s:Run,e:Enemy)=>['room','boss'].includes(s.phase)&&e.hp>0&&!e.shielded&&!(e.spawnDelay&&e.spawnDelay>0);
function label(s:Run,e:Vec,text:string,color='#B3A0D8'){
  s.texts.push({x:e.x,y:e.y-10,text,life:.65,color});
  s.pulses.push({x:e.x,y:e.y,life:.3,duration:.3,radius:35});
}
function dot(e:Enemy,type:'burn'|'bleed',seconds:number,damage:number){
  e[type]={time:seconds,tick:e[type]?.tick??.5,damage:Math.max(e[type]?.damage??0,damage*.12*.5)};
}
function paired(s:Run,e:Enemy,ctx:Context){
  if(ctx.arrow===undefined||ctx.volley<0)return false;
  const prior=e.pairedShot;
  if(prior?.volley===ctx.volley&&prior.arrow!==ctx.arrow&&!prior.done){prior.done=true;return true;}
  if(prior?.volley!==ctx.volley)e.pairedShot={volley:ctx.volley,arrow:ctx.arrow,done:false};
  return false;
}
function combo(s:Run,e:Enemy){
  const w=s.weaponState;
  w.comboHits=w.comboTarget===e.id&&s.time-w.lastHit<=1.25?w.comboHits+1:1;
  w.comboTarget=e.id;w.lastHit=s.time;return w.comboHits;
}
export function weaponModifiers(s:Run){
  if(s.time-s.weaponState.lastHit>1.25)s.weaponState.heat=0;
  return {speed:s.weaponState.fleetUntil>s.time?1.15:1,rate:1+s.weaponState.heat*.04};
}
export function weaponAttack(s:Run,g:Gear,baseDamage:number){
  const w=s.weaponState;w.attacks++;
  let damage=baseDamage;
  if(g.perk==='dodge-strike'&&w.dodgeUntil>s.time){damage*=1.35;w.dodgeUntil=0;label(s,s,'TIDAL STRIKE','#7DB4DB');}
  if(g.perk==='third-strike'&&w.attacks%3===0){damage*=1.4;label(s,s,'GEODE BREAK');}
  if(g.perk==='charge'){
    const charge=Math.min(1,Math.max(0,s.time-w.lastAttack)/1.2);damage*=1+.35*charge;
    if(charge===1)label(s,s,'FULL CHARGE','#F2CE68');
  }
  w.lastAttack=s.time;
  const comet=g.perk==='comet'&&w.attacks%3===0;
  return {damage,pierce:comet?99:g.perk==='pierce'?1:0,comet,volley:w.attacks};
}
/** Secondary damage goes through normal shield/phase/death rules and never procs itself. */
export function weaponHit(s:Run,e:Enemy,damage:number,g:Gear,ctx:Context,hit:Hit){
  if(!vulnerable(s,e))return;
  if(ctx.secondary){hit(e,damage);return;}
  if(g.perk==='ember-pair'&&ctx.arrow===1&&e.burn&&e.burn.time>0)damage*=1.3;
  hit(e,damage);
  if(s.phase==='won'||s.phase==='dead')return;
  const alive=e.hp>0;
  switch(g.perk){
    case 'paired-slow':if(paired(s,e,ctx)&&alive&&e.kind!=='boss'){e.slowUntil=s.time+1.25;label(s,e,'SNARED','#B9D984');}break;
    case 'bleed':if(combo(s,e)%4===0&&alive){dot(e,'bleed',3,damage);label(s,e,'BLEED','#B9D984');}break;
    case 'splash':
      for(const other of [...s.enemies])if(other.id!==e.id&&Math.hypot(other.x-e.x,other.y-e.y)<=65)hit(other,damage*.25);
      s.pulses.push({x:e.x,y:e.y,life:.4,duration:.4,radius:65});break;
    case 'paired-burst':if(paired(s,e,ctx)){hit(e,damage*.5);label(s,e,'TIDE BURST','#7DB4DB');}break;
    case 'fleet':if(combo(s,e)>=2){s.weaponState.fleetUntil=s.time+1.5;}break;
    case 'shatter':if(combo(s,e)%5===0){hit(e,damage*.6);label(s,e,'SHATTER');}break;
    case 'burn':if(alive)dot(e,'burn',2,damage);break;
    case 'ember-pair':if(ctx.arrow===0&&alive)dot(e,'burn',2,damage);break;
    case 'heat':{
      const w=s.weaponState;
      if(ctx.volley!==w.lastHeatAttack){w.heat=Math.min(5,(s.time-w.lastHit<=1.25?w.heat:0)+1);w.lastHeatAttack=ctx.volley;}
      w.lastHit=s.time;break;
    }
    case 'eclipse':if(paired(s,e,ctx)&&alive){
      if((e.eclipseUntil??0)>s.time){e.eclipseUntil=0;hit(e,damage*.6);label(s,e,'ECLIPSE','#F2CE68');}
      else{e.eclipseUntil=s.time+5;label(s,e,'MARKED','#F2CE68');}
    }break;
    case 'spectral':if(combo(s,e)%6===0){hit(e,damage*.75);label(s,e,'SPECTRAL CUT','#F2CE68');}break;
  }
}
export function ricochet(s:Run,shot:Shot,g:Gear){
  if(g.perk!=='ricochet'||shot.ricochet)return false;
  const target=s.enemies.filter(e=>vulnerable(s,e)&&!shot.hit.includes(e.id)&&Math.hypot(e.x-shot.x,e.y-shot.y)<=180).sort((a,b)=>Math.hypot(a.x-shot.x,a.y-shot.y)-Math.hypot(b.x-shot.x,b.y-shot.y))[0];
  if(!target)return false;
  const angle=Math.atan2(target.y-shot.y,target.x-shot.x),speed=Math.hypot(shot.vx,shot.vy);
  shot.vx=Math.cos(angle)*speed;shot.vy=Math.sin(angle)*speed;shot.damage*=.5;shot.life=Math.min(shot.life,180/speed);shot.ricochet=true;
  return true;
}
export function inArc(p:Vec,r:number,arc:Pick<FlameArc,'x'|'y'|'angle'|'range'|'arc'>){
  const dx=p.x-arc.x,dy=p.y-arc.y,d=Math.hypot(dx,dy),delta=Math.atan2(Math.sin(Math.atan2(dy,dx)-arc.angle),Math.cos(Math.atan2(dy,dx)-arc.angle));
  return d<=arc.range+r&&(d<=r||Math.abs(delta)<=arc.arc*Math.PI/360+Math.asin(Math.min(1,r/d)));
}
export function tickWeaponEffects(s:Run,dt:number,hit:Hit){
  for(const e of [...s.enemies])for(const type of ['burn','bleed'] as const){
    const effect=e[type];if(!effect)continue;
    effect.time-=dt;effect.tick-=dt;
    if(effect.tick<=1e-8){hit(e,effect.damage);effect.tick+=.5;}
    if(effect.time<=1e-8||e.hp<=0)delete e[type];
  }
  for(const arc of s.flames){
    arc.life-=dt;arc.tick-=dt;
    if(arc.tick<=1e-8){for(const e of [...s.enemies])if(inArc(e,e.r,arc))hit(e,arc.damage);arc.tick+=.5;}
  }
  s.flames=s.flames.filter(f=>f.life>1e-8);
}
