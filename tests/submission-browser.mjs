// Automated wallet/RPC fixtures only; never included in the public build.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,readdir,mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
import {createHash} from 'node:crypto';
const {installFixture,createArtworkFixture,SECOND_OWNER}=await import(new URL('./browser-fixture.mjs',import.meta.resolve('@rarefriends/friendsdk/testing')));
const root=new URL('../games/relic-run/.preview/',import.meta.url),files=await readdir(root);
assert.deepEqual(files.sort(),['.nojekyll','game.css','game.html','game.js','host.css','host.js','index.html'],'Public output has no guest page or test fixtures');
for(const [html,name] of [['index.html','host'],['game.html','game']]){
  const source=await readFile(new URL(html,root),'utf8');
  for(const ext of ['js','css']){const hash=createHash('sha256').update(await readFile(new URL(`${name}.${ext}`,root))).digest('hex').slice(0,16);assert.ok(source.includes(`./${name}.${ext}?v=${hash}`),'Each release references its current asset hashes');}
}
const server=createServer(async(req,res)=>{
  const name=new URL(req.url,'http://local').pathname.slice(1)||'index.html';
  if(!files.includes(name))return res.writeHead(404).end();
  res.setHeader('Content-Type',name.endsWith('.html')?'text/html':name.endsWith('.css')?'text/css':'text/javascript');
  res.end(await readFile(new URL(name,root)));
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin='http://127.0.0.1:'+server.address().port,browser=await chromium.launch({headless:true}),errors=[];
await mkdir('artifacts',{recursive:true});
try{
  const embedded=await browser.newContext(),embedPage=await embedded.newPage();
  await embedPage.goto(origin);
  await embedPage.evaluate(()=>{document.body.replaceChildren(Object.assign(document.createElement('iframe'),{src:location.href}));});
  await embedPage.frameLocator('iframe').getByRole('heading',{name:'Open Relic Run directly.'}).waitFor();
  assert.equal(await embedPage.frameLocator('iframe').locator('.rr-friend-list').count(),0,'Embedded host does not mount wallet UI');
  await embedded.close();
  for(const width of [1100,390]){
    const context=await browser.newContext({viewport:{width,height:850},reducedMotion:'reduce'}),page=await context.newPage();
    const game=page.frameLocator('iframe');page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));
    const fixture=await installFixture(page,origin,{artworkCall:await createArtworkFixture()});
    if(width===1100)await page.addInitScript(()=>{const request=window.ethereum.request.bind(window.ethereum);let stall=true;window.ethereum.request=args=>{if(args.method==='eth_accounts'&&stall){stall=false;return new Promise(()=>{});}return request(args);};});
    let artworkFails=false;
    await page.route(/^https:\/\/rpc\.mainnet\.chain\.robinhood\.com\/?$/,async route=>{
      if(route.request().method()!=='POST')return route.fallback();
      const body=route.request().postDataJSON(),reads=Array.isArray(body)?body:[body];
      if(!artworkFails||!reads.every(r=>r.method==='eth_call'&&r.params[0].to.toLowerCase()==='0x246e3e9730a7eade94c79be0fd78d210f89aeb8d'))return route.fallback();
      const errors=reads.map(r=>({jsonrpc:'2.0',id:r.id,error:{code:-32001,message:'Artwork fixture unavailable'}}));
      return route.fulfill({json:Array.isArray(body)?errors:errors[0],headers:{'access-control-allow-origin':'*'}});
    });
    await page.goto(origin+'/?mode=guest');
    if(width===1100){await page.getByRole('button',{name:'Cancel connection',exact:true}).click();assert.equal(await page.locator('iframe').count(),0,'A stalled restore can be cancelled without opening the game');}
    await page.getByRole('button',{name:'Connect wallet',exact:true}).waitFor();
    assert.equal(await page.locator('iframe').count(),0,'Query parameters cannot bypass ownership');
    assert.equal(await page.getByRole('link',{name:'Back to guest play'}).count(),0);
    assert.equal(await page.locator('.rr-friend-list button').count(),0);
    await page.locator('.rr-wallet-screen').screenshot({path:`artifacts/submission-connect-${width}.png`});
    await page.getByRole('button',{name:'Connect wallet',exact:true}).click();
    await page.getByRole('button',{name:/^Friend #7730\b/}).waitFor();
    assert.equal(await page.locator('iframe').count(),0,'Connection does not automatically choose a Friend');
    await page.getByRole('button',{name:/^Friend #7730\b/}).click();
    await game.getByRole('button',{name:'Enter · 100 RF',exact:true}).waitFor();
    await game.locator('.rr-loading').waitFor({state:'detached'});
    assert.equal(await game.locator('.rr-game').getAttribute('data-avatar-id'),'7730');
    assert.match(await game.getByTestId('rf-balance').locator('..').innerText(),/test RF/);
    assert.equal(await game.locator('.rr-game').getAttribute('data-friend-wallet'),'0x3333333333333333333333333333333333333333');
    assert.ok(await game.getByRole('button',{name:'Enter · 100 RF',exact:true}).isEnabled());
    const frameBox=await page.locator('.rf-game-frame').boundingBox();
    assert.ok(frameBox.width<=960&&frameBox.height<=640,'Submission viewport stays within 960 × 640');
    assert.ok(await game.getByRole('button',{name:'Enter · 100 RF',exact:true}).isVisible());
    assert.equal(await game.locator('body').evaluate(()=>document.documentElement.scrollHeight>innerHeight||document.documentElement.scrollWidth>innerWidth),false,'The sandbox itself does not overflow');
    await game.locator('.rr-game').screenshot({path:`artifacts/submission-owned-friend-${width}.png`});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await game.getByRole('button',{name:'Choose Friend',exact:true}).click();

    artworkFails=true;
    await page.getByRole('button',{name:/^Friend #7730\b/}).click();
    await game.getByText('Your Friend artwork could not load. Retry from the character picker.',{exact:true}).waitFor();
    assert.equal(await game.getByRole('button',{name:'Enter · 100 RF',exact:true}).isEnabled(),false,'Missing avatar blocks entry');
    artworkFails=false;
    await game.getByRole('button',{name:'Retry Friend selection',exact:true}).click();

    fixture.mode='unhardwired';
    await page.getByRole('button',{name:/^Friend #7730\b/}).click();
    await page.getByText('You must own this hardwired Friend to play.',{exact:true}).waitFor();
    assert.equal(await page.locator('iframe').count(),0);
    fixture.mode='owner-changed';
    await page.getByRole('button',{name:/^Friend #7730\b/}).click();
    await page.getByText('You must own this hardwired Friend to play.',{exact:true}).waitFor();
    assert.equal(await page.locator('iframe').count(),0,'Transferred NFT cannot reuse a discovery result');
    fixture.mode='eligible';
    await page.getByRole('button',{name:/^Friend #7730\b/}).click();
    await game.locator('.rr-game').waitFor();await game.locator('.rr-loading').waitFor({state:'detached'});
    await page.evaluate(()=>window.__friendWalletTest.chain('0x1'));
    await page.getByRole('button',{name:'Switch to Robinhood',exact:true}).waitFor();
    assert.equal(await page.locator('iframe').count(),0);
    await page.getByRole('button',{name:'Switch to Robinhood',exact:true}).click();
    await page.getByRole('button',{name:/^Friend #7730\b/}).waitFor();
    fixture.mode='unowned';
    await page.getByRole('button',{name:'Refresh Friends',exact:true}).click();
    await page.getByText('No playable Rare Friends found in this wallet on Robinhood.',{exact:true}).waitFor();
    assert.equal(await page.locator('iframe').count(),0);
    fixture.mode='eligible';
    await page.getByRole('button',{name:'Refresh Friends',exact:true}).click();
    await page.getByRole('button',{name:/^Friend #7730\b/}).waitFor();
    fixture.mode='loading';fixture.hold=new Promise(resolve=>{fixture.release=resolve;});
    await page.getByRole('button',{name:/^Friend #7730\b/}).click();
    await page.evaluate(account=>window.__friendWalletTest.accounts([account]),SECOND_OWNER);
    fixture.mode='eligible';fixture.release();
    await page.getByRole('button',{name:/^Friend #3412\b/}).waitFor();
    assert.equal(await page.locator('iframe').count(),0,'Late ownership result cannot mount the previous wallet’s game');
    assert.ok((await page.evaluate(()=>window.__friendWalletTest.state.requests)).every(method=>['eth_accounts','eth_requestAccounts','eth_chainId','wallet_switchEthereumChain'].includes(method)));
    assert.deepEqual(fixture.errors,[]);await context.close();
    console.log(`PASS: public preview ${width}px — gate, canonical avatar/wallet, no guest bypass, nonowner/generation-zero/wrong-network/stale-read rejection, no signing.`);
  }
  assert.deepEqual(errors,[]);
}finally{await browser.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
