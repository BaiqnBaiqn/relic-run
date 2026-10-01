// Automated read-only fixtures only. Nothing from this file enters game builds.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
import {decodeFunctionData,encodeFunctionResult,encodeEventTopics,padHex,parseAbi,zeroAddress} from 'viem';
import {GENERATION_SPRITE_MANIFEST as manifest,FAMILIES_REGISTRY_ABI} from '@rarefriends/friendsdk/sprites';
import {sampleFriendSprites} from '../games/relic-run/art/friend-sample.ts';
import {createEconomy,character,validateEconomy} from '../games/relic-run/economy.ts';
import {gearFor} from '../games/relic-run/gear.ts';
import {GENESIS,GENESIS_ABI} from '../games/relic-run/identity.ts';

// Reuse the pinned SDK's read-only browser provider; extend its RPC fixture to two NFTs.
const {installFixture,OWNER,SECOND_OWNER,FRIEND_WALLET}=await import(new URL('./browser-fixture.mjs',import.meta.resolve('@rarefriends/friendsdk/testing')));
const abi=parseAbi(['event Transfer(address indexed from,address indexed to,uint256 indexed tokenId)',
  'function balanceOf(address) view returns (uint256)','function ownerOf(uint256) view returns (address)',
  'function generation(uint256) view returns (uint8)','function tokenBoundAccount(uint256) view returns (address)']);
const block=manifest.transferStartBlock+100n,tokenIds=[3412n,7730n];
const root=new URL('../games/relic-run/.guest/',import.meta.url);
const allowed=new Set(['index.html','game.js','game.css','wallet/index.html','wallet/game.js','wallet/game.css']);
const server=createServer(async(req,res)=>{
  const name=new URL(req.url,'http://localhost').pathname.slice(1)||'index.html';
  if(!allowed.has(name))return res.writeHead(404).end();
  const type=name.endsWith('.html')?'text/html':name.endsWith('.css')?'text/css':'text/javascript';
  try{res.writeHead(200,{'Content-Type':type,'Access-Control-Allow-Origin':'*'});res.end(await readFile(new URL(name,root)));}
  catch{res.writeHead(500).end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin=`http://127.0.0.1:${server.address().port}`,browser=await chromium.launch({headless:true});
const errors=[];let ownerReads=0,genesisOwner=OWNER,secondOwns=false;
const saveKey='relic-run:world:v3',scope='wallet:'+OWNER.toLowerCase();
const world=createEconomy(),savedFriend=character(world,scope,'generation:3412');
savedFriend.inventory[201]=1;savedFriend.loadout.weapon=201;savedFriend.potions['minor:health']='9';world.accounts[scope].gemz=500;world.gemzMinted=500;
assert.ok(validateEconomy(world));
const genesisPortrait='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8"><path d="M1 1h6v6H1z" fill="#111"/><path d="M2 3h1v1H2zm3 0h1v1H5z" fill="#fff"/></svg>');
await mkdir('artifacts',{recursive:true});
try{
  const context=await browser.newContext({viewport:{width:1100,height:850},reducedMotion:'reduce'});
  await context.addInitScript(({world,key})=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(world));},{world,key:saveKey});
  const page=await context.newPage();page.setDefaultTimeout(15000);
  page.on('pageerror',error=>errors.push(error.message));
  const fixture=await installFixture(page,origin);
  await page.route(/^https:\/\/rpc\.mainnet\.chain\.robinhood\.com\/?$/,async route=>{
    try{
      if(route.request().method()==='OPTIONS')return route.fulfill({status:204,headers:{'access-control-allow-origin':'*','access-control-allow-methods':'POST,OPTIONS','access-control-allow-headers':'content-type'}});
      const answer=request=>{
        let result;
        if(request.method==='eth_chainId')result='0x1237';
        else if(request.method==='eth_blockNumber')result=`0x${block.toString(16)}`;
        else if(request.method==='eth_getLogs'){
          const filter=request.params[0];assert.ok([manifest.generations,GENESIS].map(a=>a.toLowerCase()).includes(filter.address.toLowerCase()));
          assert.ok(filter.topics[1]||filter.topics[2],'Discovery is owner-filtered');
          const recipient=filter.topics[2]?.toLowerCase();
          const isGenesis=filter.address.toLowerCase()===GENESIS.toLowerCase(),ids=isGenesis?[652n]:secondOwns?[7730n]:tokenIds;
          const targetOwner=!isGenesis&&secondOwns?SECOND_OWNER:OWNER;
          result=recipient===padHex(targetOwner,{size:32}).toLowerCase()&&BigInt(filter.fromBlock)<=block-1n&&BigInt(filter.toBlock)>=block-1n?ids.map((id,index)=>({
            address:filter.address,blockNumber:`0x${(block-1n).toString(16)}`,blockHash:padHex('0x2',{size:32}),
            transactionHash:padHex('0x1',{size:32}),transactionIndex:'0x0',logIndex:`0x${index.toString(16)}`,removed:false,data:'0x',
            topics:encodeEventTopics({abi,eventName:'Transfer',args:{from:zeroAddress,to:targetOwner,tokenId:id}}),
          })):[];
        }else if(request.method==='eth_call'){
          const call=request.params[0];
          if(call.to.toLowerCase()===GENESIS.toLowerCase()){
            const {functionName,args}=decodeFunctionData({abi:GENESIS_ABI,data:call.data});let value;
            if(functionName==='balanceOf')value=args[0].toLowerCase()===OWNER.toLowerCase()?1n:0n;
            else if(functionName==='ownerOf'){ownerReads++;value=genesisOwner;}
            else if(functionName==='tokenURI')value='data:application/json;base64,'+Buffer.from(JSON.stringify({image:genesisPortrait})).toString('base64');
            else throw new Error('Unexpected Genesis read');
            result=encodeFunctionResult({abi:GENESIS_ABI,functionName,result:value});
          }else if(call.to.toLowerCase()===manifest.generations.toLowerCase()){
            const {functionName,args}=decodeFunctionData({abi,data:call.data});let value;
            if(functionName==='balanceOf')value=args[0].toLowerCase()===(secondOwns?SECOND_OWNER:OWNER).toLowerCase()?(secondOwns?1n:2n):0n;
            else{
              assert.ok(tokenIds.includes(args[0]));
              if(functionName==='ownerOf'){ownerReads++;value=secondOwns?SECOND_OWNER:OWNER;}
              else if(functionName==='generation')value=1;
              else if(functionName==='tokenBoundAccount')value=args[0]===7730n?FRIEND_WALLET:'0x4444444444444444444444444444444444444444';
              else throw new Error('Unexpected collection read');
            }
            result=encodeFunctionResult({abi,functionName,result:value});
          }else{
            assert.equal(call.to.toLowerCase(),manifest.registry.toLowerCase());
            const {functionName,args}=decodeFunctionData({abi:FAMILIES_REGISTRY_ABI,data:call.data});let value;
            if(functionName==='familyOf')value=sampleFriendSprites(args[0]).familyId;
            else if(functionName==='seedOf')value=sampleFriendSprites(args[0]).seed;
            else if(functionName==='frames'){
              const sample=tokenIds.map(sampleFriendSprites).find(s=>s.familyId===args[0]&&s.seed===args[1]);assert.ok(sample);value=sample.frames;
            }else throw new Error('Unexpected artwork read');
            result=encodeFunctionResult({abi:FAMILIES_REGISTRY_ABI,functionName,result:value});
          }
        }else throw new Error(`Unexpected RPC method: ${request.method}`);
        return {jsonrpc:'2.0',id:request.id,result};
      };
      const body=route.request().postDataJSON();
      await route.fulfill({json:Array.isArray(body)?body.map(answer):answer(body),headers:{'access-control-allow-origin':'*'}});
    }catch(error){errors.push(error.message);await route.abort();}
  });

  await page.goto(origin);
  assert.equal((await page.evaluate(()=>window.__friendWalletTest.state.requests)).length,0,'Guest entry does not touch a wallet');
  await page.getByRole('link',{name:'Connect wallet',exact:true}).click();
  await page.getByRole('button',{name:/^Connect (wallet|Browser wallet)$/}).click();
  await page.locator('.rr-friend-list button').nth(2).waitFor();
  assert.equal(await page.locator('.rr-friend-list button').count(),3);
  assert.equal(await page.locator('.rr-game').count(),0,'No automatic selection, even after connection');
  await page.locator('.rr-wallet-screen').screenshot({path:'artifacts/wallet-choose-friend.png'});
  const before=ownerReads;
  await page.getByRole('button',{name:/^Friend #3412\b/}).click();
  const game=page;
  await game.locator('.rr-game[data-avatar-id="3412"]').waitFor();
  assert.ok(ownerReads>before,'Fresh ownership check after selection');
  const portrait=game.getByRole('img',{name:'Friend #3412 avatar',exact:true});
  await portrait.waitFor();
  const expected=sampleFriendSprites(3412n).clips.idle.down[0].rows.flatMap((row,y)=>[...row].flatMap((pixel,x)=>pixel==='#'?[[String(x),String(y)]]:[]));
  assert.deepEqual(await portrait.locator('rect').evaluateAll(rects=>rects.map(r=>[r.getAttribute('x'),r.getAttribute('y')])),expected,'Portrait uses every exact pixel of the chosen Friend');
  assert.equal(await page.locator('.rr-game').getAttribute('data-owner-address'),OWNER);
  assert.equal(await page.locator('.rr-game').getAttribute('data-friend-wallet'),'0x4444444444444444444444444444444444444444');
  await page.getByRole('button',{name:'weapon: '+gearFor(201).name,exact:true}).waitFor();
  assert.equal((await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),saveKey)).accounts[scope].characters['generation:3412'].potions['minor:health'],'9');
  await page.getByRole('button',{name:'Shop chests · from 250 GEMZ',exact:true}).click();
  await page.getByRole('button',{name:'Open chest · 250 GEMZ',exact:true}).click();
  await page.locator('.rr-chest-reveal[data-phase="revealed"]').waitFor();
  const purchased=(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),saveKey)).accounts[scope];
  assert.equal(purchased.gemz,250);assert.equal(purchased.characters['generation:3412'].inventory[201],2);
  assert.equal(purchased.chestReceipt.friend,'generation:3412','A real wallet-mode purchase awards its selected Friend');
  await page.getByRole('button',{name:'Close',exact:true}).click();
  await page.locator('.rr-game').screenshot({path:'artifacts/wallet-friend-3412.png'});
  await page.getByRole('button',{name:'Choose Friend',exact:true}).click();
  await page.setViewportSize({width:390,height:844});
  await page.locator('.rr-wallet-screen').screenshot({path:'artifacts/wallet-choose-mobile.png'});
  await page.getByRole('button',{name:/^Friend #7730\b/}).click();
  await game.locator('.rr-game[data-avatar-id="7730"]').waitFor();
  assert.equal(await game.getByRole('img',{name:'Friend #3412 avatar',exact:true}).count(),0);
  await game.getByRole('button',{name:'Enter · 100 RF',exact:true}).click();
  await game.locator('.rr-game[data-phase="room"][data-avatar-id="7730"]').waitFor();
  await page.locator('.rr-game').screenshot({path:'artifacts/wallet-selected-combat.png'});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.getByRole('button',{name:'Choose Friend',exact:true}).click();
  await page.getByRole('button',{name:'Leave & choose Friend',exact:true}).click();
  let state=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),saveKey);
  assert.ok(state.accounts[scope].characters['generation:7730'].lockedUntil>Date.now(),'Leaving battle applies temp-death');
  await page.getByRole('button',{name:/^Genesis #652\b/}).click();
  await page.locator('.rr-game[data-character-kind="genesis"]').waitFor();
  assert.equal(await page.getByRole('img',{name:'Genesis #652 avatar'}).getAttribute('src'),genesisPortrait);
  await page.getByRole('button',{name:'Enter · 100 RF',exact:true}).click();
  await page.locator('.rr-game[data-phase="room"]').waitFor();
  await page.getByRole('button',{name:'Choose Friend',exact:true}).click();
  await page.getByRole('button',{name:'Leave & choose Friend',exact:true}).click();
  state=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),saveKey);
  assert.equal(state.accounts[scope].characters['genesis:652'].lockedUntil,0,'Verified Genesis is immune');
  genesisOwner=SECOND_OWNER;
  await page.getByRole('button',{name:/^Genesis #652\b/}).click();
  await page.getByText('You no longer own this Genesis. Refresh your Friends.',{exact:true}).waitFor();
  assert.equal(await page.locator('.rr-game').count(),0,'Stale ownership cannot grant Genesis immunity');
  await page.getByRole('button',{name:/^Friend #3412\b/}).click();
  await page.locator('.rr-game').waitFor();
  await page.evaluate(account=>window.__friendWalletTest.accounts([account]),SECOND_OWNER);
  await page.getByText('No playable Rare Friends found in this wallet on Robinhood.',{exact:true}).waitFor();
  assert.equal(await page.locator('.rr-game').count(),0,'Account change clears the old avatar and game');
  secondOwns=true;
  await page.getByRole('button',{name:'Refresh Friends',exact:true}).click();
  await page.getByRole('button',{name:/^Friend #7730\b/}).click();
  await page.locator('.rr-game[data-avatar-id="7730"]').waitFor();
  let stored=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),saveKey);
  const second=stored.accounts['wallet:'+SECOND_OWNER.toLowerCase()];
  assert.deepEqual(second.characters['generation:7730'].inventory,{},'A different connected wallet does not inherit the first wallet’s inventory');
  assert.equal(second.characters['generation:7730'].lockedUntil,0);
  assert.equal(stored.accounts[scope].characters['generation:3412'].loadout.weapon,201);
  await page.evaluate(()=>window.__friendWalletTest.chain('0x1'));
  await page.getByRole('button',{name:'Switch to Robinhood',exact:true}).waitFor();
  assert.equal(await page.locator('.rr-game').count(),0,'Wrong network unmounts the active account');
  await page.getByRole('button',{name:'Switch to Robinhood',exact:true}).click();
  await page.getByRole('button',{name:/^Friend #7730\b/}).waitFor();
  secondOwns=false;
  await page.evaluate(account=>window.__friendWalletTest.accounts([account]),OWNER);
  await page.getByRole('button',{name:/^Friend #3412\b/}).click();
  await page.getByRole('button',{name:'weapon: '+gearFor(201).name,exact:true}).waitFor();
  await page.getByRole('button',{name:'How to play',exact:true}).click();
  assert.match(await page.getByTestId('save-status').innerText(),new RegExp(OWNER));
  await page.getByRole('button',{name:'Close',exact:true}).click();
  const beforeReload=(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),saveKey)).accounts[scope];
  await page.reload();
  await page.getByRole('button',{name:/^Connect (wallet|Browser wallet)$/}).click();
  await page.getByRole('button',{name:/^Friend #3412\b/}).click();
  await page.getByRole('button',{name:'weapon: '+gearFor(201).name,exact:true}).waitFor();
  stored=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),saveKey);
  assert.deepEqual(stored.accounts[scope],beforeReload,'Reconnect restores items, equipped gear, potions, purse, and cooldowns without granting duplicates');
  assert.ok(validateEconomy(stored));
  assert.ok((await page.evaluate(()=>window.__friendWalletTest.state.requests)).every(method=>['eth_accounts','eth_requestAccounts','eth_chainId','wallet_switchEthereumChain'].includes(method)));
  assert.deepEqual([...errors,...fixture.errors],[]);
  console.log('PASS: guest → connection → explicit owned Friend selection → correct avatar → switch Friend → account invalidation. Wallet inventory isolation + reload/reconnect restoration + wrong-chain invalidation. Desktop/mobile, no signing.');
}finally{await browser.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
