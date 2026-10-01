import test from 'node:test';
import assert from 'node:assert/strict';
import {makeRun,startRoom,enterBoss,step} from '../games/relic-run/engine.ts';
import {EMPTY_LOADOUT,statsFor} from '../games/relic-run/gear.ts';
import {project,unproject,screenDirection} from '../games/relic-run/camera.ts';
import {ARENA_BOUNDS} from '../games/relic-run/arena.ts';
const route=[[720,680],[760,300],[480,180],[200,300],[200,680],[480,760]];
// Regression locations where the old planter and crystal blocked movement.
const formerObstacles=[{x:260,y:330,w:38,h:44},{x:675,y:590,w:38,h:44}];
function fight(loadout=EMPTY_LOADOUT,seed=42){
  const s=makeRun(loadout,seed);startRoom(s);let point=0;
  for(let i=0;i<14000&&!['won','dead'].includes(s.phase);i++){
    if(s.phase==='door'){assert.equal(s.kills,9);enterBoss(s);point=0;}
    let [x,y]=route[point];if(Math.hypot(x-s.x,y-s.y)<16){point=(point+1)%route.length;[x,y]=route[point];}
    const d=Math.hypot(x-s.x,y-s.y);step(s,{x:(x-s.x)/d,y:(y-s.y)/d,dash:s.shots.some(b=>b.enemy&&Math.hypot(b.x-s.x,b.y-s.y)<70)||s.enemies.some(e=>Math.hypot(e.x-s.x,e.y-s.y)<e.r+50),ability:true},1/60);
  }return s;
}
test('camera maps screen-relative movement and reversible pointer targets',()=>{
  for(const [x,y] of route){const p=project(x,y),w=unproject(p.x,p.y);assert.ok(Math.abs(w.x-x)<1e-9);assert.ok(Math.abs(w.y-y)<1e-9);}
  const c=project(480,480),d=screenDirection(1,0),p=project(480+d.x,480+d.y);assert.ok(p.x>c.x);assert.ok(Math.abs(p.y-c.y)<1e-9);
});
test('level one is completable with starter gear; four-slot upgrades improve clear time',()=>{
  const s=fight(),again=fight(),strong=fight({weapon:205,ability:275,armor:295,ring:325});
  assert.equal(s.phase,'won');assert.equal(s.kills,12);assert.equal(s.defeated.length,12);assert.deepEqual(s,again);
  assert.equal(strong.phase,'won');assert.ok(strong.time<s.time);assert.equal(strong.maxHp,150);
});
test('ability cooldown, armor mitigation and ring bonuses change combat',()=>{
  const s=makeRun({weapon:0,ability:5,armor:9,ring:11});startRoom(s);s.hp=20;
  step(s,{x:0,y:0,dash:false,ability:true},1/60);assert.equal(s.hp,44);assert.ok(s.abilityCool>9);
  step(s,{x:0,y:0,dash:false,ability:true},1/60);assert.equal(s.hp,44);
  assert.equal(statsFor(s.loadout).defense,3);assert.equal(statsFor(s.loadout).speed,172);
});
test('boss requires room clear and the player can walk or dash through former obstacles',()=>{
  const s=makeRun();enterBoss(s);assert.equal(s.phase,'camp');startRoom(s);enterBoss(s);assert.equal(s.phase,'room');
  for(const b of formerObstacles)for(const dash of [false,true])for(const direction of [-1,1]){
    const run=makeRun();startRoom(run);run.waveDelay=999;
    run.x=direction===1?b.x-24:b.x+b.w+24;run.y=b.y+b.h/2;
    for(let i=0;i<60;i++)step(run,{x:direction,y:0,dash},1/60);
    assert.ok(direction===1?run.x-11>b.x+b.w:run.x+11<b.x,'the player should cross the cleared area');
  }
});

test('all enemies and boss charges cross the open arena while staying inside its edges',()=>{
  const idle={x:0,y:0,dash:false};
  for(const b of formerObstacles)for(const kind of ['slime','brute','archer','boss','charge']){
    const s=makeRun();s.phase='door';enterBoss(s);s.attack=999;
    const direction=b.x>480?-1:1,e=s.enemies[0];
    Object.assign(e,{kind:kind==='charge'?'boss':kind,x:direction===1?b.x-40:b.x+b.w+40,y:b.y+b.h/2,cool:999});
    s.x=b.x+direction*360;s.y=e.y;
    if(kind==='charge'){e.charge=.65;e.aim={x:direction,y:0};}
    for(let i=0;i<240;i++)step(s,idle,1/60);
    assert.ok(direction===1?e.x-e.r>b.x+b.w:e.x+e.r<b.x,`${kind} should cross the cleared area`);
  }
  const s=makeRun();s.phase='door';enterBoss(s);s.attack=999;
  const e=s.enemies[0];Object.assign(e,{x:ARENA_BOUNDS.right-e.r,y:480,charge:.65,aim:{x:1,y:0},cool:999});
  step(s,idle,1/30);assert.equal(e.x,ARENA_BOUNDS.right-e.r);
});

test('player and enemy shots cross the open arena and damage their targets',()=>{
  for(const b of formerObstacles)for(const enemy of [false,true]){
    const s=makeRun();s.phase='door';enterBoss(s);s.attack=999;s.invul=0;
    const e=s.enemies[0],left=b.x-45,right=b.x+b.w+45,y=b.y+b.h/2;
    Object.assign(e,{x:enemy?left:right,y,cool:999});s.x=enemy?right:left;s.y=y;
    s.shots=[{id:s.nextId++,x:left,y,vx:340,vy:0,life:3,damage:7,enemy,pierce:0,hit:[],r:4}];
    for(let i=0;i<60;i++)step(s,{x:0,y:0,dash:false},1/60);
    assert.equal(enemy?s.hp:e.hp,enemy?s.maxHp-7:e.maxHp-7);
    assert.equal(s.shots.length,0);
    s.shots=[{id:s.nextId++,x:ARENA_BOUNDS.right-1,y:480,vx:340,vy:0,life:3,damage:7,enemy,pierce:0,hit:[],r:4}];
    step(s,{x:0,y:0,dash:false},1/60);assert.equal(s.shots.length,0);
  }
});

test('the expanded square is traversable and all four edges stop a dash',()=>{
  const {left,top,right,bottom}=ARENA_BOUNDS;
  assert.equal(right-left,bottom-top);
  for(const [x,y,dx,dy] of [[left+11,480,-1,0],[right-11,480,1,0],[480,top+11,0,-1],[480,bottom-11,0,1]]){
    const s=makeRun();startRoom(s);s.x=x;s.y=y;
    step(s,{x:dx,y:dy,dash:true},1/30);assert.equal(s.x,x);assert.equal(s.y,y);
  }
  const s=makeRun();startRoom(s);s.x=820;s.y=820;
  step(s,{x:1,y:1,dash:false},1/30);assert.ok(s.x>820&&s.y>820);
});

test('Warden shields exactly once and potion dexterity increases attack rate',()=>{
  const s=makeRun();s.phase='door';enterBoss(s);const b=s.enemies[0];b.hp=b.maxHp/2+1;b.cool=999;s.x=b.x-80;s.y=b.y;
  s.shots=[{id:s.nextId++,x:b.x-10,y:b.y,vx:340,vy:0,life:2,damage:999,enemy:false,pierce:0,hit:[],r:4}];s.attack=999;
  step(s,{x:0,y:0,dash:false},1/60);
  assert.equal(b.hp,b.maxHp/2);assert.ok(b.shielded);assert.equal(s.enemies.filter(e=>e.summoned).length,2);
  s.shots=[{id:s.nextId++,x:b.x,y:b.y,vx:0,vy:0,life:2,damage:999,enemy:false,pierce:0,hit:[],r:4}];
  step(s,{x:0,y:0,dash:false},1/60);assert.equal(b.hp,b.maxHp/2);
  for(const e of s.enemies)if(e.summoned)e.hp=0;
  step(s,{x:0,y:0,dash:false},1/60);assert.equal(b.shielded,false);assert.equal(s.enemies.length,1);
  const boosted=makeRun(EMPTY_LOADOUT,1,{health:2,attack:3,speed:4,dexterity:5});
  assert.equal(boosted.maxHp,20);assert.equal(statsFor(boosted.loadout,boosted.points).attackRate,1.25);
  assert.equal(statsFor(boosted.loadout,boosted.points).power,1.15);
});
