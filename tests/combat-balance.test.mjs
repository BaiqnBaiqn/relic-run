import test from 'node:test';
import assert from 'node:assert/strict';
import {makeRun,startRoom,enterBoss,step} from '../games/relic-run/engine.ts';

test('matching-tier Heal builds need movement in L2 and L4 across 24 seeds',()=>{
  const route=[[720,680],[760,300],[480,180],[200,300],[200,680],[480,760]];
  for(const level of [2,4])for(let seed=1;seed<=24;seed++)for(const moving of [false,true]){
    const s=makeRun({weapon:200+level,ability:270+level,armor:300+level,ring:310+level},seed,undefined,level);startRoom(s);let point=0;
    for(let tick=0;tick<18000&&!['won','dead'].includes(s.phase);tick++){
      if(s.phase==='door'){enterBoss(s);point=0;}
      let x=0,y=0;
      if(moving){let [tx,ty]=route[point];if(Math.hypot(tx-s.x,ty-s.y)<16){point=(point+1)%route.length;[tx,ty]=route[point];}const d=Math.hypot(tx-s.x,ty-s.y)||1;x=(tx-s.x)/d;y=(ty-s.y)/d;}
      step(s,{x,y,dash:false,ability:true},1/60);
    }
    assert.equal(s.phase,moving?'won':'dead',`L${level}, seed ${seed}, moving=${moving}`);
  }
});
