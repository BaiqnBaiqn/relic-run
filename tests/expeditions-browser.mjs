import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
import {createEconomy,account,character,validateEconomy,addTestRF,RF} from '../games/relic-run/economy.ts';
import {LEVELS,clearGemzRange} from '../games/relic-run/levels.ts';
import {project,VIEW_WIDTH,VIEW_HEIGHT} from '../games/relic-run/camera.ts';
await mkdir('artifacts',{recursive:true});
const mime={'/':'text/html','/game.js':'text/javascript','/game.css':'text/css'};
const server=createServer(async(req,res)=>{const path=new URL(req.url,'http://localhost').pathname;if(!mime[path])return res.writeHead(404).end();try{res.writeHead(200,{'Content-Type':mime[path]});res.end(await readFile(new URL('../games/relic-run/.guest/'+(path==='/'?'index.html':path.slice(1)),import.meta.url)));}catch{res.writeHead(500).end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+server.address().port,browser=await chromium.launch({headless:true}),errors=[],saveKey='relic-run:world:v3';
try{
  for(const level of LEVELS.slice(1)){
    const width=level.id===5?390:level.id===2?589:1100,height=level.id===2?657:850,world=createEconomy();account(world,'guest');addTestRF(world,'guest',5000);const friend=character(world,'guest','generation:sample');
    friend.loadout={weapon:200+level.id,ability:270+level.id,armor:300+level.id,ring:310+level.id};for(const id of Object.values(friend.loadout))friend.inventory[id]=1;assert.ok(validateEconomy(world));
    const context=await browser.newContext({viewport:{width,height},reducedMotion:'no-preference'});
    await context.addInitScript(({saveKey,world})=>{if(!localStorage.getItem(saveKey))localStorage.setItem(saveKey,JSON.stringify(world));Object.defineProperty(window,'ethereum',{get(){throw Error('Guest mode accessed wallet');}});},{saveKey,world});
    await context.route('**/*',r=>{if(!r.request().url().startsWith(url+'/')){errors.push(r.request().url());return r.abort();}return r.continue();});
    const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.clock.install();await page.goto(url);await page.getByRole('button',{name:'Enter · 100 RF',exact:true}).waitFor();
    await page.getByLabel('Expedition level',{exact:true}).selectOption(String(level.id));
    assert.equal(await page.locator('.rr-game').getAttribute('data-level'),String(level.id));
    assert.match(await page.locator('.rr-camp').innerText(),new RegExp(level.gemz.toLocaleString('en-US')+' GEMZ'));
    await page.locator('.rr-game').screenshot({path:`artifacts/level-${level.id}-camp.png`});
    await page.getByRole('button',{name:'Boss & loot',exact:true}).click();assert.match(await page.getByRole('dialog').innerText(),new RegExp(level.jackpot));await page.getByRole('button',{name:'Close',exact:true}).click();
    await page.getByRole('button',{name:`Enter · ${level.entryRF.toLocaleString('en-US')} RF`,exact:true}).click();await page.clock.runFor(100);
    for(const selector of ['.rr-topbar','.rr-econ-nav','.rr-roster','.rr-camp-dock','.rr-underbar'])assert.equal(await page.locator(selector).isVisible(),false);
    const arenaBox=await page.locator('.rr-stage>canvas').boundingBox(),hudBox=await page.locator('.rr-expedition-hud').boundingBox();assert.ok(arenaBox.height>height*.8);assert.ok(hudBox.y+hudBox.height<=arenaBox.y+1);
    await page.locator('.rr-game').screenshot({path:`artifacts/combat-focus-${width}.png`});
    let saved=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),saveKey);assert.equal(saved.accounts.guest.active.level,level.id);assert.equal(saved.pool.rf,level.entryRF*RF*.8);assert.equal(saved.jackpots[level.id],level.entryRF*RF*.15);
    const route=[[720,680],[760,300],[480,180],[200,300],[200,680],[480,760]];let point=0,last=-1,bossSeen=false,shieldSeen=false,bossTicks=0;
    for(let i=0;i<360;i++){
      const phase=await page.locator('.rr-game').getAttribute('data-phase');if(phase==='won')break;assert.notEqual(phase,'dead',`L${level.id} should clear with recommended gear`);
      if(phase==='door'){await page.getByRole('button',{name:'Face the boss',exact:true}).click();await page.clock.runFor(100);point=0;last=-1;bossSeen=true;}
      if(bossSeen)bossTicks++;
      if(bossTicks===14){const bar=await page.locator('.rr-boss-meter').boundingBox(),arena=await page.locator('.rr-stage>canvas').boundingBox();assert.ok(bar.y+bar.height<=arena.y+1,'boss bar stays outside the arena');await page.locator('.rr-game').screenshot({path:`artifacts/level-${level.id}-boss.png`});}
      if(!shieldSeen&&await page.locator('.rr-boss-meter').count()&&(await page.locator('.rr-boss-meter').textContent())?.includes('SHIELDED')){shieldSeen=true;await page.locator('.rr-game').screenshot({path:`artifacts/level-${level.id}-guards.png`});}
      const pos=await page.locator('.rr-stage>canvas').evaluate(e=>({x:Number(e.dataset.x),y:Number(e.dataset.y)}));let [x,y]=route[point];if(Math.hypot(x-pos.x,y-pos.y)<20){point=(point+1)%route.length;[x,y]=route[point];}
      if(point!==last){const box=await page.locator('.rr-stage>canvas').boundingBox(),scale=Math.min(box.width/VIEW_WIDTH,box.height/VIEW_HEIGHT),p=project(x,y);await page.locator('.rr-stage>canvas').click({force:true,position:{x:(box.width-VIEW_WIDTH*scale)/2+p.x*scale,y:(box.height-VIEW_HEIGHT*scale)/2+p.y*scale}});last=point;}
      await page.keyboard.press('q');await page.clock.runFor(400);
    }
    assert.equal(await page.locator('.rr-game').getAttribute('data-phase'),'won');assert.ok(bossSeen&&shieldSeen);
    saved=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),saveKey);assert.ok(validateEconomy(saved));assert.ok(saved.accounts.guest.active.gemz>=clearGemzRange(level).min&&saved.accounts.guest.active.gemz<=clearGemzRange(level).max);assert.equal(saved.accounts.guest.active.kills.length,12);assert.equal(saved.accounts.guest.active.ended,true);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await page.locator('.rr-jackpot-reveal').waitFor();await page.clock.runFor(3000);assert.ok(['hit','miss'].includes(await page.locator('.rr-jackpot-reveal').getAttribute('data-result')));await page.locator('.rr-game').screenshot({path:`artifacts/level-${level.id}-victory.png`});
    await page.getByRole('button',{name:'Manage equipment',exact:true}).click();await page.getByRole('button',{name:'Close',exact:true}).click();assert.equal(await page.locator('.rr-camp-dock').isVisible(),true);assert.equal(await page.locator('.rr-roster').isVisible(),true);
    await page.reload();await page.getByRole('button',{name:'Enter · 100 RF',exact:true}).waitFor();assert.deepEqual(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),saveKey),saved);
    await context.close();console.log(`L${level.id}: real room, boss, two guards, victory, ${level.gemz} GEMZ and save reload passed (${width}px).`);
  }
  assert.deepEqual(errors,[]);
}finally{await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
