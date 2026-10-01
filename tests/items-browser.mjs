import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
import {createEconomy,account,character,validateEconomy} from '../games/relic-run/economy.ts';
import {CHEST_GEAR,SLOTS,TIERS,EMPTY_LOADOUT} from '../games/relic-run/gear.ts';

await mkdir('artifacts',{recursive:true});
const mime={'/':'text/html','/game.js':'text/javascript','/game.css':'text/css'};
const server=createServer(async(req,res)=>{
  const path=new URL(req.url,'http://localhost').pathname;
  if(!mime[path])return res.writeHead(404).end();
  try{res.writeHead(200,{'Content-Type':mime[path]});res.end(await readFile(new URL('../games/relic-run/.guest/'+(path==='/'?'index.html':path.slice(1)),import.meta.url)));}catch{res.writeHead(500).end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const url='http://127.0.0.1:'+server.address().port,browser=await chromium.launch({headless:true}),errors=[];
const saveKey='relic-run:world:v3',friend='generation:sample',world=createEconomy();
const purse=account(world,'guest'),player=character(world,'guest',friend);
for(const g of CHEST_GEAR)player.inventory[g.id]=1;
purse.gemz=250;world.gemzMinted=250;assert.ok(validateEconomy(world));
try{
  for(const width of [1100,390]){
    const context=await browser.newContext({viewport:{width,height:850},reducedMotion:'reduce',hasTouch:width<500});
    await context.addInitScript(({saveKey,world})=>{if(!localStorage.getItem(saveKey))localStorage.setItem(saveKey,JSON.stringify(world));},{saveKey,world});
    const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
    await page.clock.install();await page.goto(url);await page.getByRole('button',{name:'Enter · 100 RF',exact:true}).waitFor();
    const readSave=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),saveKey);
    await page.getByRole('button',{name:'Shop chests · from 250 GEMZ',exact:true}).click();
    await page.getByText('Browse all 75 chest items',{exact:true}).click();
    const catalog=page.getByRole('region',{name:'Chest item catalog'});
    const seen=new Set();
    for(const slot of SLOTS){
      await catalog.getByRole('button',{name:slot,exact:true}).click();
      for(const tier of TIERS){
        await catalog.getByRole('button',{name:'T'+tier,exact:true}).click();
        const expected=CHEST_GEAR.filter(g=>g.slot===slot&&g.tier===tier);
        assert.equal(await catalog.locator('article').count(),expected.length);
        assert.deepEqual((await catalog.locator('svg[data-model]').evaluateAll(nodes=>nodes.map(n=>n.dataset.model))).sort(),expected.map(g=>g.itemType).sort(),'Every catalog item must use its Blender render');
        for(const g of expected){assert.equal(await catalog.getByText(g.name,{exact:true}).count(),1);seen.add(g.id);}
        assert.equal(await page.locator('.rr-modal-body').evaluate(e=>e.scrollWidth>e.clientWidth),false);
        const bounds=await page.getByRole('dialog').boundingBox();assert.ok(bounds.y>=0&&bounds.y+bounds.height<=850,'catalog must stay inside the viewport');
      }
    }
    assert.equal(seen.size,75);
    await catalog.getByRole('button',{name:'weapon',exact:true}).click();
    await catalog.getByRole('button',{name:'T1',exact:true}).click();
    await catalog.scrollIntoViewIfNeeded();
    await page.locator('.rr-game').screenshot({path:`artifacts/items-${width<500?'mobile':'desktop'}.png`});
    await page.getByRole('button',{name:'Open chest · 250 GEMZ',exact:true}).click();await page.clock.runFor(800);
    let saved=await readSave();assert.equal(saved.accounts.guest.gemz,0);assert.equal(saved.gemzBurned,250);
    assert.ok(CHEST_GEAR.some(g=>g.id===saved.accounts.guest.lastChest));assert.ok(validateEconomy(saved));
    await page.getByRole('button',{name:'Close',exact:true}).click();
    for(const type of ['wand','bow','sword','dagger','dash','shield','bash','heal','robe','light','heavy','health','attack','dexterity','speed']){
      const g=CHEST_GEAR.find(g=>g.itemType===type&&g.tier===5);
      await page.getByRole('button',{name:new RegExp('^'+g.slot+':')}).click();
      await page.locator('button.rr-gear-card').filter({has:page.getByText(g.name,{exact:true})}).click();
      assert.equal((await readSave()).accounts.guest.characters[friend].loadout[g.slot],g.id);
      await page.getByRole('button',{name:'Close',exact:true}).click();
    }
    await page.reload();await page.getByRole('button',{name:'Enter · 100 RF',exact:true}).waitFor();
    assert.deepEqual((await readSave()).accounts.guest.characters[friend].loadout,{weapon:235,ability:275,armor:305,ring:345});
    // Exercise the new shield and bow renderer through the real UI.
    for(const type of ['bow','shield']){
      const g=CHEST_GEAR.find(g=>g.itemType===type&&g.tier===1);
      await page.getByRole('button',{name:new RegExp('^'+g.slot+':')}).click();
      await page.locator('button.rr-gear-card').filter({has:page.getByText(g.name,{exact:true})}).click();
      await page.getByRole('button',{name:'Close',exact:true}).click();
    }
    await page.getByRole('button',{name:'Enter · 100 RF',exact:true}).click();await page.clock.runFor(100);
    // HUD snapshots update every >100ms; allow a full interval after activation.
    await page.getByRole('button',{name:'Use ability',exact:true}).click();await page.clock.runFor(200);
    assert.match(await page.getByRole('button',{name:'Use ability',exact:true}).textContent(),/SHIELD.*1 HIT/);
    assert.ok(await page.getByRole('button',{name:'Use ability',exact:true}).isDisabled());
    await page.locator('.rr-game').screenshot({path:`artifacts/shield-${width<500?'mobile':'desktop'}.png`});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    saved=await readSave();assert.notDeepEqual(saved.accounts.guest.characters[friend].loadout,EMPTY_LOADOUT);
    await context.close();
  }
  assert.deepEqual(errors,[]);console.log('Desktop + mobile: 75 catalog entries, all 15 types equipped, chest debit/result, save reload, shield controls/rendering; no overflow or browser errors.');
}finally{await browser.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
