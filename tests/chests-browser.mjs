import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
import {CHESTS,gemzLabel} from '../games/relic-run/chests.ts';
import {createEconomy,character,validateEconomy} from '../games/relic-run/economy.ts';
import {CHEST_GEAR,gearFor} from '../games/relic-run/gear.ts';

await mkdir('artifacts',{recursive:true});
const server=createServer(async(req,res)=>{const file=new URL(req.url,'http://local').pathname.slice(1)||'index.html';if(!['index.html','game.js','game.css'].includes(file))return res.writeHead(404).end();res.setHeader('Content-Type',file.endsWith('.html')?'text/html':file.endsWith('.js')?'text/javascript':'text/css');res.end(await readFile(new URL('../games/relic-run/.guest/'+file,import.meta.url)));});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port,browser=await chromium.launch({headless:true}),errors=[],key='relic-run:world:v3';
const world=createEconomy(),friend=character(world,'guest','generation:sample');for(const g of CHEST_GEAR)friend.inventory[g.id]=1;world.accounts.guest.gemz=1100000;world.gemzMinted=1100000;
const models=JSON.parse(await readFile('games/relic-run/art/models/lowpoly/icons.json','utf8')),frames=JSON.parse(await readFile('games/relic-run/art/models/lowpoly/frames.json','utf8'));
try{
  for(const width of [1100,390]){
    const context=await browser.newContext({viewport:{width,height:850},reducedMotion:'no-preference'});
    await context.addInitScript(({world,key})=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(world));window.__chestEntropy=0;crypto.getRandomValues=values=>{values.fill(window.__chestEntropy);return values;};},{world,key});
    const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.clock.install();await page.goto(origin);await page.waitForFunction(()=>!document.querySelector('.rr-loading'));
    const read=()=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);
    for(const id of [201,211,221,231,205]){
      await page.getByRole('button',{name:/^weapon:/}).click();await page.locator('button.rr-gear-card').filter({has:page.getByText(gearFor(id).name,{exact:true})}).click();await page.getByRole('button',{name:'Close',exact:true}).click();
      const icon=page.locator('.rr-equipped-slot').first().locator('svg[data-model]'),f=frames[id];
      assert.equal(await icon.getAttribute('data-sprite-id'),String(id));assert.equal(await icon.locator('image').getAttribute('href'),models[id].src);assert.equal(await icon.getAttribute('viewBox'),`${f.x} ${f.y} ${f.size} ${f.size}`);
      assert.ok((await icon.boundingBox()).width>=39,'equipment artwork is large enough to identify');
    }
    await page.locator('.rr-camp-dock').screenshot({path:`artifacts/lowpoly-equipped-${width}.png`});
    await page.getByRole('button',{name:'Shop chests · from 250 GEMZ',exact:true}).click();
    assert.equal(await page.locator('.rr-chest-choices button').count(),4);
    await page.locator('.rr-game').screenshot({path:`artifacts/chest-store-${width}.png`});
    let count=0;
    for(const chest of CHESTS){
      await page.locator('.rr-chest-choices').getByRole('button',{name:new RegExp('^'+chest.name)}).click();
      assert.equal(await page.locator('.rr-chest-odds').innerText(),chest.odds.map(o=>`T${o.tier}\n${o.chancePpm/10000}%`).join('\n'));
      const before=await read();await page.getByRole('button',{name:`Open chest · ${gemzLabel(chest.cost)} GEMZ`,exact:true}).click();count++;
      await page.clock.runFor(100);let saved=await read();assert.ok(validateEconomy(saved));assert.equal(saved.accounts.guest.gemz,before.accounts.guest.gemz-chest.cost);assert.equal(saved.accounts.guest.chests,count);
      const reveal=page.getByRole('region',{name:'Chest result'});assert.equal(await reveal.getAttribute('data-phase'),'charging');assert.equal(saved.accounts.guest.chestReceipt.chest,chest.id);assert.equal(saved.accounts.guest.chestReceipt.revealed,false);assert.equal(gearFor(saved.accounts.guest.lastChest).tier,chest.floor);
      assert.equal(await page.getByRole('button',{name:/^Open chest/}).count(),0,'repeat purchases unavailable during reveal');
      if(chest.id==='overgrowth'){
        // Save + reopen, then reload + resume, all without a second purchase.
        await page.getByRole('button',{name:'Close',exact:true}).click();await page.getByRole('button',{name:'Shop chests · from 250 GEMZ',exact:true}).click();assert.equal((await read()).accounts.guest.chests,count);
        await page.reload();await page.waitForFunction(()=>!document.querySelector('.rr-loading'));await page.getByRole('button',{name:'Shop chests · from 250 GEMZ',exact:true}).click();await page.clock.runFor(100);
        assert.deepEqual(await read(),saved);
      }
      await page.clock.runFor(2450);assert.equal(await reveal.getAttribute('data-phase'),'unlocking');
      if(chest.id==='prismatic')await reveal.screenshot({path:`artifacts/chest-opening-${width}.png`});
      await page.clock.runFor(1600);assert.equal(await reveal.getAttribute('data-phase'),'emerging');
      await page.clock.runFor(1700);assert.equal(await reveal.getAttribute('data-phase'),'ready');assert.equal((await read()).accounts.guest.chestReceipt.revealed,false);assert.equal(await page.getByRole('region',{name:'Compare chest loot'}).count(),0);
      await page.getByRole('button',{name:'Reveal treasure',exact:true}).click();assert.equal(await reveal.getAttribute('data-phase'),'revealed');
      const after=await read();assert.equal(after.accounts.guest.chestReceipt.revealed,true);saved.accounts.guest.chestReceipt.revealed=true;assert.deepEqual(after,saved,'presentation only acknowledges the receipt');
      assert.equal(await reveal.locator('.rr-chest-prize svg').getAttribute('data-sprite-id'),String(after.accounts.guest.lastChest));
      await page.getByRole('region',{name:'Compare chest loot'}).screenshot({path:`artifacts/chest-${chest.id}-compare-${width}.png`});
      const original=after.accounts.guest.characters['generation:sample'].loadout.weapon;await page.getByRole('button',{name:'Equip to Generation · demo',exact:true}).click();const equipped=await read();assert.equal(equipped.accounts.guest.characters['generation:sample'].loadout.weapon,after.accounts.guest.lastChest);assert.ok(equipped.accounts.guest.characters['generation:sample'].inventory[original]>0);assert.ok(validateEconomy(equipped));
      await reveal.screenshot({path:`artifacts/chest-${chest.id}-result-${width}.png`});
      assert.equal(await page.locator('.rr-modal-body').evaluate(e=>e.scrollWidth>e.clientWidth),false);
    }
    // Force a T5 on the base chest, then verify the skip never rerolls it.
    await page.locator('.rr-chest-choices').getByRole('button',{name:/^Overgrowth chest/}).click();await page.evaluate(()=>{window.__chestEntropy=999999;});
    await page.getByRole('button',{name:'Open chest · 250 GEMZ',exact:true}).click();await page.clock.runFor(100);const t5=await read();assert.equal(gearFor(t5.accounts.guest.lastChest).tier,5);
    await page.getByRole('button',{name:'Skip to reveal',exact:true}).click();await page.clock.runFor(200);assert.equal(await page.locator('.rr-chest-reveal').getAttribute('data-phase'),'revealed');
    await page.locator('.rr-chest-reveal').screenshot({path:`artifacts/chest-legendary-${width}.png`});
    const after=await read();t5.accounts.guest.chestReceipt.revealed=true;assert.deepEqual(after,t5);
    await page.getByRole('button',{name:'Close',exact:true}).click();await page.getByRole('button',{name:'How to play',exact:true}).click();await page.getByLabel('Reduce motion').check();await page.getByRole('button',{name:'Close',exact:true}).click();
    await page.getByRole('button',{name:'Shop chests · from 250 GEMZ',exact:true}).click();await page.getByRole('button',{name:'Open chest · 250 GEMZ',exact:true}).click();await page.clock.runFor(100);assert.equal(await page.locator('.rr-chest-reveal').getAttribute('data-phase'),'revealed');assert.equal((await read()).accounts.guest.chests,6);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await context.close();
    console.log(`Chests ${width}px: original Blender art, all prices/floors, 5.6s buildup + manual reveal and compare/equip, T5, skip, close/reload recovery, reduced motion and exact debits passed.`);
  }
  assert.deepEqual(errors,[]);
}finally{await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
