import {useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {GameSession,type GameComponentProps} from '@rarefriends/friendsdk/runtime';
import {runtimeDefinition} from './runtime-definition.ts';
import {installGameStorage} from './persistence.ts';
import {SAVE_KEY} from './storage.ts';
import {MUTED_KEY} from './sandbox-store.ts';
import RelicRun from './index.tsx';
import './sandbox-child.css';

type Session={scope:string;ownerAddress:string;friendWalletAddress:string;choose:()=>void};
function SavedGame({friendId,client,paused}:GameComponentProps){
  const [session,setSession]=useState<Session|null>(null),[pending,setPending]=useState(0),[error,setError]=useState(''),[slowSave,setSlowSave]=useState(false);
  useEffect(()=>{if(!pending){setSlowSave(false);return;}const timer=setTimeout(()=>setSlowSave(true),300);return()=>clearTimeout(timer);},[pending]);
  const [retry,setRetry]=useState<(()=>void)|null>(null);
  useEffect(()=>{
    let alive=true,port:MessagePort|null=null,uninstall:(()=>void)|undefined,id=0;
    const requests=new Map<number,{type:string;key?:string;value?:string}>(),documentId=crypto.randomUUID();
    const hello=()=>window.parent.postMessage({type:'relic-run:storage-ready',friendId,documentId},'*');
    const refresh=()=>{if(alive)setPending(requests.size);};
    function send(request:{type:string;key?:string;value?:string}){if(!port||!alive)throw new Error('The save session has ended.');const sequence=++id;requests.set(sequence,request);port.postMessage({...request,id:sequence});refresh();}
    function receive(event:MessageEvent){
      const data=event.data;
      if(port||event.source!==window.parent||data?.type!=='relic-run:storage-init'||data.documentId!==documentId||data.friendId!==friendId||event.ports.length!==1)return;
      port=event.ports[0];const values=new Map<string,string>(Object.entries(data.values));
      port.onmessage=({data:response})=>{
        if(!alive||!requests.has(response?.id))return;
        const request=requests.get(response.id)!;
        if(response.type==='saved'){requests.delete(response.id);refresh();}
        else if(response.type==='error'){
          requests.delete(response.id);refresh();setError(response.message);
          // Later queued saves may already have succeeded. Retry the latest
          // cached record instead of rolling progress back to a failed snapshot.
          setRetry(()=>()=>{setError('');send(request.type==='save'?{...request,value:values.get(request.key!)!}:request);});
        }
      };
      port.start();
      uninstall=installGameStorage({getItem:key=>values.get(key)??null,setItem(key,value){
        if(![SAVE_KEY,MUTED_KEY].includes(key))throw new Error('Only game progress and sound settings can be saved.');
        // Slow or failed saves pause play; ACK follows durable host storage.
        send({type:'save',key,value});values.set(key,value);
      }});
      setSession({scope:data.scope,ownerAddress:data.ownerAddress,friendWalletAddress:data.friendWalletAddress,choose:()=>send({type:'choose'})});
    }
    window.addEventListener('message',receive);
    void client.read().then(hello).catch(()=>{if(alive)setError('The SDK session could not start. Retry from the host.');});
    const timer=setInterval(()=>{if(!port)hello();},1000);
    return()=>{alive=false;clearInterval(timer);window.removeEventListener('message',receive);port?.close();uninstall?.();};
  },[client,friendId]);
  return <>{session?<RelicRun friendId={friendId} paused={paused||slowSave||Boolean(error)} storageScope={session.scope} ownerAddress={session.ownerAddress} friendWalletAddress={session.friendWalletAddress} friends={[{id:friendId,kind:'generation',label:`Friend #${friendId}`}]} onChooseFriend={session.choose}/>:<p role="status">Opening your Friend’s saved progress…</p>}
    {(slowSave||error)&&<div className="rr-save-status" role={error?'alert':'status'}>{error||'Saving progress…'}{error&&retry&&<button onClick={retry}>Retry saving</button>}</div>}
  </>;
}
createRoot(document.getElementById('root')!).render(<GameSession definition={runtimeDefinition}>{props=><SavedGame {...props}/>}</GameSession>);
