// Exercise actual gameplay through the SDK opaque-origin iframe and host save port.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,readdir,mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
import {prepareWorld,canonicalScope,SANDBOX_SAVE_KEY} from '../games/relic-run/sandbox-store.ts';
import {validateEconomy,RF} from '../games/relic-run/economy.ts';
import {project,VIEW_WIDTH,VIEW_HEIGHT} from '../games/relic-run/camera.ts';
const {installFixture,createArtworkFixture}=await import(new URL('./browser-fixture.mjs',import.meta.resolve('@rarefriends/friendsdk/testing')));
const root=new URL('../games/relic-run/.preview/',import.meta.url),files=await readdir(root);
const server=createServer(async(req,res)=>{const name=new URL(req.url,'http://local').pathname.slice(1)||'index.html';if(!files.includes(name))return res.writeHead(404).end();res.setHeader('Content-Type',name.endsWith('.html')?'text/html':name.endsWith('.css')?'text/css':'text/javascript');res.end(await readFile(new URL(name,root)));});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin='http://127.0.0.1:'+server.address().port,browser=await chromium.launch({headless:true}),errors=[];
const scope=canonicalScope('0x3333333333333333333333333333333333333333'),key='generation:7730';
await mkdir('artifacts',{recursive:true});
try{
  const context=await browser.newContext({viewport:{width:1250,height:1050},reducedMotion:'reduce'}),page=await context.newPage(),game=page.frameLocator('iframe');
  page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));
  const fixture=await installFixture(page,origin,{artworkCall:await createArtworkFixture()});
  const world=prepareWorld(null,scope,7730n,Date.now()),c=world.accounts[scope].characters[key];
  c.loadout={weapon:205,ability:275,armor:305,ring:315};for(const id of Object.values(c.loadout))c.inventory[id]=1;
  world.accounts[scope].gemz=500;world.gemzMinted=500;
  await context.addInitScript(({world,saveKey})=>{if(window===window.top&&!localStorage.getItem(saveKey))localStorage.setItem(saveKey,JSON.stringify(world));},{world,saveKey:SANDBOX_SAVE_KEY});
  await page.clock.install();await page.goto(origin);
  await page.getByRole('button',{name:'Connect wallet',exact:true}).click();
  const select=async()=>{const connect=page.getByRole('button',{name:'Connect wallet',exact:true});await connect.or(page.getByRole('button',{name:/^Friend #7730\b/})).first().waitFor();if(await connect.isVisible())await connect.click();await page.getByRole('button',{name:/^Friend #7730\b/}).click();await game.locator('.rr-game').waitFor();await game.locator('.rr-loading').waitFor({state:'detached'});};
  await select();const read=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),SANDBOX_SAVE_KEY);
  const savedWhen=async condition=>{await page.waitForFunction(({key,condition})=>{const p=Object.values(JSON.parse(localStorage.getItem(key)).accounts)[0];return condition==='chest'?p.chests===1:condition==='active'?p.active?.ended===false:p.active?.ended===true;},{key:SANDBOX_SAVE_KEY,condition},{polling:100});return read();};
  assert.equal(await page.locator('iframe').getAttribute('sandbox'),'allow-scripts');
  assert.deepEqual(await game.locator('body').evaluate(()=>{const denied={};for(const [key,run]of Object.entries({storage:()=>localStorage.getItem('x'),parent:()=>window.parent.document.body})){try{run();denied[key]=false;}catch(e){denied[key]=e.name==='SecurityError';}}return denied;}),{storage:true,parent:true});
  await page.screenshot({path:'artifacts/submission-sdk-camp.png',fullPage:true});
  await game.getByRole('button',{name:'Shop chests · from 250 GEMZ',exact:true}).click();
  // Force one host storage failure; show retry and keep the already-rolled result.
  await page.evaluate(key=>{const original=Storage.prototype.setItem;let once=true;Storage.prototype.setItem=function(k,v){if(k===key&&once){once=false;throw new DOMException('Fixture quota error','QuotaExceededError');}return original.call(this,k,v);};},SANDBOX_SAVE_KEY);
  await game.getByRole('button',{name:'Open chest · 250 GEMZ',exact:true}).click();
  await game.getByRole('button',{name:'Retry saving',exact:true}).waitFor();
  await game.getByRole('button',{name:'Retry saving',exact:true}).click();
  let saved=await savedWhen('chest');
  assert.equal(saved.accounts[scope].gemz,250);assert.ok(validateEconomy(saved));
  const item=saved.accounts[scope].lastChest;
  await game.getByRole('button',{name:'Close',exact:true}).click();
  await game.getByRole('button',{name:'Choose Friend',exact:true}).click();await select();
  assert.equal((await read()).accounts[scope].lastChest,item);
  assert.equal((await read()).accounts[scope].characters[key].inventory[item],1);
  await game.getByRole('button',{name:'Enter · 100 RF',exact:true}).click();await page.clock.runFor(100);
  await savedWhen('active');
  const route=[[720,680],[760,300],[480,180],[200,300],[200,680],[480,760]];let point=0,last=-1;
  for(let i=0;i<260;i++){
    const phase=await game.locator('.rr-game').getAttribute('data-phase');if(phase==='won')break;assert.notEqual(phase,'dead');
    if(phase==='door'){await game.getByRole('button',{name:'Face the boss',exact:true}).click();await page.clock.runFor(100);point=0;last=-1;}
    const canvas=game.locator('.rr-stage>canvas'),pos=await canvas.evaluate(e=>({x:+e.dataset.x,y:+e.dataset.y}));
    if(Math.hypot(route[point][0]-pos.x,route[point][1]-pos.y)<25)point=(point+1)%route.length;
    if(point!==last){const box=await canvas.boundingBox(),p=project(...route[point]),scale=Math.min(box.width/VIEW_WIDTH,box.height/VIEW_HEIGHT);await canvas.click({position:{x:(box.width-VIEW_WIDTH*scale)/2+p.x*scale,y:(box.height-VIEW_HEIGHT*scale)/2+p.y*scale},force:true});last=point;}
    const ability=game.getByRole('button',{name:'Use ability',exact:true});if(await ability.isEnabled())await ability.click({force:true});await page.clock.runFor(600);
  }
  assert.equal(await game.locator('.rr-game').getAttribute('data-phase'),'won');
  saved=await savedWhen('ended');
  assert.equal(saved.accounts[scope].characters[key].clears,1);assert.equal(saved.accounts[scope].active.bossClaimed,true);assert.ok(validateEconomy(saved));
  assert.equal(saved.pool.rf,80*RF);assert.ok(saved.accounts[scope].gemz>=330&&saved.accounts[scope].gemz<=370);
  await page.screenshot({path:'artifacts/submission-sdk-clear.png',fullPage:true});
  await page.reload();await select();assert.deepEqual(await read(),saved,'Boss reward is not recredited on reload');
  await game.getByRole('button',{name:'Enter · 100 RF',exact:true}).click();
  await savedWhen('active');
  await page.reload();await select();saved=await read();
  assert.equal(saved.accounts[scope].active.ended,true);assert.ok(saved.accounts[scope].characters[key].lockedUntil>Date.now());
  assert.equal(saved.accounts[scope].characters[key].inventory[205],0);
  assert.equal(await game.getByRole('button',{name:'Recovering…',exact:true}).isDisabled(),true);
  assert.deepEqual(errors,[]);assert.deepEqual(fixture.errors,[]);
  await context.close();console.log('PASS: SDK sandbox isolation, durable chest + failed-save retry, selection/reload restoration, full boss clear, exact pool funding, unfinished-run death and cooldown.');
}finally{await browser.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
