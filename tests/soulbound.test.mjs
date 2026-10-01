import test from 'node:test';
import assert from 'node:assert/strict';
import {SOULBOUND_COLLECTIONS,FORTUNE_FANG_ID} from '../games/relic-run/soulbound.ts';
import {COLLECTION_GEAR,GEAR,gearFor,EMPTY_LOADOUT,weaponProfile,statsFor} from '../games/relic-run/gear.ts';
import {LEVELS} from '../games/relic-run/levels.ts';
import {entryQuote,fortuneChanceBps,maxEntryMultiple} from '../games/relic-run/entry.ts';
import {createEconomy,character,addTestRF,beginEntry,creditKill,finishVictory,finishDeath,equip,validateEconomy,openChest,contribute,settleRound,RF} from '../games/relic-run/economy.ts';
import {gemzValue,gemzText} from '../games/relic-run/gemz.ts';
import {recoverAbandoned} from '../games/relic-run/storage.ts';
import {makeRun,startRoom,enterBoss,step} from '../games/relic-run/engine.ts';
import {weaponAttack,weaponHit,weaponModifiers,tickWeaponEffects,ricochet} from '../games/relic-run/weapon-effects.ts';

const rolls={weapon:9999,extraWeapons:[9999,9999,9999,9999],fortune:9999,bonusPotion:9999,size:0,stat:0,secondSize:0,secondStat:0,gemz:5000};
const idle={x:0,y:0,dash:false};
const near=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-7,`${actual} ≠ ${expected}`);
function world(level=5,multiple=1,equipped=false){
  const e=createEconomy(0),c=character(e,'p','friend');
  if(equipped){c.inventory[FORTUNE_FANG_ID]=1;equip(e,'p','friend',FORTUNE_FANG_ID);}
  addTestRF(e,'p',entryQuote(level,multiple).costRF);
  const id=beginEntry(e,'p','friend',1,level,multiple);return {e,c,id,p:e.accounts.p};
}
function minions(e,id){for(let i=1;i<=11;i++)creditKill(e,'p',id,i,false,rolls);}
function arena(id){const s=makeRun(id);startRoom(s);s.x=400;s.y=400;s.waveDelay=999;s.invul=999;return s;}
function foe(s,x=450,y=400){const e={id:s.nextId++,kind:'brute',x,y,hp:10000,maxHp:10000,r:8,cool:999,flash:0,windup:0,charge:0,aim:{x:0,y:1},pattern:0};s.enemies.push(e);return e;}
const rawHit=(s)=>(e,damage)=>{if(e.hp>0&&!e.shielded&&!e.spawnDelay&&['room','boss'].includes(s.phase))e.hp=Math.max(0,e.hp-damage);};
const strike=(s,e,g,damage=100,ctx={volley:1})=>weaponHit(s,e,damage,gearFor(g),ctx,rawHit(s));

test('five collections contain one weapon per family, distinct effects, correct tiers, and keep all historical IDs',()=>{
  assert.equal(COLLECTION_GEAR.length,20);assert.equal(new Set(GEAR.map(g=>g.id)).size,GEAR.length);
  for(const l of LEVELS){
    const set=COLLECTION_GEAR.filter(g=>g.tier===l.id);
    assert.deepEqual(set.map(g=>g.family),['wand','bow','sword','dagger']);assert.deepEqual(set.map(g=>g.id),l.weaponIds);
    assert.ok(set.every(g=>g.soulbound&&g.perk&&g.collection===SOULBOUND_COLLECTIONS[l.id-1].name));
    assert.ok(!l.weaponIds.includes(l.jackpotWeapon));
    for(let n=1;n<=3;n++){const old=100+(l.id-1)*10+n;assert.equal(gearFor(old).id,old);assert.ok(gearFor(old).legacy);}
  }
  assert.equal(gearFor(FORTUNE_FANG_ID).family,'dagger');assert.equal(gearFor(FORTUNE_FANG_ID).tier,5);
});

test('Fortune’s Fang is an independent L5 boss drop: exact 0.25% base, 5% at 50×, logarithmic maximum',()=>{
  for(const [m,chance] of [[1,25],[50,500],[maxEntryMultiple(5),fortuneChanceBps(5,maxEntryMultiple(5))]]){
    const {e,id}=world(5,m);minions(e,id);let hits=0;
    for(let r=0;r<10000;r++){
      const copy=structuredClone(e);creditKill(copy,'p',id,12,true,{...rolls,fortune:r});
      if(copy.accounts.p.active.items.includes(FORTUNE_FANG_ID))hits++;
    }
    assert.equal(hits,chance);assert.ok(chance<10000);
  }
  for(const l of LEVELS.filter(l=>l.id!==5)){
    const {e,id,p}=world(l.id,maxEntryMultiple(l.id));minions(e,id);creditKill(e,'p',id,12,true,{...rolls,fortune:0});
    assert.ok(!p.active.items.includes(FORTUNE_FANG_ID));
  }
  const {e,id,p}=world();creditKill(e,'p',id,1,false,{...rolls,fortune:0});assert.deepEqual(p.active.items,[]);
  for(let i=2;i<=11;i++)creditKill(e,'p',id,i,false,rolls);
  creditKill(e,'p',id,12,true,{...rolls,fortune:0,weapon:0});finishVictory(e,'p',id,30,0);
  assert.deepEqual(p.active.items,[441,449,144]);assert.equal(p.active.gemz,2560,'new drop does not retroactively increase GEMZ');
  const saved=structuredClone(e);creditKill(e,'p',id,12,true,{...rolls,fortune:0});finishVictory(e,'p',id,30,0);assert.deepEqual(e,saved);assert.ok(validateEconomy(e));
});

test('equipped Fang multiplies every reward and entry quote by exactly 1.25 at every level and entry cap',()=>{
  for(const l of LEVELS)for(const m of [1,50,maxEntryMultiple(l.id)]){
    const {e,id,p}=world(l.id,m,true),q=entryQuote(l.id,m,2500);
    assert.equal(p.active.gemzBonusBps,2500);assert.equal(creditKill(e,'p',id,1,false,rolls),l.monsterGemz*m*1.25);
    for(let n=2;n<=11;n++)creditKill(e,'p',id,n,false,rolls);
    creditKill(e,'p',id,12,true,rolls);finishVictory(e,'p',id,30,9999);
    assert.equal(gemzValue(p.active),q.gemz);assert.equal(gemzValue(p),q.gemz);
    assert.equal(e.pool.rf,q.costRF*RF*.8);assert.equal(p.active.potions.length,1);assert.equal(p.active.jackpot,0);
    assert.ok(validateEconomy(JSON.parse(JSON.stringify(e))));
  }
});

test('Fang bonus belongs to the equipped Friend, survives death/reload, and preserves quarters through spending',()=>{
  const {e,c,id,p}=world(1,1,true);
  assert.equal(creditKill(e,'p',id,1,false,rolls),3.75);assert.equal(gemzText(p),'3.75');
  assert.throws(()=>equip(e,'p','friend',0),/camp/);
  const restored=JSON.parse(JSON.stringify(e));recoverAbandoned(restored,'p',2);
  const rp=restored.accounts.p,rc=rp.characters.friend;assert.equal(gemzValue(rp),3.75);assert.equal(rc.inventory[449],1);assert.equal(rc.loadout.weapon,449);assert.ok(rc.lockedUntil>2);
  assert.throws(()=>equip(restored,'p','another',449),/own/);assert.ok(validateEconomy(restored));
  finishDeath(e,'p',id,2);c.lockedUntil=0;
  equip(e,'p','friend',0);let next=beginEntry(e,'p','friend',3);assert.equal(p.active.gemzBonusBps,0);assert.equal(creditKill(e,'p',next,1,false,rolls),3);finishDeath(e,'p',next,4);c.lockedUntil=0;
  equip(e,'p','friend',449);addTestRF(e,'p',1000);
  for(let run=0;run<4;run++){next=beginEntry(e,'p','friend',5);minions(e,next);creditKill(e,'p',next,12,true,rolls);finishVictory(e,'p',next,30,9999);}
  assert.equal(gemzValue(p),506.75);openChest(e,'p','friend',0,0,0);assert.equal(gemzValue(p),256.75);
  contribute(e,'p',256,6);settleRound(e,e.pool.closesAt);assert.equal(gemzValue(p),.75);assert.ok(validateEconomy(e));
  const corrupted=structuredClone(e);corrupted.accounts.p.gemzFraction=4;assert.equal(validateEconomy(corrupted),false);
  const missing=structuredClone(e);delete missing.gemzMintedFraction;assert.equal(validateEconomy(missing),false);
});

test('piercing wands, paired bows, comet shots and ricochets travel and hit through the engine',()=>{
  for(const id of [401,422,441,421]){
    const s=arena(id),a=foe(s,490,400),b=foe(s,555,400),c=foe(s,620,400);
    if(id===441)s.weaponState.attacks=2;
    step(s,idle,1/60);assert.equal(s.shots.length,id===422?2:1);
    assert.equal(s.shots[0].pierce,id===441?99:id===421?0:1);assert.equal(s.shots[0].comet,id===441);
    s.attack=999;
    for(let t=0;t<55;t++){step(s,idle,1/60);a.x=490;b.x=555;c.x=620;}
    const damage=weaponProfile(gearFor(id)).damage*statsFor(s.loadout).power*(id===422?2:1);
    near(10000-a.hp,damage);near(10000-b.hp,id===421?damage*.5:damage);near(10000-c.hp,id===441?damage:0);
  }
  const s=arena(421),e=foe(s,500,400),shot={x:450,y:400,vx:360,vy:0,life:.1,damage:100,hit:[]};
  assert.ok(ricochet(s,shot,gearFor(421)));assert.equal(shot.life,.1,'bounce cannot extend remaining range');assert.equal(shot.damage,50);assert.equal(ricochet(s,shot,gearFor(421)),false);
});

test('paired effects require two different arrows in the same volley; bosses resist slow',()=>{
  for(const id of [402,412,442]){
    const s=arena(id),e=foe(s);
    strike(s,e,id,100,{volley:1,arrow:0});strike(s,e,id,100,{volley:2,arrow:1});
    assert.equal(e.slowUntil,undefined);assert.equal(e.eclipseUntil,undefined);near(e.hp,9800);
    strike(s,e,id,100,{volley:2,arrow:0});
    if(id===402)assert.equal(e.slowUntil,1.25);
    if(id===412)near(e.hp,9650);
    if(id===442){assert.equal(e.eclipseUntil,5);strike(s,e,id,100,{volley:3,arrow:0});strike(s,e,id,100,{volley:3,arrow:1});near(e.hp,9440);assert.equal(e.eclipseUntil,0);}
    const boss=foe(s);boss.kind='boss';strike(s,boss,402,100,{volley:7,arrow:0});strike(s,boss,402,100,{volley:7,arrow:1});assert.equal(boss.slowUntil,undefined);
  }
  const s=arena(402),e=foe(s);e.slowUntil=10;s.attack=999;step(s,idle,1/60);near(e.x,450-60/60*.7);
});

test('consecutive dagger procs reset on target switches and delays, and secondary effects cannot recurse',()=>{
  for(const [id,count,extra] of [[404,4,36],[424,5,60],[444,6,75]]){
    const s=arena(id),e=foe(s),other=foe(s);
    for(let i=0;i<count;i++){s.time+=.2;strike(s,e,id);}
    if(id===404){assert.ok(e.bleed);for(let i=0;i<180;i++)tickWeaponEffects(s,1/60,rawHit(s));}
    near(10000-e.hp,count*100+extra);
    strike(s,other,id);assert.equal(s.weaponState.comboHits,1);s.time+=1.3;strike(s,other,id);assert.equal(s.weaponState.comboHits,1);
    const before=s.weaponState.comboHits;strike(s,other,id,50,{volley:2,secondary:true});assert.equal(s.weaponState.comboHits,before);
  }
  const fleet=arena(414),e=foe(fleet);strike(fleet,e,414);assert.equal(weaponModifiers(fleet).speed,1);strike(fleet,e,414);assert.equal(weaponModifiers(fleet).speed,1.15);fleet.time=2;assert.equal(weaponModifiers(fleet).speed,1);
});

test('splash, burn and ember pairing deal their specified damage and refresh rather than stack DOTs',()=>{
  const splash=arena(411),a=foe(splash),b=foe(splash,480,410),far=foe(splash,600,400),shield=foe(splash,470,400);shield.shielded=true;
  strike(splash,a,411);near(a.hp,9900);near(b.hp,9975);near(far.hp,10000);near(shield.hp,10000);
  for(const id of [431,432]){
    const s=arena(id),e=foe(s);strike(s,e,id,100,{volley:1,arrow:0});assert.ok(e.burn);
    if(id===432){strike(s,e,id,100,{volley:1,arrow:1});near(e.hp,9770);}
    const before=e.hp;for(let i=0;i<120;i++)tickWeaponEffects(s,1/60,rawHit(s));near(before-e.hp,24);assert.equal(e.burn,undefined);
    strike(s,e,id,100,{volley:2,arrow:0});tickWeaponEffects(s,.25,rawHit(s));strike(s,e,id,100,{volley:3,arrow:0});const hp=e.hp;tickWeaponEffects(s,.25,rawHit(s));near(hp-e.hp,6,'refresh preserves next tick');
  }
});

test('swords have wide arcs, post-dodge bonuses, third strikes, visible lingering flames and charged hits',()=>{
  const wide=arena(403);foe(wide,450,400);const side=foe(wide,440,475);step(wide,idle,1/60);assert.equal(wide.swings[0].arc,140);assert.ok(side.hp<10000);
  const dodge=arena(413);foe(dodge,460,400);step(dodge,{...idle,dash:true},1/60);assert.equal(dodge.weaponState.dodgeUntil,0);assert.ok(dodge.texts.some(t=>t.text==='TIDAL STRIKE'));
  const s=arena(423);near(weaponAttack(s,gearFor(423),100).damage,100);near(weaponAttack(s,gearFor(423),100).damage,100);near(weaponAttack(s,gearFor(423),100).damage,140);
  const charge=arena(443);near(weaponAttack(charge,gearFor(443),100).damage,135);charge.time=.6;near(weaponAttack(charge,gearFor(443),100).damage,117.5);charge.time=2;near(weaponAttack(charge,gearFor(443),100).damage,135);
  const fire=arena(433),e=foe(fire,450,400),outside=foe(fire,330,400);step(fire,idle,1/60);assert.equal(fire.flames.length,1);fire.attack=999;
  const damage=weaponProfile(gearFor(433)).damage*statsFor(fire.loadout).power,hp=e.hp;
  for(let i=0;i<90;i++){step(fire,idle,1/60);e.x=450;outside.x=330;}
  near(hp-e.hp,damage*.36);near(outside.hp,10000);assert.equal(fire.flames.length,0);
});

test('heat stacks once per landed attack, caps at 20%, and expires; ability damage does not proc weapon effects',()=>{
  const s=arena(434),a=foe(s),b=foe(s,455,400);
  for(let i=1;i<=8;i++){s.time+=.2;strike(s,a,434,10,{volley:i});strike(s,b,434,10,{volley:i});}
  assert.equal(s.weaponState.heat,5);assert.equal(weaponModifiers(s).rate,1.2);s.time+=1.26;assert.equal(weaponModifiers(s).rate,1);
  const bash=arena(431);bash.loadout.ability=261;bash.attack=999;bash.dashDir={x:1,y:0};const e=foe(bash);step(bash,{...idle,ability:true},1/60);assert.ok(e.hp<10000);assert.equal(e.burn,undefined);assert.equal(bash.weaponState.attacks,0);
});

test('DOTs and secondary hits respect boss shields, spawn immunity, victory and death through real combat',()=>{
  for(const id of [404,411,431,432,433,444]){
    const s=makeRun(id);s.phase='door';enterBoss(s);s.invul=999;
    const boss=s.enemies[0];s.x=boss.x-60;s.y=boss.y;boss.hp=boss.maxHp/2+1;
    boss.burn={time:2,tick:0,damage:10000};step(s,idle,1/60);
    assert.equal(boss.hp,boss.maxHp/2);assert.ok(boss.shielded);assert.equal(s.enemies.filter(e=>e.summoned).length,2);
    const guards=s.enemies.filter(e=>e.summoned);assert.ok(guards.every(e=>e.hp===e.maxHp));
    for(let t=0;t<40;t++)step(s,idle,1/60);assert.equal(boss.hp,boss.maxHp/2);
  }
  const s=arena(431),e=foe(s);e.spawnDelay=1;strike(s,e,431);assert.equal(e.hp,10000);assert.equal(e.burn,undefined);
  delete e.spawnDelay;strike(s,e,431);const hp=e.hp;s.phase='dead';for(let i=0;i<120;i++)step(s,idle,1/60);assert.equal(e.hp,hp);
  const win=makeRun(431);win.phase='door';enterBoss(win);win.summoned=true;win.enemies[0].hp=1;win.enemies[0].burn={time:1,tick:0,damage:2};step(win,idle,1/60);
  assert.equal(win.phase,'won');assert.equal(win.defeated.length,1);assert.equal(win.event,'win');const kills=win.kills;step(win,idle,1/60);assert.equal(win.kills,kills);
});
