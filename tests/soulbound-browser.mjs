import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {createEconomy,character,validateEconomy,addTestRF} from '../games/relic-run/economy.ts';
import {COLLECTION_GEAR} from '../games/relic-run/gear.ts';
import {gemzValue,gemzText} from '../games/relic-run/gemz.ts';

const key='relic-run:world:v3',server=createServer(async(req,res)=>{
  const name=new URL(req.url,'http://local').pathname.slice(1)||'index.html';
  if(!['index.html','game.js','game.css'].includes(name))return res.writeHead(404).end();
  res.setHeader('Content-Type',name.endsWith('.html')?'text/html':name.endsWith('.js')?'text/javascript':'text/css');
  res.end(await readFile(new URL('../games/relic-run/.guest/'+name,import.meta.url)));
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port,browser=await chromium.launch({headless:true}),errors=[];
try{
  for(const width of [1100,390]){
    const world=createEconomy(),c=character(world,'guest','generation:sample');addTestRF(world,'guest',10000);
    c.loadout={weapon:0,ability:275,armor:305,ring:315};
    for(const id of [...COLLECTION_GEAR.map(g=>g.id),449,101,275,305,315])c.inventory[id]=1;
    assert.ok(validateEconomy(world));
    const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce',hasTouch:width<500});
    await context.addInitScript(({world,key})=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(world));},{world,key});
    const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.clock.install();await page.goto(origin);
    await page.getByRole('button',{name:'Enter · 100 RF',exact:true}).waitFor();
    const read=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);
    const close=()=>page.getByRole('button',{name:'Close',exact:true}).click();
    const select=page.getByRole('combobox',{name:'Expedition level',exact:true});await select.selectOption('5');
    await page.getByRole('button',{name:'Boss & loot',exact:true}).click();
    const guide=page.getByRole('dialog');assert.match(await guide.innerText(),/Starbound collection/);
    for(const name of ['Cometheart','Eclipse String','Crownfall','Nightfall','Fortune’s Fang'])assert.ok((await guide.innerText()).includes(name));
    assert.match(await page.getByRole('article',{name:'Fortune’s Fang special drop',exact:true}).innerText(),/0.25% at 1×/);
    assert.equal(await guide.locator('.rr-gear-grid').first().locator('article').count(),4);
    await page.locator('.rr-modal').screenshot({path:`artifacts/soulbound-loot-${width}.png`});await close();
    await page.getByRole('button',{name:/Entry boost/}).click();await page.getByRole('spinbutton',{name:'Entry multiple',exact:true}).fill('50');
    assert.match(await guide.innerText(),/Fortune’s Fang: 5%/);assert.match(await guide.innerText(),/128,000/);
    await page.getByRole('button',{name:'Use 50× entry',exact:true}).click();
    await page.getByRole('button',{name:/backpack/}).click();
    await page.getByRole('button').filter({has:page.locator('strong',{hasText:'Fortune’s Fang'})}).click();
    await close();assert.match(await page.locator('.rr-camp').innerText(),/160,000/);assert.match(await page.locator('.rr-gemz-perk').innerText(),/25%/);
    const icon=page.getByRole('button',{name:'weapon: Fortune’s Fang',exact:true});assert.ok(await icon.locator('svg image').count()>0);
    await select.selectOption('1');await page.getByRole('button',{name:/Entry boost/}).click();await page.getByRole('spinbutton',{name:'Entry multiple',exact:true}).fill('1');await page.getByRole('button',{name:'Use 1× entry',exact:true}).click();
    assert.match(await page.locator('.rr-camp').innerText(),/100–150 GEMZ/);assert.match(await page.locator('.rr-camp').innerText(),/125 GEMZ/);
    await page.locator('.rr-game').screenshot({path:`artifacts/fortune-camp-${width}.png`});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await page.getByRole('button',{name:'Enter · 100 RF',exact:true}).click();
    let saved;
    for(let i=0;i<35;i++){await page.clock.runFor(500);saved=await read();if(saved.accounts.guest.active.kills.length)break;}
    assert.ok(saved.accounts.guest.active.kills.length>0);assert.equal(saved.accounts.guest.active.gemzBonusBps,2500);
    assert.equal(gemzValue(saved.accounts.guest),saved.accounts.guest.active.kills.length*3.75);assert.ok(validateEconomy(saved));
    assert.equal(await page.getByTestId('gemz-balance').innerText(),gemzText(saved.accounts.guest));
    await page.reload();await page.getByRole('button',{name:'Recovering…',exact:true}).waitFor();
    const reloaded=await read();assert.equal(gemzValue(reloaded.accounts.guest),gemzValue(saved.accounts.guest));assert.ok(validateEconomy(reloaded));
    assert.equal(reloaded.accounts.guest.characters['generation:sample'].loadout.weapon,449);assert.equal(reloaded.accounts.guest.characters['generation:sample'].inventory[449],1);
    await page.getByRole('button',{name:'GEMZ → RF season ↗',exact:true}).click();assert.match(await guide.innerText(),/quarter-GEMZ remainder stays/);assert.ok((await guide.innerText()).includes(`Available: ${gemzText(reloaded.accounts.guest)} GEMZ`));await close();
    await page.getByRole('button',{name:/^Genesis · demo/}).click();assert.equal(await page.locator('.rr-gemz-perk').count(),0);assert.match(await page.locator('.rr-camp').innerText(),/80–120 GEMZ/);
    await context.close();console.log(`Soulbound guide, boosted rare odds, equipment bonus, real GEMZ drops and recovery passed (${width}px).`);
  }
  assert.deepEqual(errors,[]);
}finally{await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
