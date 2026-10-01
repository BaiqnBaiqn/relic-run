import { gearFor,statsFor,weaponProfile,EMPTY_LOADOUT,type Loadout } from './gear.ts';
import {ARENA_SIZE,ARENA_BOUNDS,PLAYER_START,BOSS_START,SPAWN_POINTS} from './arena.ts';
import {EMPTY_POINTS,type StatPoints} from './potions.ts';
import {levelFor,type LevelId} from './levels.ts';
import {freshWeaponState,weaponAttack,weaponHit,weaponModifiers,ricochet,inArc,tickWeaponEffects,type WeaponState,type Dot,type FlameArc} from './weapon-effects.ts';
import {bossPattern,minionPattern,hazardHits,type Hazard} from './encounters.ts';
export const W = ARENA_SIZE, H = ARENA_SIZE;
export type Phase = 'camp'|'room'|'door'|'boss'|'won'|'dead';
export type Vec = {x:number;y:number};
export type Enemy = Vec & {id:number;kind:'slime'|'archer'|'brute'|'boss';hp:number;maxHp:number;r:number;cool:number;flash:number;windup:number;charge:number;aim:Vec;pattern:number;shielded?:boolean;summoned?:boolean;spawnDelay?:number;recovery?:number;guardTime?:number;slowUntil?:number;burn?:Dot;bleed?:Dot;pairedShot?:{volley:number;arrow:number;done:boolean};eclipseUntil?:number};
export type Shot = Vec & {id:number;vx:number;vy:number;life:number;damage:number;enemy:boolean;pierce:number;hit:number[];r:number;visual?:'orb'|'arrow';volley?:number;arrow?:number;ricochet?:boolean;comet?:boolean};
export type Swing = Vec & {angle:number;range:number;arc:number;life:number;bash:boolean};
export type Particle = Vec & {vx:number;vy:number;life:number;maxLife:number;color:string;size:number};
export type FloatText = Vec & {text:string;life:number;color:string};
export type Input = {x:number;y:number;dash:boolean;ability?:boolean};
export type Run = {
  level:LevelId;hazards:Hazard[];pulses:(Vec&{life:number;duration:number;radius:number})[];trail:(Vec&{life:number})[];
  phase:Phase;gearId:number;loadout:Loadout;seed:number;time:number;roomTime:number;bossTime:number;spawned:number;kills:number;
  hp:number;maxHp:number;x:number;y:number;facing:'left'|'right'|'up'|'down';moving:boolean;
  attack:number;invul:number;dashTime:number;dashCool:number;dashDir:Vec;orbitCool:number;
  enemies:Enemy[];shots:Shot[];particles:Particle[];texts:FloatText[];nextId:number;shake:number;
  event:'hit'|'kill'|'door'|'win'|'dead'|null;sounds:('attack'|'ability'|'dodge')[];
  abilityCool:number;abilityFlash:number;defeated:{id:number;boss:boolean;x:number;y:number}[];points:StatPoints;summoned:boolean;waveDelay:number;
  weaponState:WeaponState;flames:FlameArc[];shield:boolean;abilityDashTime:number;abilityDashDir:Vec;swings:Swing[];
};
export function makeRun(equipped:Loadout|number=EMPTY_LOADOUT,seed=1,points:StatPoints=EMPTY_POINTS,level:LevelId=1):Run {
  levelFor(level);
  const loadout=typeof equipped==='number'?{...EMPTY_LOADOUT,weapon:equipped}:{...equipped},stats=statsFor(loadout,points);
  return {level,hazards:[],pulses:[],trail:[],phase:'camp',gearId:loadout.weapon,loadout,seed,time:0,roomTime:0,bossTime:0,spawned:0,kills:0,hp:stats.health,maxHp:stats.health,
    ...PLAYER_START,facing:'up',moving:false,attack:0,invul:0,dashTime:0,dashCool:0,dashDir:{x:0,y:-1},orbitCool:0,
    enemies:[],shots:[],particles:[],texts:[],nextId:1,shake:0,event:null,sounds:[],abilityCool:0,abilityFlash:0,defeated:[],points:{...points},summoned:false,waveDelay:0,
    weaponState:freshWeaponState(),flames:[],shield:false,abilityDashTime:0,abilityDashDir:{x:0,y:-1},swings:[]};
}
export function random(s:Run) { s.seed = (Math.imul(s.seed,1664525)+1013904223)>>>0; return s.seed/4294967296; }
export function startRoom(s:Run) { if(s.phase==='camp') s.phase='room'; }
export function enterBoss(s:Run) {
  if(s.phase!=='door') return;
  const recovered=Math.min(s.maxHp-s.hp,Math.ceil(s.maxHp*.25));
  s.phase='boss';s.x=PLAYER_START.x;s.y=PLAYER_START.y;s.hp+=recovered;s.shots=[];s.enemies=[];s.flames=[];s.invul=1;s.swings=[];s.abilityDashTime=0;s.dashTime=0;
  const level=levelFor(s.level);s.hazards=[];
  s.enemies.push({id:s.nextId++,kind:'boss',...BOSS_START,hp:level.bossHP,maxHp:level.bossHP,r:29,cool:1.6,flash:0,windup:0,charge:0,aim:{x:0,y:1},pattern:0});
  s.texts.push({x:s.x,y:s.y-25,text:`+${recovered} HP`,life:1.3,color:'#b6de74'});
}
const clamp=(v:number,lo:number,hi:number)=>Math.max(lo,Math.min(hi,v));
const length=(x:number,y:number)=>Math.hypot(x,y);
function move(entity:Vec,dx:number,dy:number,r:number) {
  entity.x=clamp(entity.x+dx,ARENA_BOUNDS.left+r,ARENA_BOUNDS.right-r);
  entity.y=clamp(entity.y+dy,ARENA_BOUNDS.top+r,ARENA_BOUNDS.bottom-r);
}
function burst(s:Run,x:number,y:number,color:string,n=9) {
  for(let i=0;i<n;i++) {const angle=random(s)*Math.PI*2,speed=30+random(s)*90,life=.25+random(s)*.4;
    s.particles.push({x,y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,life,maxLife:life,color,size:2+random(s)*3});}
}
function hurt(s:Run,damage:number) {
  if(s.invul>0||s.phase==='won'||s.phase==='dead')return;
  if(s.shield){s.shield=false;s.texts.push({x:s.x,y:s.y-22,text:'BLOCKED',life:.7,color:'#111'});burst(s,s.x,s.y,'#111',12);return;}
  damage=Math.max(1,damage-statsFor(s.loadout).defense);
  s.hp=Math.max(0,s.hp-damage);s.invul=.8;s.shake=.18;s.event='hit';
  s.texts.push({x:s.x,y:s.y-22,text:`−${damage}`,life:.8,color:'#ff9e96'});burst(s,s.x,s.y,'#ff968a',8);
  if(s.hp===0){s.phase='dead';s.event='dead';}
}
function hit(s:Run,e:Enemy,damage:number) {
  if(e.hp<=0||(s.phase==='dead'||s.phase==='won')||e.shielded||(e.spawnDelay??0)>0)return;
  const threshold=e.maxHp/2;
  if(e.kind==='boss'&&!s.summoned&&e.hp-damage<=threshold){
    damage=Math.max(0,e.hp-threshold);s.summoned=true;e.shielded=true;e.charge=0;e.windup=0;e.cool=1.5;
    s.shots=[];s.hazards=[];s.flames=[];s.invul=Math.max(s.invul,1);
    const spots=[[e.x-180,e.y],[e.x+180,e.y],[e.x,e.y-180],[e.x,e.y+180]].map(([x,y])=>({x:clamp(x,85,875),y:clamp(y,85,875)})).sort((a,b)=>length(b.x-s.x,b.y-s.y)-length(a.x-s.x,a.y-s.y));
    const kind=s.level===2?'brute':s.level===3||s.level===5?'archer':'slime',hp=Math.round((kind==='brute'?44:kind==='archer'?27:21)*levelFor(s.level).hpScale);
    for(const spot of spots.slice(0,2))s.enemies.push({id:s.nextId++,kind,...spot,hp,maxHp:hp,r:kind==='brute'?16:12,cool:1,flash:0,windup:0,charge:0,aim:{x:0,y:1},pattern:0,summoned:true,spawnDelay:1});
    s.texts.push({x:e.x,y:e.y,text:levelFor(s.level).summon,life:2,color:'#111'});
  }
  e.hp=Math.max(0,e.hp-damage);e.flash=.09;
  s.pulses.push({x:e.x,y:e.y,life:.2,duration:.2,radius:22});
  s.texts.push({x:e.x,y:e.y-e.r,text:String(Math.round(damage)),life:.55,color:'#e6f4c6'});
  if(e.hp===0){s.kills++;s.event='kill';burst(s,e.x,e.y,e.kind==='boss'?'#ffd380':'#aaca87',e.kind==='boss'?38:10);
    s.defeated.push({id:e.id,boss:e.kind==='boss',x:e.x,y:e.y});
    s.pulses.push({x:e.x,y:e.y,life:.5,duration:.5,radius:e.kind==='boss'?180:55});
    if(e.kind==='boss'){s.phase='won';s.event='win';s.shots=[];s.hazards=[];s.flames=[];}}
}
function shoot(s:Run,x:number,y:number,angle:number,damage:number,enemy=false,pierce=0,speed=340) {
  s.shots.push({id:s.nextId++,x,y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,life:enemy?5:1.25,damage,enemy,pierce,hit:[],r:enemy?5:4});
}
function swipe(s:Run,angle:number,range:number,arc:number,damage:number,bash=false){
  s.swings.push({x:s.x,y:s.y,angle,range,arc,life:bash?.3:.18,bash});
  const shape={x:s.x,y:s.y,angle,range,arc},g=gearFor(s.gearId);
  for(const e of [...s.enemies])if(inArc(e,e.r,shape)){
    if(bash)hit(s,e,damage);else weaponHit(s,e,damage,g,{volley:s.weaponState.attacks},(target,amount)=>hit(s,target,amount));
  }
  if(!bash&&g.perk==='fire-sweep'&&['room','boss'].includes(s.phase))s.flames.push({...shape,life:1.5,tick:.5,damage:damage*.12});
}
function spawn(s:Run) {
  const spot=SPAWN_POINTS[s.spawned%4];const kind:Enemy['kind']=s.spawned%3===2?'archer':s.spawned%3===1?'brute':'slime';
  const hp=Math.round((kind==='brute'?44:kind==='archer'?27:21)*levelFor(s.level).hpScale);
  s.enemies.push({id:s.nextId++,x:spot[0]+(random(s)-.5)*24,y:spot[1]+(random(s)-.5)*20,kind,hp,maxHp:hp,r:kind==='brute'?16:12,cool:1+random(s),flash:0,windup:0,charge:0,aim:{x:0,y:1},pattern:0});
  s.spawned++;burst(s,spot[0],spot[1],'#6d9b86',10);
}
/** A deterministic, fixed-step combat simulation. No wallet, rewards or network access. */
export function step(s:Run,input:Input,dt:number) {
  if(!['room','boss'].includes(s.phase))return;
  dt=clamp(dt,0,1/30);s.time+=dt;s.event=null;s.sounds=[];tickWeaponEffects(s,dt,(e,damage)=>hit(s,e,damage));if(!['room','boss'].includes(s.phase))return;s.shake=Math.max(0,s.shake-dt);
  s.invul=Math.max(0,s.invul-dt);s.dashCool=Math.max(0,s.dashCool-dt);s.attack-=dt;s.orbitCool-=dt;
  s.abilityCool=Math.max(0,s.abilityCool-dt);s.abilityFlash=Math.max(0,s.abilityFlash-dt);
  for(const pulse of s.pulses)pulse.life-=dt;s.pulses=s.pulses.filter(p=>p.life>0);
  for(const ghost of s.trail)ghost.life-=dt;s.trail=s.trail.filter(p=>p.life>0);
  if(s.dashTime>0||s.abilityDashTime>0)s.trail.push({x:s.x,y:s.y,life:.22});
  for(const swing of s.swings)swing.life-=dt;s.swings=s.swings.filter(swing=>swing.life>0);
  if(s.phase==='room'){s.roomTime+=dt;if(s.enemies.length===0&&s.spawned<9){s.waveDelay-=dt;if(s.waveDelay<=0){for(let i=0;i<3;i++)spawn(s);s.waveDelay=1.2;}}}
  else s.bossTime+=dt;
  const gear=gearFor(s.gearId),stats=statsFor(s.loadout,s.points),modifiers=weaponModifiers(s),mag=length(input.x,input.y),ix=mag>0?input.x/Math.max(1,mag):0,iy=mag>0?input.y/Math.max(1,mag):0;
  s.moving=mag>.1;
  if(s.moving){s.dashDir={x:ix/(length(ix,iy)||1),y:iy/(length(ix,iy)||1)};s.facing=Math.abs(ix)>Math.abs(iy)?ix>0?'right':'left':iy>0?'down':'up';}
  if(input.ability&&s.abilityCool<=0&&!(stats.ability.ability==='shield'&&s.shield)){
    const ability=stats.ability;s.abilityCool=stats.abilityCooldown;s.abilityFlash=.45;s.sounds.push('ability');
    if(ability.ability==='heal'){const restored=Math.min(s.maxHp-s.hp,ability.strength??0);s.hp+=restored;s.texts.push({x:s.x,y:s.y-15,text:`+${restored} HP`,life:1,color:'#111'});}
    else if(ability.ability==='shield')s.shield=true;
    else if(ability.ability==='dash'){s.abilityDashTime=.2;s.abilityDashDir={...s.dashDir};s.dashTime=0;}
    else if(ability.ability==='bash')swipe(s,Math.atan2(s.dashDir.y,s.dashDir.x),ability.range??155,120,(ability.strength??100)*stats.attackBonus,true);
    else if(ability.ability==='ward')s.invul=Math.max(s.invul,ability.strength??0);
    else for(const e of s.enemies)if(length(e.x-s.x,e.y-s.y)<150)hit(s,e,ability.strength??18);
    burst(s,s.x,s.y,'#111',16);
  }
  if(input.dash && s.dashCool<=0&&s.abilityDashTime<=0){s.weaponState.dodgeUntil=s.time+1.2;s.dashTime=.18;s.dashCool=2.4;s.invul=Math.max(s.invul,.4);burst(s,s.x,s.y,'#d7f89a',6);}
  if(s.abilityDashTime>0){const distance=(stats.ability.strength??150)/.2*Math.min(dt,s.abilityDashTime);move(s,s.abilityDashDir.x*distance,s.abilityDashDir.y*distance,11);s.abilityDashTime=Math.max(0,s.abilityDashTime-dt);}
  else if(s.dashTime>0){move(s,s.dashDir.x*470*dt,s.dashDir.y*470*dt,11);s.dashTime-=dt;}
  else move(s,ix*stats.speed*modifiers.speed*dt,iy*stats.speed*modifiers.speed*dt,11);
  const target=s.enemies.filter(e=>e.hp>0&&!e.shielded&&!(e.spawnDelay&&e.spawnDelay>0)).sort((a,b)=>length(a.x-s.x,a.y-s.y)-length(b.x-s.x,b.y-s.y))[0];
  const profile=weaponProfile(gear);
  if(target && s.attack<=0 && length(target.x-s.x,target.y-s.y)<profile.range+(profile.arc?target.r:0)){
    const angle=Math.atan2(target.y-s.y,target.x-s.x),attack=weaponAttack(s,gear,profile.damage*stats.power),damage=attack.damage;
    if(profile.arc)swipe(s,angle,profile.range,gear.perk==='wide-sweep'?140:profile.arc,damage);
    else if(gear.family==='wand'||gear.family==='bow'){
      for(let i=0;i<profile.shots;i++){
        const offset=profile.shots===2?(i===0?-6:6):0;
        s.shots.push({id:s.nextId++,x:s.x-Math.sin(angle)*offset,y:s.y+Math.cos(angle)*offset,
          vx:Math.cos(angle)*profile.speed,vy:Math.sin(angle)*profile.speed,life:profile.range/profile.speed,
          damage,enemy:false,pierce:attack.pierce,hit:[],r:profile.radius,volley:attack.volley,arrow:i,comet:attack.comet,visual:gear.family==='bow'?'arrow':'orb'});
      }
    }else if(gear.family==='fan')for(const offset of [-.23,0,.23])shoot(s,s.x,s.y,angle+offset,damage*.62);
    else shoot(s,s.x,s.y,angle,damage, false,gear.id>0&&gear.family==='bolt'?1:0);
    s.attack=profile.interval/(stats.attackRate*modifiers.rate);s.sounds.push('attack');
  }
  if(gear.family==='orbit' && s.orbitCool<=0){
    for(let i=0;i<3;i++){const a=s.time*3+i*Math.PI*2/3,ox=s.x+Math.cos(a)*42,oy=s.y+Math.sin(a)*42;
      for(const e of s.enemies)if(length(e.x-ox,e.y-oy)<e.r+12)hit(s,e,14*stats.power);}
    s.orbitCool=.19/stats.attackRate;
  }
  for(const e of s.enemies){
    if(e.hp<=0)continue;e.cool-=dt;e.flash=Math.max(0,e.flash-dt);
    if((e.spawnDelay??0)>0){e.spawnDelay=Math.max(0,e.spawnDelay!-dt);continue;}
    if(e.guardTime&&e.guardTime>0){e.guardTime-=dt;if(e.guardTime<=0)e.shielded=false;else continue;}
    if(e.shielded&&e.kind==='boss'){if(s.enemies.some(m=>m.summoned&&m.hp>0))continue;e.shielded=false;e.cool=1.5;s.hazards=[];s.shots=[];}
    const slow=e.kind!=='boss'&&(e.slowUntil??0)>s.time?.7:1;
    const moveEnemy=(v:Vec,dx:number,dy:number,r:number)=>move(v,dx*slow,dy*slow,r);
    const d=length(s.x-e.x,s.y-e.y)||1,ux=(s.x-e.x)/d,uy=(s.y-e.y)/d;
    if(e.kind==='boss'&&s.level>1){
      e.recovery=Math.max(0,(e.recovery??0)-dt);
      if(e.recovery===0&&d>135)moveEnemy(e,ux*(s.level===2?36:26)*dt,uy*(s.level===2?36:26)*dt,e.r);
      if(e.cool<=0)bossPattern(s,e);
    }else if(e.kind!=='boss'&&s.level>1){minionPattern(s,e,dt,moveEnemy);}
    else if(e.kind==='boss'){
      if(e.windup>0){e.windup-=dt;if(e.windup<=0){e.charge=.65;e.cool=2.7;}}
      else if(e.charge>0){moveEnemy(e,e.aim.x*330*dt,e.aim.y*330*dt,e.r);e.charge-=dt;}
      else {
        if(d>170)moveEnemy(e,ux*34*dt,uy*34*dt,e.r);
        if(e.cool<=0){
          if(e.pattern%2===0){
            const enraged=e.hp<e.maxHp*.5;
            for(let i=0;i<10;i++)shoot(s,e.x,e.y,i*Math.PI/5+s.bossTime*.2,levelFor(1).damage,true,0,enraged?175:155);
            if(enraged)for(const offset of [-.28,0,.28])shoot(s,e.x,e.y,Math.atan2(uy,ux)+offset,levelFor(1).damage,true,0,190);
            e.cool=enraged?1.5:2;
          }
          else{e.windup=.9;e.aim={x:ux,y:uy};}
          e.pattern++;
        }
      }
    }else if(e.kind==='archer'){
      if(d>185)moveEnemy(e,ux*44*dt,uy*44*dt,e.r);else if(d<95)moveEnemy(e,-ux*34*dt,-uy*34*dt,e.r);
      if(e.cool<=.6)e.flash=.08;
      if(e.cool<=0){shoot(s,e.x,e.y,Math.atan2(uy,ux),3,true,0,180);e.cool=2;}
    }else moveEnemy(e,ux*(e.kind==='brute'?60:90)*dt,uy*(e.kind==='brute'?60:90)*dt,e.r);
    if(length(e.x-s.x,e.y-s.y)<e.r+10)hurt(s,Math.ceil(levelFor(s.level).damage*(e.kind==='boss'?1.5:e.kind==='brute'?1.25:.8)));
  }
  for(const h of s.hazards){
    h.age+=dt;
    if(h.delay>0)h.delay=Math.max(0,h.delay-dt);
    else {h.duration-=dt;h.x+=h.vx*dt;h.y+=h.vy*dt;if((!h.hit||h.kind==='heat')&&s.invul<=0&&hazardHits(h,s)){hurt(s,h.damage);h.hit=true;}}
  }
  s.hazards=s.hazards.filter(h=>h.duration>0);
  for(const shot of s.shots){
    shot.life-=dt;shot.x+=shot.vx*dt;shot.y+=shot.vy*dt;
    if(shot.x<ARENA_BOUNDS.left||shot.x>ARENA_BOUNDS.right||shot.y<ARENA_BOUNDS.top||shot.y>ARENA_BOUNDS.bottom)shot.life=0;
    if(shot.life<=0)continue;
    if(shot.enemy){if(length(shot.x-s.x,shot.y-s.y)<shot.r+10){hurt(s,shot.damage);shot.life=0;}}
    else for(const e of s.enemies){if(e.hp>0&&!shot.hit.includes(e.id)&&length(shot.x-e.x,shot.y-e.y)<e.r+shot.r){
      weaponHit(s,e,shot.damage,gear,{volley:shot.volley??-1,arrow:shot.arrow,secondary:shot.ricochet},(target,amount)=>hit(s,target,amount));shot.hit.push(e.id);if(ricochet(s,shot,gear))break;shot.pierce--;if(shot.pierce<0){shot.life=0;break;}}}
  }
  s.shots=s.shots.filter(b=>b.life>0);s.enemies=s.enemies.filter(e=>e.hp>0);
  for(const p of s.particles){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.96;p.vy*=.96;}
  s.particles=s.particles.filter(p=>p.life>0);
  for(const t of s.texts){t.life-=dt;t.y-=18*dt;}s.texts=s.texts.filter(t=>t.life>0);
  if(s.phase==='room'&&s.spawned===9&&s.enemies.length===0){s.phase='door';s.event='door';s.shots=[];s.hazards=[];s.flames=[];}
}
