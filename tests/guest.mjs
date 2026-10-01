import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
import {project,VIEW_WIDTH,VIEW_HEIGHT} from '../games/relic-run/camera.ts';
import {GEAR,STARTERS} from '../games/relic-run/gear.ts';
import {LOCKOUT_MS,validateEconomy,createEconomy,character,addTestRF} from '../games/relic-run/economy.ts';
await mkdir('artifacts',{recursive:true});
const types={'/':'text/html','/index.html':'text/html','/game.js':'text/javascript','/game.css':'text/css'};
const server=createServer(async(req,res)=>{
  const pathname=new URL(req.url,'http://localhost').pathname;
  if(!types[pathname])return res.writeHead(404).end();
  try{res.writeHead(200,{'Content-Type':types[pathname]});res.end(await readFile(new URL('../games/relic-run/.guest/'+(pathname==='/'?'index.html':pathname.slice(1)),import.meta.url)));}catch{res.writeHead(500).end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin='http://127.0.0.1:'+server.address().port,browser=await chromium.launch({headless:true}),errors=[];
const saveKey='relic-run:world:v3';
const readSave=page=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),saveKey);
const position=page=>page.locator('.rr-stage>canvas').evaluate(e=>({x:Number(e.dataset.x),y:Number(e.dataset.y),hp:Number(e.dataset.hp)}));
async function setup(width,height){
  const context=await browser.newContext({viewport:{width,height},hasTouch:width<500,reducedMotion:'reduce'});
  await context.route('**/*',route=>{if(!route.request().url().startsWith(origin+'/')){errors.push('External request: '+route.request().url());return route.abort();}return route.continue();});
  await context.addInitScript(()=>Object.defineProperty(window,'ethereum',{get(){throw new Error('Guest mode touched wallet');}}));
  const page=await context.newPage();page.setDefaultTimeout(12000);await page.clock.install();
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin);await page.getByRole('button',{name:'Enter · 100 RF',exact:true}).waitFor();
  await page.waitForFunction(()=>!document.querySelector('.rr-loading'));
  return page;
}
try{
  const page=await setup(1100,850);const fixture=createEconomy(),friend=character(fixture,'guest','generation:sample');friend.loadout={weapon:201,ability:271,armor:301,ring:311};for(const id of Object.values(friend.loadout))friend.inventory[id]=1;addTestRF(fixture,'guest',2000);await page.evaluate(({saveKey,fixture})=>localStorage.setItem(saveKey,JSON.stringify(fixture)),{saveKey,fixture});await page.reload();await page.waitForFunction(()=>!document.querySelector('.rr-loading'));await page.locator('.rr-game').screenshot({path:'artifacts/economy-desktop.png'});
  assert.equal(await page.locator('.rr-equipped-slot').count(),4);await page.clock.pauseAt(new Date(Date.now()+500));
  async function clearDungeon(){
    await page.getByRole('button',{name:'Enter · 100 RF',exact:true}).click({force:true});await page.clock.runFor(100);
    const route=[[720,680],[760,300],[480,180],[200,300],[200,680],[480,760]];let point=0,last=-1,bossSeen=false,shieldSeen=false;
    for(let i=0;i<800;i++){
      const phase=await page.locator('.rr-game').getAttribute('data-phase');if(phase==='won')break;assert.notEqual(phase,'dead');
      if(phase==='door'){await page.getByRole('button',{name:'Face the boss'}).click({force:true});await page.clock.runFor(100);point=0;last=-1;bossSeen=true;}
      if(!shieldSeen&&await page.locator('.rr-boss-meter').count()&&(await page.locator('.rr-boss-meter').textContent())?.includes('SHIELDED')){
        shieldSeen=true;await page.locator('.rr-game').screenshot({path:'artifacts/warden-shield.png'});
      }
      const pos=await position(page);let [x,y]=route[point];if(Math.hypot(x-pos.x,y-pos.y)<18){point=(point+1)%route.length;[x,y]=route[point];}
      if(point!==last){const box=await page.locator('.rr-stage>canvas').boundingBox(),scale=Math.min(box.width/VIEW_WIDTH,box.height/VIEW_HEIGHT),screen=project(x,y);await page.locator('.rr-stage>canvas').click({force:true,position:{x:(box.width-VIEW_WIDTH*scale)/2+screen.x*scale,y:(box.height-VIEW_HEIGHT*scale)/2+screen.y*scale}});last=point;}
      await page.keyboard.press('q');await page.clock.runFor(400);
    }
    assert.ok(bossSeen);assert.ok(shieldSeen);assert.equal(await page.locator('.rr-game').getAttribute('data-phase'),'won');
    const e=await readSave(page);assert.ok(e.accounts.guest.active.gemz>=80&&e.accounts.guest.active.gemz<=120);assert.equal(e.accounts.guest.active.kills.length,12);assert.ok(validateEconomy(e));
    await page.getByRole('button',{name:'Manage equipment',exact:true}).click({force:true});await page.getByRole('button',{name:'Close',exact:true}).click({force:true});
  }
  for(let run=0;run<3;run++){await clearDungeon();console.log(`T1 combat clear ${run+1}/3 passed.`);}
  let world=await readSave(page),p=world.accounts.guest;assert.ok(p.gemz>=240&&p.gemz<=360);assert.equal(world.ecosystem,15000000);assert.equal(world.pool.rf,240000000);assert.equal(world.entries,3);while(p.gemz<250){assert.ok(world.entries<5);await clearDungeon();world=await readSave(page);p=world.accounts.guest;}const earnedBeforeChest=p.gemz;
  await page.getByRole('button',{name:'Shop chests · from 250 GEMZ',exact:true}).click({force:true});
  await page.getByRole('button',{name:'Open chest · 250 GEMZ',exact:true}).click({force:true});await page.clock.runFor(900);
  world=await readSave(page);p=world.accounts.guest;const owned=p.lastChest,item=GEAR.find(g=>g.id===owned);assert.ok(item.tier);assert.ok(!item.soulbound);assert.equal(p.gemz,earnedBeforeChest-250);assert.equal(p.chests,1);
  await page.locator('.rr-game').screenshot({path:'artifacts/gemz-chest-store.png'});
  await page.getByRole('button',{name:'Close',exact:true}).click({force:true});
  await page.getByRole('button',{name:new RegExp('^'+item.slot+':')}).click({force:true});
  await page.locator('.rr-gear-card').filter({hasText:item.name}).click({force:true});assert.equal((await readSave(page)).accounts.guest.characters['generation:sample'].loadout[item.slot],owned);
  await page.getByRole('button',{name:'Close',exact:true}).click({force:true});
  await page.getByRole('button',{name:/^Potions ↗/}).click({force:true});
  const c=p.characters['generation:sample'],pot=Object.keys(c.potions).find(id=>BigInt(c.potions[id])>0n),[size,stat]=pot.split(':');
  await page.getByRole('button',{name:'Drink '+size+' '+stat,exact:true}).click({force:true});
  assert.equal((await readSave(page)).accounts.guest.characters['generation:sample'].points[stat],1);
  await page.locator('.rr-game').screenshot({path:'artifacts/potion-stash.png'});
  await page.getByRole('button',{name:'Close',exact:true}).click({force:true});
  // The fixed patrol is a ranged T1 strategy. Keep random melee/dash loot
  // from changing this accounting test's combat strategy; item combat has its own tests.
  const starter=GEAR.find(g=>g.id===({weapon:201,ability:271,armor:301,ring:311}[item.slot]));
  async function selectItem(g){
    await page.getByRole('button',{name:new RegExp('^'+g.slot+':')}).click({force:true});
    await page.locator('.rr-gear-card').filter({has:page.getByText(g.name,{exact:true})}).click({force:true});
    await page.getByRole('button',{name:'Close',exact:true}).click({force:true});
  }
  await selectItem(starter);await clearDungeon();await selectItem(item);
  await page.getByRole('button',{name:'GEMZ → RF season ↗',exact:true}).click({force:true});
  const contributed=(await readSave(page)).accounts.guest.gemz;await page.getByLabel('GEMZ to contribute').fill(String(contributed));await page.getByRole('button',{name:'Contribute GEMZ',exact:true}).click({force:true});
  world=await readSave(page);const beforeRF=world.accounts.guest.rf,fund=world.pool.rf;
  assert.equal(world.pool.contributions.guest,contributed);assert.equal(world.accounts.guest.gemz,0);
  await page.locator('.rr-game').screenshot({path:'artifacts/global-redemption-pool.png'});
  const remaining=await page.evaluate(deadline=>deadline-Date.now(),world.pool.closesAt);await page.clock.fastForward(remaining+1000);await page.clock.runFor(100);
  world=await readSave(page);assert.equal(world.accounts.guest.rf,beforeRF+fund);assert.equal(world.pool.rf,0);assert.equal(world.gemzBurned,250+contributed);assert.ok(validateEconomy(world));
  await page.getByRole('button',{name:'Close',exact:true}).click({force:true});
  await page.reload();await page.getByRole('button',{name:'Enter · 100 RF',exact:true}).waitFor();assert.deepEqual(await readSave(page),world);
  const ownedBeforeDeath=world.accounts.guest.characters['generation:sample'].inventory[owned];
  await page.getByRole('button',{name:'Enter · 100 RF',exact:true}).click({force:true});await page.clock.runFor(100);
  await page.reload();await page.getByRole('button',{name:'Recovering…',exact:true}).waitFor();
  world=await readSave(page);const dead=world.accounts.guest.characters['generation:sample'];
  assert.ok(dead.lockedUntil>Date.now());assert.equal(dead.inventory[owned],ownedBeforeDeath-1);assert.equal(dead.points[stat],0);
  assert.ok(await page.getByRole('button',{name:'Recovering…',exact:true}).isDisabled());
  await page.getByRole('button',{name:'How to play',exact:true}).click({force:true});await page.getByLabel('Guest rules profile').selectOption('genesis');
  await page.getByRole('button',{name:'Enter · 100 RF',exact:true}).waitFor();await page.getByRole('button',{name:'Enter · 100 RF',exact:true}).click({force:true});await page.clock.runFor(100);
  await page.reload();await page.getByRole('button',{name:'Recovering…',exact:true}).waitFor();
  assert.equal((await readSave(page)).accounts.guest.characters['genesis:sample'].lockedUntil,0);
  console.log('Desktop: repeated real boss clears with shield minions → 250-GEMZ chest → equip → potion → pro-rata settlement → persistence → death/Genesis.');

  const mobile=await setup(390,844);await mobile.locator('.rr-game').screenshot({path:'artifacts/economy-mobile.png'});
  assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await mobile.getByRole('button',{name:'Shop chests · from 250 GEMZ',exact:true}).click();assert.ok(await mobile.getByRole('button',{name:'Open chest · 250 GEMZ',exact:true}).isDisabled());
  await mobile.locator('.rr-game').screenshot({path:'artifacts/chest-mobile.png'});await mobile.getByRole('button',{name:'Close',exact:true}).click();
  await mobile.getByRole('button',{name:/^Potions ↗/}).click();await mobile.locator('.rr-game').screenshot({path:'artifacts/potions-mobile.png'});await mobile.getByRole('button',{name:'Close',exact:true}).click();
  await mobile.getByRole('button',{name:'Enter · 100 RF',exact:true}).click();await mobile.locator('.rr-game[data-phase="room"]').waitFor();
  await mobile.clock.pauseAt(new Date(Date.now()+500));const pos=await position(mobile),stick=await mobile.getByRole('group',{name:'Movement joystick'}).boundingBox(),touch=await mobile.context().newCDPSession(mobile);
  await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:stick.x+stick.width/2+24,y:stick.y+stick.height/2}]});await mobile.clock.runFor(400);await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  assert.ok((await position(mobile)).x>pos.x+20);await mobile.getByRole('button',{name:'Use ability',exact:true}).click({force:true});await mobile.clock.runFor(100);assert.ok(await mobile.getByRole('button',{name:'Use ability',exact:true}).isDisabled());
  await mobile.getByRole('button',{name:'Pause',exact:true}).click({force:true});await mobile.clock.runFor(100);const frozen=await position(mobile);await mobile.clock.runFor(1000);assert.deepEqual(await position(mobile),frozen);
  assert.deepEqual(errors,[]);console.log('Mobile: chest/potion layouts, touch movement, ability, pause. Guest never accesses wallets or RPC.');
}finally{await browser.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
