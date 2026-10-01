import {parseAbi,parseAbiItem,isAddress,zeroAddress,type Address} from 'viem';
import {readOwnedFriends,readGenerationEligibility,type OwnedFriendsClient} from '@rarefriends/friendsdk';
import {GENERATION_SPRITE_MANIFEST} from '@rarefriends/friendsdk/sprites';
import type {CharacterKind} from './economy.ts';

// Official deployment: https://rarefriends.com/docs/contracts (2026-10-01).
// Genesis is a separate ERC-721 collection, NOT Generations generation zero.
export const GENESIS='0x116EaA62241751E0c98dA43d458600c6C17cD361' as Address;
export const GENESIS_ABI=parseAbi(['function balanceOf(address) view returns (uint256)','function ownerOf(uint256) view returns (address)','function tokenURI(uint256) view returns (string)']);
const TRANSFER=parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)');
const FRIEND_WALLET_ABI=parseAbi(['function tokenBoundAccount(uint256) view returns (address)']);
export type PlayableFriend={id:bigint;kind:CharacterKind;label:string;portrait?:string;walletAddress?:Address};
export async function readGenesis(client:OwnedFriendsClient,account:Address,signal?:AbortSignal):Promise<PlayableFriend[]>{
  if(await client.getChainId()!==4663)throw new Error('Switch to Robinhood to load Genesis.');
  const block=await client.getBlockNumber({cacheTime:0}),balance=await client.readContract({address:GENESIS,abi:GENESIS_ABI,functionName:'balanceOf',args:[account],blockNumber:block});
  if(balance===0n)return [];if(balance<0n||balance>1024n)throw new Error('Invalid Genesis balance.');
  const events=new Map<string,{block:bigint;index:number;id:bigint;to:string}>();
  // Owner-indexed reads only. Never enumerate unrelated wallets or token IDs.
  for(let from=0n;from<=block;from+=10_000_000n){
    signal?.throwIfAborted();const to=from+9_999_999n<block?from+9_999_999n:block;
    const pages=await Promise.all([client.getLogs({address:GENESIS,event:TRANSFER,args:{to:account},fromBlock:from,toBlock:to,strict:true}),client.getLogs({address:GENESIS,event:TRANSFER,args:{from:account},fromBlock:from,toBlock:to,strict:true})]);
    for(const log of pages.flat()){
      if(log.removed||log.blockNumber===null||log.logIndex===null||log.args.tokenId===undefined||!log.args.to||!log.args.from||log.address.toLowerCase()!==GENESIS.toLowerCase()||!(log.args.to.toLowerCase()===account.toLowerCase()||log.args.from.toLowerCase()===account.toLowerCase()))throw new Error('Invalid Genesis transfer history.');
      events.set(`${log.blockNumber}:${log.logIndex}`,{block:log.blockNumber,index:log.logIndex,id:log.args.tokenId,to:log.args.to});
    }
    if(events.size>100_000)throw new Error('Genesis transfer history is too large for this preview.');
  }
  const held=new Set<bigint>();for(const event of [...events.values()].sort((a,b)=>a.block===b.block?a.index-b.index:a.block<b.block?-1:1)){if(event.to.toLowerCase()===account.toLowerCase())held.add(event.id);else held.delete(event.id);}
  if(BigInt(held.size)!==balance)throw new Error('Incomplete Genesis history. Retry loading Friends.');
  const friends:PlayableFriend[]=[];
  for(const id of held){signal?.throwIfAborted();const owner=await client.readContract({address:GENESIS,abi:GENESIS_ABI,functionName:'ownerOf',args:[id],blockNumber:block});if(owner.toLowerCase()!==account.toLowerCase())throw new Error('Genesis ownership changed. Refresh your Friends.');friends.push({id,kind:'genesis',label:`Genesis #${id}`});}
  if(await client.getChainId()!==4663)throw new Error('Wallet network changed.');return friends;
}
export async function discoverFriends(client:OwnedFriendsClient,account:Address,signal?:AbortSignal,generationsOnly=false){
  const [generations,genesis]=await Promise.allSettled([readOwnedFriends(client,account,{signal}),generationsOnly?Promise.resolve([]):readGenesis(client,account,signal)]);
  signal?.throwIfAborted();
  const friends:PlayableFriend[]=[];const warnings:string[]=[];
  if(generations.status==='fulfilled')friends.push(...generations.value.friends.map(f=>({id:f.id,kind:'generation' as const,label:f.label,walletAddress:f.walletAddress})));
  else warnings.push(`Generations: ${generations.reason instanceof Error?generations.reason.message:'Could not load.'}`);
  if(genesis.status==='fulfilled')friends.push(...genesis.value);else warnings.push(`Genesis: ${genesis.reason instanceof Error?genesis.reason.message:'Could not load.'}`);
  return {friends,warnings};
}
function decodeJSON(uri:string){
  if(uri.length>2_000_000||!uri.startsWith('data:application/json'))throw new Error('Unsupported Genesis metadata.');
  const comma=uri.indexOf(','),header=uri.slice(0,comma),body=uri.slice(comma+1);
  return JSON.parse(header.includes(';base64')?new TextDecoder().decode(Uint8Array.from(atob(body),c=>c.charCodeAt(0))):decodeURIComponent(body));
}
export async function verifyFriend(client:OwnedFriendsClient,account:Address,friend:PlayableFriend):Promise<PlayableFriend>{
  if(!isAddress(account)||await client.getChainId()!==4663)throw new Error('Connect your wallet on Robinhood.');
  if(friend.kind==='generation'){
    const result=await readGenerationEligibility(client,friend.id,account);if(!result.eligible)throw new Error('You must own this hardwired Friend to play.');
    const walletAddress=await client.readContract({address:GENERATION_SPRITE_MANIFEST.generations,abi:FRIEND_WALLET_ABI,functionName:'tokenBoundAccount',args:[friend.id],blockNumber:result.blockNumber});
    if(!isAddress(walletAddress)||walletAddress.toLowerCase()===zeroAddress)throw new Error('This Friend has no valid canonical wallet.');
    if(await client.getChainId()!==4663)throw new Error('Wallet network changed.');
    return {...friend,walletAddress};
  }
  const block=await client.getBlockNumber({cacheTime:0}),owner=await client.readContract({address:GENESIS,abi:GENESIS_ABI,functionName:'ownerOf',args:[friend.id],blockNumber:block});
  if(owner.toLowerCase()!==account.toLowerCase())throw new Error('You no longer own this Genesis. Refresh your Friends.');
  const uri=await client.readContract({address:GENESIS,abi:GENESIS_ABI,functionName:'tokenURI',args:[friend.id],blockNumber:block});
  const metadata=decodeJSON(uri),portrait=metadata.image;
  if(typeof portrait!=='string'||portrait.length>1_000_000||!/^data:image\/(svg\+xml|png|webp)(;|,)/.test(portrait))throw new Error('Genesis must provide its canonical inline portrait.');
  if(await client.getChainId()!==4663)throw new Error('Wallet network changed.');return {...friend,portrait};
}
