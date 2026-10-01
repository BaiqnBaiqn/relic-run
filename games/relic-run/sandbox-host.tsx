import {useEffect,useRef,useState} from 'react';
import {ConnectedGameHost} from '@rarefriends/friendsdk/runtime';
import type {OwnedFriendsClient} from '@rarefriends/friendsdk';
import '@rarefriends/friendsdk/frame.css';
import '@rarefriends/friendsdk/runtime.css';
import {runtimeDefinition} from './runtime-definition.ts';
import {SAVE_KEY} from './storage.ts';
import {canonicalScope,prepareWorld,endAbandoned,validateSessionSave,SANDBOX_SAVE_KEY,SANDBOX_LOCK,MUTED_KEY} from './sandbox-store.ts';
import type {PlayableFriend} from './identity.ts';
import type {Economy} from './economy.ts';
import './sandbox-host.css';

export function SandboxHost({friend,account,client,onChoose}:{friend:PlayableFriend;account:string;client:OwnedFriendsClient;onChoose:()=>void}){
  const container=useRef<HTMLDivElement>(null),[ready,setReady]=useState(false),[error,setError]=useState('');
  const scope=canonicalScope(friend.walletAddress!);
  useEffect(()=>{
    let alive=true,world:Economy|null=null,port:MessagePort|null=null,release:(()=>void)|undefined,lastId=0,connectedDocument='';
    const controller=new AbortController();setReady(false);setError('');
    function persist(value:Economy){localStorage.setItem(SANDBOX_SAVE_KEY,JSON.stringify(value));world=value;}
    function finish(){if(world){const next=structuredClone(world);endAbandoned(next,scope,Date.now());persist(next);}}
    function receive(event:MessageEvent){
      const frame=container.current?.querySelector('iframe'),data=event.data;
      if(!alive||!world||!frame||event.source!==frame.contentWindow||event.origin!=='null'||data?.type!=='relic-run:storage-ready'||data.friendId!==friend.id||typeof data.documentId!=='string'||data.documentId.length>100)return;
      if(connectedDocument===data.documentId)return;
      // A new child must recover the previous run; old ports cannot write afterward.
      port?.close();if(connectedDocument)finish();connectedDocument=data.documentId;lastId=0;
      const channel=new MessageChannel();port=channel.port1;const current=port;
      port.onmessage=({data:request})=>{
        if(!alive||port!==current||!world||!Number.isSafeInteger(request?.id)||request.id<=lastId)return;
        lastId=request.id;
        try{
          if(request.type==='save'){
            if(request.key===SAVE_KEY)persist(validateSessionSave(world,request.value,scope,friend.id,Date.now()));
            else if(request.key===MUTED_KEY&&['true','false'].includes(request.value))localStorage.setItem(MUTED_KEY,request.value);
            else throw new Error('This storage operation is not available.');
            current.postMessage({type:'saved',id:request.id});
          }else if(request.type==='choose'){
            finish();current.postMessage({type:'saved',id:request.id});onChoose();
          }else throw new Error('Unknown preview request.');
        }catch{current.postMessage({type:'error',id:request.id,message:'Progress could not be saved. Check available browser storage, then retry.'});}
      };
      current.start();
      frame.contentWindow!.postMessage({type:'relic-run:storage-init',documentId:data.documentId,friendId:friend.id,scope,ownerAddress:account,friendWalletAddress:friend.walletAddress,values:{[SAVE_KEY]:JSON.stringify(world),[MUTED_KEY]:localStorage.getItem(MUTED_KEY)??'false'}},'*',[channel.port2]);
    }
    const unload=()=>{try{finish();}catch{}};
    window.addEventListener('message',receive);window.addEventListener('pagehide',unload);
    if(!navigator.locks)setError('This browser needs HTTPS and Web Locks to save safely. Use a current browser.');
    else void navigator.locks.request(SANDBOX_LOCK,{signal:controller.signal},async()=>{
      if(!alive)return;
      try{persist(prepareWorld(localStorage.getItem(SANDBOX_SAVE_KEY),scope,friend.id,Date.now()));setReady(true);}
      catch{setError('Your saved world could not be opened. The original is preserved.');return;}
      await new Promise<void>(resolve=>{release=resolve;});
    }).catch(()=>{if(alive)setError('Could not open the preview save.');});
    return()=>{alive=false;controller.abort();unload();port?.close();release?.();window.removeEventListener('message',receive);window.removeEventListener('pagehide',unload);};
  },[scope,friend.id,friend.walletAddress,account]);
  return <div ref={container} className="rr-sdk-host">
    <div className="rr-trusted-status"><span>RELIC RUN · SIMULATED PREVIEW</span><span>{account.slice(0,6)}…{account.slice(-4)}</span><button onClick={()=>{let active=false;try{const raw=localStorage.getItem(SANDBOX_SAVE_KEY),entry=raw?JSON.parse(raw).accounts[scope]?.active:null;active=Boolean(entry&&!entry.ended);}catch{}if(!active||window.confirm('Leaving counts as defeat: equipped ordinary items and potion bonuses are lost, and this Friend recovers for 12 hours. Leave this expedition?'))onChoose();}}>Choose another Friend</button></div>
    {ready?<ConnectedGameHost definition={runtimeDefinition} frameUrl="./game.html" selectedFriend={{id:friend.id,label:friend.label,kind:'owned',walletAddress:friend.walletAddress}} account={account} chainId={4663} publicClient={client}/>:<p role={error?'alert':'status'}>{error||'Opening your save. Close other game tabs if this one is waiting.'}</p>}
  </div>;
}
