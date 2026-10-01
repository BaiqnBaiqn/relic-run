import {useEffect,useRef,useState,useSyncExternalStore} from 'react';
import {createRoot} from 'react-dom/client';
import {createFriendWalletSession,createFriendPublicClient} from '@rarefriends/friendsdk';
import {discoverFriends,verifyFriend,type PlayableFriend} from './identity.ts';
import {loadSave} from './storage.ts';
import RelicRun from './index.tsx';
import {SandboxHost} from './sandbox-host.tsx';
import {SANDBOX_SAVE_KEY,canonicalScope} from './sandbox-store.ts';
import {validateEconomy} from './economy.ts';
import './guest.css';

const submissionPreview=typeof __SUBMISSION_PREVIEW__!=='undefined'&&__SUBMISSION_PREVIEW__;
function WalletGame(){
  const [session]=useState(()=>createFriendWalletSession()),[client]=useState(()=>createFriendPublicClient());
  const wallet=useSyncExternalStore(session.subscribe,session.getSnapshot,session.getSnapshot);
  const [attempt,setAttempt]=useState(0),[friends,setFriends]=useState<PlayableFriend[]>([]),[warnings,setWarnings]=useState<string[]>([]);
  const [loading,setLoading]=useState(false),[choosing,setChoosing]=useState(false),[error,setError]=useState('');
  const [selected,setSelected]=useState<{friend:PlayableFriend;revision:number;account:string}|null>(null);
  const active=useRef(wallet);active.current=wallet;const epoch=useRef(0);
  useEffect(()=>()=>session.dispose(),[session]);
  useEffect(()=>{
    const controller=new AbortController();epoch.current++;setSelected(null);setFriends([]);setWarnings([]);setError('');setChoosing(false);
    if(wallet.status!=='connected'||!wallet.account){setLoading(false);return;}
    setLoading(true);void discoverFriends(client,wallet.account,controller.signal,submissionPreview).then(result=>{if(!controller.signal.aborted){setFriends(result.friends);setWarnings(result.warnings);}}).catch(cause=>{if(!controller.signal.aborted)setError(cause instanceof Error?cause.message:'Could not load Friends.');}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return()=>controller.abort();
  },[wallet.status,wallet.account,wallet.revision,client,attempt]);
  async function choose(friend:PlayableFriend){
    if(submissionPreview&&friend.kind!=='generation')return;
    const start=active.current,version=epoch.current;if(!start.account||start.status!=='connected'||choosing)return;
    setChoosing(true);setError('');try{const verified=await verifyFriend(client,start.account,friend);
      if(epoch.current===version&&active.current.revision===start.revision&&active.current.account===start.account)setSelected({friend:verified,revision:start.revision,account:start.account});
    }catch(cause){if(epoch.current===version)setError(cause instanceof Error?cause.message:'Ownership check failed.');}finally{if(epoch.current===version)setChoosing(false);}
  }
  let cooldowns:Record<string,number>={};try{if(wallet.account&&!submissionPreview)cooldowns=Object.fromEntries(Object.entries(loadSave(`wallet:${wallet.account.toLowerCase()}`).accounts[`wallet:${wallet.account.toLowerCase()}`].characters).map(([key,c])=>[key,c.lockedUntil]));}catch{}
  const valid=wallet.status==='connected'&&selected?.revision===wallet.revision&&selected.account===wallet.account?selected:null;
  if(submissionPreview){try{const raw=localStorage.getItem(SANDBOX_SAVE_KEY),world=raw?JSON.parse(raw):null;if(validateEconomy(world))cooldowns=Object.fromEntries(friends.filter(f=>f.walletAddress).map(f=>[`${f.kind}:${f.id}`,world.accounts[canonicalScope(f.walletAddress!)]?.characters[`${f.kind}:${f.id}`]?.lockedUntil??0]));}catch{}}
  if(valid&&submissionPreview)return <SandboxHost key={`${valid.friend.id}:${valid.account}:${valid.revision}`} friend={valid.friend} account={valid.account} client={client} onChoose={()=>setSelected(null)}/>;
  if(valid)return <RelicRun key={`${valid.friend.kind}:${valid.friend.id}:${valid.account}`} friendId={valid.friend.id} friendKind={valid.friend.kind} portrait={valid.friend.portrait} paused={false} ownerAddress={valid.account} friendWalletAddress={valid.friend.walletAddress} storageScope={`wallet:${valid.account.toLowerCase()}`} onChooseFriend={()=>setSelected(null)} friends={friends} onSelectFriend={friend=>{setSelected(null);void choose(friend);}}/>;
  return <section className="rr-wallet-screen"><div className="rr-eyebrow">RELIC RUN / {submissionPreview?'SIMULATED PREVIEW':'LOCAL PLAYTEST'}</div><h1>Choose your Friend.</h1><p>Connect your wallet, then choose one of your owned Rare Friends. {submissionPreview?'Play requires a hardwired Generations NFT (generation 1 or higher) on Robinhood mainnet.':'Genesis keeps equipped gear and skips temp-death recovery.'} Generations recover for 12 hours after defeat.</p>
    {wallet.account&&<p className="rr-address">Connected: {wallet.account}</p>}
    {wallet.status==='unavailable'&&<p>No browser wallet found. Open this page in your wallet’s browser or a browser with a wallet extension.</p>}
    {['disconnected','error'].includes(wallet.status)&&wallet.wallets.map(w=><button key={w.id} className="rr-primary" onClick={()=>void session.connect(w.id)}>{wallet.wallets.length===1?'Connect wallet':`Connect ${w.name}`}</button>)}
    {wallet.status==='unavailable'&&<button className="rr-secondary" onClick={()=>void session.connect()}>Check for wallet</button>}
    {wallet.status==='wrong-network'&&<button className="rr-primary" onClick={()=>void session.switchNetwork()}>Switch to Robinhood</button>}
    {['connecting','switching-network'].includes(wallet.status)&&<><p role="status">Check your wallet. If it is locked or not responding, cancel and choose a wallet again.</p><button className="rr-secondary" onClick={()=>session.disconnect()}>Cancel connection</button></>}
    {loading&&<p role="status">Finding your owned Friends…</p>}
    {choosing&&<p role="status">Verifying ownership and artwork…</p>}
    <div className="rr-friend-list">{friends.map(friend=><button key={`${friend.kind}:${friend.id}`} disabled={choosing} onClick={()=>void choose(friend)}><strong>{friend.label}</strong><small>{friend.kind==='genesis'?'Genesis · protected':'Generation · temp-death'}</small><small>{(cooldowns[`${friend.kind}:${friend.id}`]??0)>Date.now()?`Cooldown · ${Math.ceil((cooldowns[`${friend.kind}:${friend.id}`]-Date.now())/60000)} min`:'Ready to explore'}</small></button>)}</div>
    {wallet.status==='connected'&&!loading&&!friends.length&&!warnings.length&&<p>No playable Rare Friends found in this wallet on Robinhood.</p>}
    {(error||wallet.error)&&<p role="alert">{error||wallet.error}</p>}{warnings.map(w=><p role="alert" key={w}>{w}</p>)}
    <div className="rr-action-row">{wallet.status==='connected'&&<button className="rr-secondary" onClick={()=>setAttempt(n=>n+1)}>Refresh Friends</button>}{wallet.account&&<button className="rr-text-button" onClick={()=>session.disconnect()}>Disconnect</button>}{!submissionPreview&&<a className="rr-text-button" href="../?mode=guest">Back to guest play</a>}</div>
    <p className="rr-muted">Ownership checks are read-only. RF, GEMZ, equipment, pools and recovery timers are simulated and saved for the connected wallet and individual Friend in this browser. Reconnect here to restore your items. Saves do not sync across devices. No signatures or transactions.</p>
  </section>;
}
createRoot(document.getElementById('root')!).render(<WalletGame/>);
