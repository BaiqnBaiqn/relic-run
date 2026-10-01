import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
import {createEconomy,account,character,contribute,RF,validateEconomy} from '../games/relic-run/economy.ts';

await mkdir('artifacts',{recursive:true});
const mime={'/':'text/html','/game.js':'text/javascript','/game.css':'text/css'};
const server=createServer(async(req,res)=>{
  const path=new URL(req.url,'http://localhost').pathname;
  if(!mime[path])return res.writeHead(404).end();
  try{res.writeHead(200,{'Content-Type':mime[path]});res.end(await readFile(new URL('../games/relic-run/.guest/'+(path==='/'?'index.html':path.slice(1)),import.meta.url)));}catch{res.writeHead(500).end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const url='http://127.0.0.1:'+server.address().port,browser=await chromium.launch({headless:true}),errors=[];
const saveKey='relic-run:world:v3',world=createEconomy();
const purse=account(world,'guest');character(world,'guest','generation:sample');
purse.rf-=50*RF;purse.gemz=500;world.pool.rf=40*RF;world.jackpots[1]=7.5*RF;world.ecosystem=2.5*RF;
world.entries=5;world.nextEntry=6;account(world,'other').gemz=100;world.gemzMinted=600;
contribute(world,'other',100,Date.now());assert.ok(validateEconomy(world));
try{
  for(const width of [1100,390]){
    const context=await browser.newContext({viewport:{width,height:850},reducedMotion:'reduce',hasTouch:width<500});
    await context.addInitScript(({saveKey,world})=>{if(!localStorage.getItem(saveKey))localStorage.setItem(saveKey,JSON.stringify(world));},{saveKey,world});
    const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.clock.install();await page.goto(url);
    await page.getByRole('button',{name:'Enter · 100 RF',exact:true}).waitFor();
    const suffix=width<500?'mobile':'desktop';
    const readSave=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),saveKey);
    const checkPanel=async()=>{
      const body=page.locator('.rr-modal-body');assert.equal(await body.evaluate(e=>e.scrollWidth>e.clientWidth),false);
      assert.doesNotMatch(await page.getByRole('dialog').innerText(),/stak(?:e|ed|ing)/i);
      const box=await page.getByRole('dialog').boundingBox();assert.ok(box.y>=0&&box.y+box.height<=850);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    };
    await page.locator('.rr-game').screenshot({path:`artifacts/color-camp-${suffix}.png`});
    await page.getByRole('button',{name:'RF / GEMZ cycle ↗',exact:true}).click();await checkPanel();
    assert.match(await page.getByRole('dialog').innerText(),/95% is the player funding allocation/);
    await page.locator('.rr-game').screenshot({path:`artifacts/color-cycle-${suffix}.png`});
    await page.getByRole('button',{name:'Close',exact:true}).click();
    await page.getByRole('button',{name:'Explore levels 2–5 ↗',exact:true}).click();
    assert.equal(await page.locator('.rr-expedition').count(),5);
    for(const card of await page.locator('.rr-expedition').all()){
      await card.locator('summary').click();await card.scrollIntoViewIfNeeded();await checkPanel();
      assert.match(await card.innerText(),/0.25%/);assert.equal(await card.getByRole('button').count(),1);
    }
    assert.equal((await readSave()).accounts.guest.rf,450*RF);
    await page.locator('.rr-modal-body').evaluate(e=>{e.scrollTop=0;});
    await page.locator('.rr-game').screenshot({path:`artifacts/color-expeditions-${suffix}.png`});
    await page.getByRole('button',{name:'Close',exact:true}).click();
    await page.getByRole('button',{name:'GEMZ → RF season ↗',exact:true}).click();await checkPanel();
    assert.match(await page.locator('.rr-quote').innerText(),/20 RF estimated total/);
    await page.locator('.rr-game').screenshot({path:`artifacts/color-redeem-${suffix}.png`});
    await page.getByRole('button',{name:'Contribute GEMZ',exact:true}).click();
    assert.equal((await readSave()).accounts.guest.gemz,400);
    assert.equal(await page.getByText('100 GEMZ committed · 20 RF estimated',{exact:true}).count(),1);
    assert.equal(await page.getByRole('button',{name:'Settle demo round now',exact:true}).count(),0);
    const remaining=await page.evaluate(deadline=>deadline-Date.now(),world.pool.closesAt);await page.clock.fastForward(remaining+1000);await page.clock.runFor(100);
    let saved=await readSave();assert.equal(saved.accounts.guest.rf,470*RF);assert.equal(saved.accounts.other.rf,520*RF);
    assert.equal(saved.gemzBurned,200);assert.ok(validateEconomy(saved));
    assert.match(await page.locator('.rr-pool-hero').innerText(),/24-HOUR SEASON 2/);assert.equal(await page.locator('.rr-share-track').getAttribute('aria-label'),'Your projected share: 0.00 percent');
    const history=page.getByRole('region',{name:'Season payout history'});assert.match(await history.innerText(),/Season 1/);assert.equal(await history.locator('tbody tr td').last().innerText(),'20');await checkPanel();
    await page.locator('.rr-game').screenshot({path:`artifacts/season-settlement-${suffix}.png`});
    await page.reload();await page.getByRole('button',{name:'Enter · 100 RF',exact:true}).waitFor();
    assert.equal((await readSave()).accounts.guest.rf,470*RF);
    await page.getByRole('button',{name:'Shop chests · from 250 GEMZ',exact:true}).click();
    await page.getByRole('button',{name:'Open chest · 250 GEMZ',exact:true}).click();await page.clock.runFor(100);assert.equal((await readSave()).accounts.guest.gemz,150);assert.ok(await page.getByRole('button',{name:'Open chest · 250 GEMZ',exact:true}).isDisabled());await checkPanel();
    await context.close();
  }
  assert.deepEqual(errors,[]);console.log('Desktop + mobile: RF cycle, five playable expedition cards, preview → contribution → settlement → reload, no double spend, no obsolete copy, no overflow or errors.');
}finally{await browser.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
