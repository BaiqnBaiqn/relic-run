import test from 'node:test';
import assert from 'node:assert/strict';
import {makeRun,startRoom,enterBoss,step} from '../games/relic-run/engine.ts';
import {CHEST_GEAR,EMPTY_LOADOUT,statsFor,weaponProfile,gearFor} from '../games/relic-run/gear.ts';
import {ARENA_BOUNDS} from '../games/relic-run/arena.ts';
const idle={x:0,y:0,dash:false};
const item=(type,tier=1)=>CHEST_GEAR.find(g=>g.itemType===type&&g.tier===tier);
function setup(loadout={}){
  const s=makeRun({...EMPTY_LOADOUT,...loadout});startRoom(s);s.x=480;s.y=480;s.waveDelay=999;return s;
}
function foe(s,x,y){
  const e={id:s.nextId++,kind:'brute',x,y,hp:1000,maxHp:1000,r:8,cool:999,flash:0,windup:0,charge:0,aim:{x:0,y:1},pattern:0};s.enemies.push(e);return e;
}
test('wands have the longest range and large slow shots; bows fire exactly two damaging arrows',()=>{
  const wand=setup({weapon:item('wand').id}),bow=setup({weapon:item('bow').id});
  const we=foe(wand,780,480),be=foe(bow,780,480);
  step(wand,idle,1/60);step(bow,idle,1/60);
  assert.equal(wand.shots.length,1);assert.equal(bow.shots.length,2);
  assert.equal(wand.shots[0].visual,'orb');assert.equal(bow.shots[0].visual,'arrow');
  assert.ok(wand.shots[0].r>bow.shots[0].r);assert.ok(wand.attack>bow.attack);
  wand.attack=999;bow.attack=999;
  for(let i=0;i<60;i++){step(wand,idle,1/60);step(bow,idle,1/60);}
  assert.ok(Math.abs(we.hp-942.4)<1e-8);assert.ok(Math.abs(be.hp-942.4)<1e-8);
  for(const type of ['wand','bow','sword','dagger']){
    const s=setup({weapon:item(type).id});foe(s,880,480);step(s,idle,1/60);
    assert.equal(s.shots.length,type==='wand'?1:0);assert.equal(s.swings.length,0);
  }
});
test('swords and daggers make one short-range swipe, with different damage and attack speed',()=>{
  const states=['sword','dagger'].map(type=>{
    const s=setup({weapon:item(type).id}),front=foe(s,530,480),side=foe(s,535,496),back=foe(s,410,480),far=foe(s,640,480);
    step(s,idle,1/60);assert.equal(s.shots.length,0);assert.equal(s.swings.length,1);
    assert.ok(front.hp<1000&&side.hp<1000);assert.equal(back.hp,1000);assert.equal(far.hp,1000);
    const hp=front.hp;step(s,idle,1/60);assert.equal(front.hp,hp,'one swing only hits once');return {s,front};
  });
  assert.ok(states[0].front.hp<states[1].front.hp);assert.ok(states[0].s.attack>states[1].s.attack*3);
  for(let i=0;i<15;i++)for(const {s} of states)step(s,idle,1/60);
  assert.equal(states[0].front.hp,901);assert.equal(states[1].front.hp,946);
});
test('T1 sword and dagger builds can clear the Warden with close-range movement and charge dodges',()=>{
  for(const type of ['sword','dagger']){
    const s=makeRun({...EMPTY_LOADOUT,weapon:item(type).id,armor:301,ability:271},42);startRoom(s);
    for(let i=0;i<18000&&!['won','dead'].includes(s.phase);i++){
      if(s.phase==='door')enterBoss(s);
      const target=s.enemies.filter(e=>e.hp>0&&!e.shielded).sort((a,b)=>Math.hypot(a.x-s.x,a.y-s.y)-Math.hypot(b.x-s.x,b.y-s.y))[0];
      let x=0,y=0;
      if(target){
        const angle=Math.atan2(s.y-target.y,s.x-target.x)+.25,reach=type==='sword'?85:65;
        const dx=target.x+Math.cos(angle)*reach-s.x,dy=target.y+Math.sin(angle)*reach-s.y,d=Math.hypot(dx,dy)||1;x=dx/d;y=dy/d;
      }
      step(s,{x,y,dash:!!target&&(target.windup>0||target.charge>0),ability:true},1/60);
    }
    assert.equal(s.phase,'won',type);assert.equal(s.kills,12);assert.ok(s.hp>0);
  }
});
test('shield absorbs only one hit, does not stack, persists until hit, and respects cooldown',()=>{
  const s=setup({ability:item('shield').id});s.attack=999;
  step(s,{...idle,ability:true},1/60);assert.equal(s.shield,true);const cooldown=s.abilityCool;
  step(s,{...idle,ability:true},1/60);assert.ok(s.abilityCool<cooldown);
  s.abilityCool=0;step(s,{...idle,ability:true},1/60);assert.equal(s.abilityCool,0);
  for(let i=0;i<2;i++)s.shots.push({id:s.nextId++,x:s.x,y:s.y,vx:0,vy:0,life:1,damage:7,enemy:true,pierce:0,hit:[],r:4});
  step(s,idle,1/60);assert.equal(s.shield,false);assert.equal(s.hp,3);
});
test('dash follows current input or last facing, travels its tier distance, and respects arena edges',()=>{
  for(const tier of [1,5]){
    const ability=item('dash',tier),s=setup({ability:ability.id});
    step(s,{x:1,y:0,dash:false,ability:true},1/60);
    for(let i=0;i<11;i++)step(s,idle,1/60);
    assert.ok(Math.abs(s.x-(480+ability.strength))<1e-7);assert.equal(s.y,480);assert.equal(s.dashCool,0);
    assert.ok(s.abilityCool>0);const x=s.x;step(s,{...idle,ability:true},1/60);assert.ok(Math.abs(s.x-x)<1e-7);
    s.x=ARENA_BOUNDS.right-20;s.abilityCool=0;step(s,{...idle,ability:true},1/30);assert.equal(s.x,ARENA_BOUNDS.right-11);
  }
});
test('Bash damages the forward arc, scales with attack, and Heal cannot exceed maximum health',()=>{
  const s=setup({ability:item('bash').id,ring:item('attack',5).id});s.attack=999;
  const front=foe(s,590,480),side=foe(s,480,600),back=foe(s,370,480);
  step(s,{x:1,y:0,dash:false,ability:true},1/60);
  assert.equal(front.hp,685);assert.equal(side.hp,1000);assert.equal(back.hp,1000);assert.equal(s.swings[0].bash,true);
  step(s,{...idle,ability:true},1/60);assert.equal(front.hp,685);
  const healed=setup({ability:item('heal',5).id,ring:item('health',5).id});healed.hp=100;
  step(healed,{...idle,ability:true},1/60);assert.equal(healed.hp,110);assert.ok(healed.abilityCool>0);
});
test('every type improves by tier; armor and all four rings affect their intended stats',()=>{
  for(const type of ['wand','bow','sword','dagger']){
    const damage=[1,2,3,4,5].map(t=>{const g=item(type,t);return g.power*weaponProfile(g).damage;});
    for(let i=1;i<5;i++)assert.ok(damage[i]>damage[i-1]);
  }
  for(const type of ['dash','shield','bash','heal'])for(let tier=2;tier<=5;tier++)assert.ok(item(type,tier).cooldown<item(type,tier-1).cooldown);
  const stats=(slot,type,tier)=>statsFor({...EMPTY_LOADOUT,[slot]:item(type,tier).id});
  for(let tier=1;tier<=5;tier++){
    assert.equal(stats('ring','health',tier).health,10+tier*20);
    assert.equal(stats('ring','attack',tier).power,1+tier*.15);
    assert.equal(stats('ring','dexterity',tier).attackRate,1+tier*.15);
    assert.equal(stats('ring','speed',tier).speed,160+tier*15);
    assert.ok(stats('armor','heavy',tier).health>stats('armor','light',tier).health);
    assert.ok(stats('armor','heavy',tier).defense>stats('armor','light',tier).defense);
    assert.ok(stats('armor','light',tier).speed>stats('armor','heavy',tier).speed);
    assert.ok(stats('armor','robe',tier).abilityCooldown<statsFor(EMPTY_LOADOUT).abilityCooldown);
  }
  for(const id of [1,2,3,4,5,6,7,8,9,10,11,12])assert.equal(gearFor(id).legacy,true);
});
