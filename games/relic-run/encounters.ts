import type {Run,Enemy,Vec} from './engine.ts';
import {levelFor} from './levels.ts';
export type Hazard={id:number;kind:'tide'|'beam'|'heat'|'meteor';x:number;y:number;angle:number;width:number;length:number;radius:number;delay:number;duration:number;warning:number;span:number;damage:number;vx:number;vy:number;gap:number;gapWidth:number;age:number;hit?:boolean};
function hazard(s:Run,kind:Hazard['kind'],props:Partial<Hazard>){
  const h:Hazard={id:s.nextId++,kind,x:0,y:0,angle:0,width:0,length:0,radius:0,delay:1.2,duration:.5,warning:0,span:0,damage:levelFor(s.level).damage,vx:0,vy:0,gap:0,gapWidth:0,age:0,...props};
  h.warning=h.delay;h.span=h.duration;s.hazards.push(h);
}
export function hazardHits(h:Hazard,p:Vec){
  if(h.delay>0||h.duration<=0)return false;
  if(h.kind==='heat')return p.x>=h.x&&p.x<=h.x+h.width&&p.y>=h.y&&p.y<=h.y+h.length;
  if(h.kind==='meteor')return Math.hypot(p.x-h.x,p.y-h.y)<=h.radius+10;
  if(h.kind==='tide'){
    const along=h.vx?p.y:p.x,across=h.vx?p.x-h.x:p.y-h.y;
    return Math.abs(across)<h.width/2+10&&Math.abs(along-h.gap)>h.gapWidth/2-10;
  }
  const dx=p.x-h.x,dy=p.y-h.y,along=dx*Math.cos(h.angle)+dy*Math.sin(h.angle),side=-dx*Math.sin(h.angle)+dy*Math.cos(h.angle);
  return along>=-10&&along<=h.length+10&&Math.abs(side)<h.width/2+10;
}
export function fan(s:Run,e:Enemy,count=5,spread=.22,speed=165){
  const a=Math.atan2(s.y-e.y,s.x-e.x);
  for(let i=0;i<count;i++)fire(s,e,a+(i-(count-1)/2)*spread,speed);
}
function fire(s:Run,e:Enemy,angle:number,speed:number){s.shots.push({id:s.nextId++,x:e.x,y:e.y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,life:6,damage:levelFor(s.level).damage,enemy:true,pierce:0,hit:[],r:5});}
function ring(s:Run,e:Enemy){const gap=Math.atan2(s.y-e.y,s.x-e.x);for(let i=0;i<12;i++){const a=gap+i*Math.PI/6;if(i!==0&&i!==1&&i!==11)fire(s,e,a,135);}}
function beam(s:Run,e:Enemy,warning=1.15){hazard(s,'beam',{x:e.x,y:e.y,angle:Math.atan2(s.y-e.y,s.x-e.x),width:36,length:1050,delay:warning,duration:.55});}
function tide(s:Run,e:Enemy){
  const vertical=e.pattern%4===1,gap=Math.max(190,Math.min(770,vertical?s.y:s.x));
  hazard(s,'tide',{x:vertical?55:480,y:vertical?480:55,width:42,gap,gapWidth:170,vx:vertical?180:0,vy:vertical?0:180,delay:1.2,duration:4.9});
  s.texts.push({x:480,y:480,text:'FIND THE TIDE GAP',life:1.2,color:'#111'});
}
function heat(s:Run){const x=s.x<480?65:520,y=s.y<480?65:520;hazard(s,'heat',{x,y,width:375,length:375,delay:1.5,duration:3.5});}
function meteors(s:Run){
  // Lock impact positions now; warning circles never chase the player.
  for(let i=0;i<3;i++)hazard(s,'meteor',{x:Math.max(145,Math.min(815,s.x+(i-1)*190)),y:Math.max(145,Math.min(815,s.y+(i===1?0:170))),radius:75,delay:1.35+i*.25,duration:.5});
}
/** Level-specific patterns share collision shapes with their visible telegraphs. */
export function bossPattern(s:Run,e:Enemy){
  const pattern=e.pattern++,angry=e.hp<=e.maxHp/2;
  if(s.level===2){if(pattern%3===1)tide(s,e);else if(pattern%3===0)fan(s,e,angry?7:5,.24,155);else{e.recovery=2.2;s.texts.push({x:e.x,y:e.y,text:'SHELL OPEN',life:1.5,color:'#111'});}e.cool=pattern%3===1?5.9:2.7;}
  if(s.level===3){if(pattern%3===0)beam(s,e);else if(pattern%3===1)ring(s,e);else e.recovery=2.4;e.cool=2.8;}
  if(s.level===4){if(pattern%3===0)heat(s);else if(pattern%3===1)fan(s,e,angry?7:5,.24,165);else e.recovery=2.6;e.cool=2.9;}
  if(s.level===5){
    if(pattern%4===0){s.shots=[];tide(s,e);e.cool=6.3;}
    else if(pattern%4===1){beam(s,e,1.35);e.cool=2.9;}
    else if(pattern%4===2){meteors(s);if(angry)fan(s,e,3,.35,125);e.cool=3.3;}
    else{e.recovery=3;e.cool=3.3;s.texts.push({x:e.x,y:e.y,text:'STARLIGHT FADES',life:2,color:'#111'});}
  }
}
export function minionPattern(s:Run,e:Enemy,dt:number,move:(v:Vec,x:number,y:number,r:number)=>void){
  const dx=s.x-e.x,dy=s.y-e.y,d=Math.hypot(dx,dy)||1,ux=dx/d,uy=dy/d;
  if(e.kind==='slime'||(s.level===2&&e.kind==='brute')){
    if(e.windup>0){e.windup-=dt;if(e.windup<=0)e.charge=.42;}
    else if(e.charge>0){move(e,e.aim.x*285*dt,e.aim.y*285*dt,e.r);e.charge-=dt;}
    else {move(e,ux*85*dt,uy*85*dt,e.r);if(e.cool<=0){e.aim={x:ux,y:uy};e.windup=.7;e.cool=3.2;}}
  }else if(e.kind==='archer'){
    if(d>230)move(e,ux*42*dt,uy*42*dt,e.r);else if(d<130)move(e,-ux*36*dt,-uy*36*dt,e.r);
    if(e.cool<=.6)e.flash=.06;
    if(e.cool<=0){if(s.level===3)beam(s,e,1.2);else if(s.level===4)hazard(s,'meteor',{x:s.x,y:s.y,radius:60,delay:1.3,duration:.45});else if(s.level===5)ring(s,e);else fan(s,e,2,.16,125);e.cool=3.4;}
  }else{
    move(e,ux*38*dt,uy*38*dt,e.r);
    if(e.cool<=0){if(s.level===3)ring(s,e);else if(s.level===4)fan(s,e,3,.3,130);else {e.shielded=true;e.guardTime=1;}e.cool=4.2;}
  }
}
