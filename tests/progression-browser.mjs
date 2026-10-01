import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {createEconomy,character,validateEconomy,RF} from '../games/relic-run/economy.ts';
import {project,VIEW_WIDTH,VIEW_HEIGHT} from '../games/relic-run/camera.ts';

const server=createServer(async(req,res)=>{const name=new URL(req.url,'http://local').pathname.slice(1)||'index.html';if(!['index.html','game.js','game.css'].includes(name))return res.writeHead(404).end();res.setHeader('Content-Type',name.endsWith('.html')?'text/html':name.endsWith('.js')?'text/javascript':'text/css');res.end(await readFile(new URL('../games/relic-run/.guest/'+name,import.meta.url)));});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port,browser=await chromium.launch({headless:true}),errors=[],key='relic-run:world:v3';
try{
  for(const width of [1100,390]){
    const world=createEconomy(),c=character(world,'guest','generation:sample');
    c.loadout={weapon:205,ability:275,armor:305,ring:315};for(const id of Object.values(c.loadout))c.inventory[id]=1;
    c.potions['minor:health']='21';
    const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce',hasTouch:width<500});
    await context.addInitScript(({key,world})=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(world));crypto.getRandomValues=a=>{a.fill(5000);return a;};},{key,world});
    const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.clock.install();await page.goto(origin);
    await page.getByRole('button',{name:'Enter · 100 RF',exact:true}).waitFor();
    const read=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);
    await page.getByRole('button',{name:/Entry boost/}).click();await page.getByRole('spinbutton',{name:'Entry multiple',exact:true}).fill('50');
    assert.match(await page.locator('.rr-entry-rewards').innerText(),/1 guaranteed/);assert.match(await page.locator('.rr-entry-rewards').innerText(),/20.00×/);
    assert.match(await page.locator('.rr-quote').innerText(),/5,000 RF/);assert.match(await page.locator('.rr-quote').innerText(),/4,000–6,000 GEMZ/);
    await page.locator('.rr-game').screenshot({path:`artifacts/entry-boost-${width}.png`});
    assert.equal(await page.locator('.rr-modal-body').evaluate(e=>e.scrollWidth>e.clientWidth),false);
    await page.getByRole('button',{name:'Use 50× entry',exact:true}).click();assert.ok(await page.getByRole('button',{name:'Enter · 5,000 RF',exact:true}).isDisabled());
    await page.getByRole('button',{name:'How to play',exact:true}).click();await page.getByRole('button',{name:/Add this entry’s cost/}).click();await page.getByRole('button',{name:'Close',exact:true}).click();
    assert.equal((await read()).accounts.guest.rf,5500*RF);
    await page.getByRole('button',{name:/^Potions/}).click();
    for(let i=0;i<20;i++)await page.getByRole('button',{name:'Drink minor health',exact:true}).click();
    assert.ok(await page.getByRole('button',{name:'Drink minor health',exact:true}).isDisabled());assert.match(await page.locator('.rr-potion-stats').innerText(),/20 \/ 20/);
    let saved=await read();assert.equal(saved.accounts.guest.characters['generation:sample'].drinks.health,20);assert.equal(saved.accounts.guest.characters['generation:sample'].potions['minor:health'],'1');
    await page.locator('.rr-game').screenshot({path:`artifacts/potion-progression-${width}.png`});
    await page.getByRole('button',{name:'Close',exact:true}).click();
    await page.getByRole('button',{name:'Enter · 5,000 RF',exact:true}).click();await page.clock.runFor(100);
    saved=await read();assert.equal(saved.accounts.guest.active.multiple,50);assert.equal(saved.accounts.guest.rf,500*RF);assert.equal(saved.pool.rf,4000*RF);assert.equal(saved.jackpots[1],750*RF);
    const route=[[720,680],[760,300],[480,180],[200,300],[200,680],[480,760]];let point=0,last=-1;
    for(let i=0;i<260;i++){
      const phase=await page.locator('.rr-game').getAttribute('data-phase');if(phase==='won')break;assert.notEqual(phase,'dead');
      if(phase==='door'){await page.getByRole('button',{name:'Face the boss',exact:true}).click();await page.clock.runFor(100);point=0;last=-1;}
      const canvas=page.locator('.rr-stage>canvas'),pos=await canvas.evaluate(e=>({x:+e.dataset.x,y:+e.dataset.y}));
      if(Math.hypot(route[point][0]-pos.x,route[point][1]-pos.y)<25)point=(point+1)%route.length;
      if(point!==last){const box=await canvas.boundingBox(),p=project(...route[point]),scale=Math.min(box.width/VIEW_WIDTH,box.height/VIEW_HEIGHT);await canvas.click({position:{x:(box.width-VIEW_WIDTH*scale)/2+p.x*scale,y:(box.height-VIEW_HEIGHT*scale)/2+p.y*scale},force:true});last=point;}
      const ability=page.getByRole('button',{name:'Use ability',exact:true});if(await ability.isEnabled())await ability.click({force:true});await page.clock.runFor(600);
    }
    assert.equal(await page.locator('.rr-game').getAttribute('data-phase'),'won');saved=await read();assert.ok(validateEconomy(saved));
    assert.equal(saved.accounts.guest.active.gemz,5000);assert.deepEqual(saved.accounts.guest.active.items,[403]);assert.equal(saved.accounts.guest.active.potions.length,1);assert.equal(saved.jackpotPaid,0);
    await page.locator('.rr-game').screenshot({path:`artifacts/boosted-clear-${width}.png`});
    await page.getByRole('button',{name:'Manage equipment',exact:true}).click();await page.getByRole('button',{name:'Close',exact:true}).click();
    await page.reload();await page.getByRole('button',{name:'Enter · 100 RF',exact:true}).waitFor();assert.deepEqual(await read(),saved,'completed boosted entry survives reload without recredit');
    const select=page.getByRole('combobox',{name:'Expedition level',exact:true});
    await select.selectOption('5');await page.getByRole('button',{name:/Entry boost/}).click();assert.equal(await page.getByRole('spinbutton',{name:'Entry multiple',exact:true}).getAttribute('max'),'31250');
    await page.getByRole('spinbutton',{name:'Entry multiple',exact:true}).fill('31250');await page.getByRole('button',{name:'Use 31,250× entry',exact:true}).click();
    await select.selectOption('1');assert.match(await page.getByRole('button',{name:/Entry boost/}).innerText(),/50×/);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await context.close();console.log(`Passed boosted entry, potions, real boss rewards, reload and level-cap selection at ${width}px.`);
  }
  assert.deepEqual(errors,[]);
}finally{await browser.close();await new Promise(r=>server.close(r));}
