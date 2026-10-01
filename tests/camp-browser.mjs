import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {createEconomy,character,validateEconomy} from '../games/relic-run/economy.ts';
import {project,VIEW_WIDTH,VIEW_HEIGHT} from '../games/relic-run/camera.ts';

const server=createServer(async(req,res)=>{const name=new URL(req.url,'http://local').pathname.slice(1)||'index.html';if(!['index.html','game.js','game.css'].includes(name))return res.writeHead(404).end();res.setHeader('Content-Type',name.endsWith('.html')?'text/html':name.endsWith('.js')?'text/javascript':'text/css');res.end(await readFile(new URL('../games/relic-run/.guest/'+name,import.meta.url)));});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port,browser=await chromium.launch({headless:true}),errors=[],key='relic-run:world:v3';
const world=createEconomy(),a=character(world,'guest','generation:sample'),b=character(world,'guest','genesis:sample','genesis');
a.loadout={weapon:205,ability:275,armor:305,ring:315};for(const id of Object.values(a.loadout))a.inventory[id]=1;
b.inventory[211]=1;b.loadout.weapon=211;a.potions['minor:health']='999999999999999999999999';assert.ok(validateEconomy(world));
try{
  for(const hit of [false,true]){
    const context=await browser.newContext({viewport:{width:hit?390:1100,height:850},reducedMotion:'no-preference'});
    await context.addInitScript(({key,world,hit})=>{
      if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(world));
      // Explicit deterministic test entropy: never part of a game build.
      crypto.getRandomValues=array=>{array.fill(hit?0:5000);return array;};
      window.__soundBuffers=[];
      const start=AudioBufferSourceNode.prototype.start;
      AudioBufferSourceNode.prototype.start=function(...args){if(this.buffer)window.__soundBuffers.push(this.buffer.duration);return start.apply(this,args);};
    },{key,world,hit});
    const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.clock.install();await page.goto(origin);
    await page.getByRole('button',{name:'Enter · 100 RF',exact:true}).waitFor();await page.waitForFunction(()=>!document.querySelector('.rr-loading'));
    const read=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);
    const roster=page.getByRole('region',{name:'Your Rarefriends'});
    const store=await page.getByRole('complementary',{name:'Chest store'}).boundingBox(),inventory=await page.getByRole('region',{name:'Friend inventory'}).boundingBox();
    assert.ok(store.x>inventory.x&&Math.abs(store.y-inventory.y)<2,'store is bottom-right beside inventory');
    await roster.getByRole('button',{name:/Genesis · demo/}).click();await page.waitForFunction(()=>document.querySelector('.rr-game')?.dataset.characterKind==='genesis'&&!document.querySelector('.rr-loading'));
    assert.match(await page.getByRole('button',{name:/^weapon:/}).innerText(),/Reed bow/);
    await roster.getByRole('button',{name:/Generation · demo/}).click();await page.waitForFunction(()=>document.querySelector('.rr-game')?.dataset.characterKind==='generation'&&!document.querySelector('.rr-loading'));
    assert.match(await page.getByRole('button',{name:/^weapon:/}).innerText(),/Heartwood wand/);
    assert.equal(await page.locator('.rr-four-slots svg[data-model]').count(),4);
    await page.clock.runFor(500);
    const shader=page.locator('.rr-four-slots canvas[data-shader="ready"]').first();await shader.waitFor();
    const fingerprint=()=>shader.evaluate(c=>Array.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data).reduce((s,v,i)=>s+(i%4===3?v:0),0));
    const before=await fingerprint();assert.ok(before>0,'GLSL effect has visible alpha');await page.clock.runFor(800);assert.notEqual(await fingerprint(),before,'rarity shader animates');
    await page.getByRole('button',{name:'How to play',exact:true}).click();await page.getByLabel('Reduce motion').check();await page.getByRole('button',{name:'Close',exact:true}).click();await page.clock.runFor(250);const still=await fingerprint();await page.clock.runFor(800);assert.equal(await fingerprint(),still,'reduced motion freezes the shader');
    await page.getByRole('button',{name:'How to play',exact:true}).click();await page.getByLabel('Reduce motion').uncheck();await page.getByRole('button',{name:'Close',exact:true}).click();
    await page.getByRole('button',{name:'Enter · 100 RF',exact:true}).click();await page.clock.runFor(100);
    assert.equal(await roster.isVisible(),false,'roster is hidden during an expedition');assert.equal(await page.locator('.rr-camp-dock').isVisible(),false);
    const route=[[720,680],[760,300],[480,180],[200,300],[200,680],[480,760]];let point=0,last=-1;
    for(let i=0;i<400;i++){
      const phase=await page.locator('.rr-game').getAttribute('data-phase');if(phase==='won')break;assert.notEqual(phase,'dead');
      if(phase==='door'){await page.getByRole('button',{name:'Face the boss'}).click();await page.clock.runFor(100);point=0;last=-1;}
      const arena=page.locator('.rr-stage>canvas'),pos=await arena.evaluate(c=>({x:Number(c.dataset.x),y:Number(c.dataset.y)}));let [x,y]=route[point];
      if(Math.hypot(x-pos.x,y-pos.y)<20){point=(point+1)%route.length;[x,y]=route[point];}
      if(point!==last){const box=await arena.boundingBox(),scale=Math.min(box.width/VIEW_WIDTH,box.height/VIEW_HEIGHT),p=project(x,y);await arena.click({force:true,position:{x:(box.width-VIEW_WIDTH*scale)/2+p.x*scale,y:(box.height-VIEW_HEIGHT*scale)/2+p.y*scale}});last=point;}
      await page.keyboard.press('q');await page.clock.runFor(200);
    }
    assert.equal(await page.locator('.rr-game').getAttribute('data-phase'),'won');
    const saved=await read();assert.ok(validateEconomy(saved));assert.equal(saved.accounts.guest.active.gemz,hit?80:100);
    assert.equal(await page.locator('.rr-jackpot-reveal').getAttribute('data-result'),'spinning');
    if(!hit){await page.clock.runFor(400);await page.getByRole('button',{name:'Reveal result now',exact:true}).click();}
    await page.clock.runFor(3000);assert.equal(await page.locator('.rr-jackpot-reveal').getAttribute('data-result'),hit?'hit':'miss');
    assert.deepEqual(await read(),saved,'animation cannot change rewards');
    const actionBox=await page.getByRole('button',{name:'Manage equipment',exact:true}).boundingBox(),panelBox=await page.locator('.rr-reward').boundingBox();assert.ok(actionBox.y>=panelBox.y&&actionBox.y+actionBox.height<=panelBox.y+panelBox.height,'victory actions stay visible while loot scrolls');
    await page.locator('.rr-game').screenshot({path:`artifacts/jackpot-${hit?'hit-mobile':'miss-desktop'}.png`});
    const audio=await page.evaluate(()=>window.__soundBuffers);
    for(const duration of [.1,.25,.3,.36,hit?1.05:.38])assert.ok(audio.some(v=>Math.abs(v-duration)<.001),`heard UI/attack, ability, spin, loot and result cue (${duration}s)`);
    await page.getByRole('button',{name:'Manage equipment',exact:true}).click();await page.getByRole('button',{name:'Close',exact:true}).click();
    // Fail one entry to verify the visible roster recovery state and the other
    // Friend's independent equipment survives the reload.
    await page.getByRole('button',{name:'Enter · 100 RF',exact:true}).click();await page.clock.runFor(100);await page.reload();await page.getByRole('button',{name:'Recovering…',exact:true}).waitFor();
    assert.match(await roster.innerText(),/Cooldown · 12h/);await roster.getByRole('button',{name:/Genesis · demo/}).click();await page.getByRole('button',{name:'Enter · 100 RF',exact:true}).waitFor();
    assert.match(await page.getByRole('button',{name:/^weapon:/}).innerText(),/Reed bow/);assert.equal((await read()).accounts.guest.characters['genesis:sample'].lockedUntil,0);
    await context.close();console.log(`Camp: ${hit?'hit/mobile':'miss/desktop'}, per-Friend gear and cooldowns, shader + reduced motion, audio events, immutable reveal passed.`);
  }
  const fallback=await browser.newContext({viewport:{width:390,height:850}});
  await fallback.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return type==='webgl'?null:original.call(this,type,...args);};});
  const page=await fallback.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(origin);await page.waitForFunction(()=>!document.querySelector('.rr-loading'));
  assert.equal(await page.locator('.rr-four-slots svg[data-model] image').count(),4);assert.ok(await page.getByRole('button',{name:'Enter · 100 RF',exact:true}).isEnabled());await fallback.close();
  assert.deepEqual(errors,[]);
}finally{await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
