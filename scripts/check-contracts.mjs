// Public read-only health check. No wallet, signer, signatures or transactions.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {createPublicClient,http,parseAbi,isAddress,zeroAddress} from 'viem';
import {readGenerationEligibility} from '@rarefriends/friendsdk';
import {GENERATION_SPRITE_MANIFEST as manifest,createGenerationSpriteReader} from '@rarefriends/friendsdk/sprites';
import {GENESIS,GENESIS_ABI,verifyFriend} from '../games/relic-run/identity.ts';

const RF='0x0779369854d3EcdEA927206718FFD7730C67B71f';
const client=createPublicClient({transport:http(manifest.rpcUrl,{timeout:15000,retryCount:1}),cacheTime:0});
const report={checkedAt:new Date().toISOString(),mode:'read-only',rpc:manifest.rpcUrl,checks:[],failures:[],limitations:[
  'This checks deployed identity, artwork and RF token reads; it is not a security audit.',
  'Relic Run has no deployed entry, chest, jackpot or season-payout contract. Its economy is simulated.',
  'No player wallet was connected and no transfers, approvals or writes were attempted.',
]};
async function check(name,work){try{const details=await work();report.checks.push({name,...details});console.log('PASS: '+name);}catch(error){report.failures.push({name,error:error.shortMessage??error.message});console.error('FAIL: '+name+': '+(error.shortMessage??error.message));}}
await check('Robinhood chain identity',async()=>{const chainId=await client.getChainId();assert.equal(chainId,4663);return {chainId,block:(await client.getBlockNumber({cacheTime:0})).toString()};});
if(!report.failures.length){
  for(const [name,address] of Object.entries({Generations:manifest.generations,Genesis:GENESIS,artworkRegistry:manifest.registry,metadata:manifest.metadata,RF})){
    await check(name+' deployed bytecode',async()=>{const code=await client.getCode({address});assert.ok(code&&code!=='0x');return {address,bytes:(code.length-2)/2};});
  }
  await check('Generation #7730 ownership and canonical NFT wallet',async()=>{
    const identity=await readGenerationEligibility(client,7730n);assert.ok(identity.hardwired);
    const friend=await verifyFriend(client,identity.owner,{id:7730n,kind:'generation',label:'Friend #7730'});
    assert.ok(isAddress(friend.walletAddress)&&friend.walletAddress.toLowerCase()!==zeroAddress);
    return {tokenId:'7730',generation:identity.generation,canonicalWallet:friend.walletAddress,block:identity.blockNumber.toString()};
  });
  await check('Generation #7730 canonical animation',async()=>{
    const art=await createGenerationSpriteReader(client).read(7730n);assert.equal(art.frames.length,64);
    assert.ok(art.frames.some(frame=>frame!==0n));return {tokenId:art.tokenId.toString(),family:art.familyName,frames:art.frames.length};
  });
  await check('Genesis #652 canonical portrait',async()=>{
    const owner=await client.readContract({address:GENESIS,abi:GENESIS_ABI,functionName:'ownerOf',args:[652n]});
    const friend=await verifyFriend(client,owner,{id:652n,kind:'genesis',label:'Genesis #652'});
    assert.ok(friend.portrait.startsWith('data:image/'));return {tokenId:'652',portraitBytes:friend.portrait.length};
  });
  await check('RF token identity and decimals',async()=>{
    const abi=parseAbi(['function symbol() view returns (string)','function decimals() view returns (uint8)','function totalSupply() view returns (uint256)']);
    const [symbol,decimals,supply]=await Promise.all(['symbol','decimals','totalSupply'].map(functionName=>client.readContract({address:RF,abi,functionName})));
    assert.equal(decimals,18);assert.ok(supply>0n);assert.match(symbol,/RAREFRIENDS|RF/i);
    return {address:RF,symbol,decimals,totalSupply:supply.toString()};
  });
}
await mkdir('artifacts',{recursive:true});await writeFile('artifacts/contract-checks.json',JSON.stringify(report,null,2)+'\n');
if(report.failures.length)process.exitCode=1;
