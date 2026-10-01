import {project} from './camera.ts';
import {PALETTE} from './palette.ts';
import {levelFor} from './levels.ts';
import type {Run,Enemy} from './engine.ts';
import type {Hazard} from './encounters.ts';
const TAU=Math.PI*2,{ink,paper,white,pond,lilac,coral,sun}=PALETTE;
type P={x:number;y:number};
function line(c:CanvasRenderingContext2D,a:P,b:P,color:string=ink,width=1){c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.strokeStyle=color;c.lineWidth=width;c.stroke();}
function poly(c:CanvasRenderingContext2D,ps:P[],fill:string,stroke:string=ink,width=1.5){c.beginPath();ps.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.closePath();c.fillStyle=fill;c.fill();c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}
function rect(x:number,y:number,w:number,h:number){return [project(x,y),project(x+w,y),project(x+w,y+h),project(x,y+h)];}
function circle(x:number,y:number,r:number){return Array.from({length:48},(_,i)=>project(x+Math.cos(i*TAU/48)*r,y+Math.sin(i*TAU/48)*r));}
function star(c:CanvasRenderingContext2D,p:P,size:number,color:string){line(c,{x:p.x-size,y:p.y},{x:p.x+size,y:p.y},color,1.4);line(c,{x:p.x,y:p.y-size},{x:p.x,y:p.y+size},color,1.4);}

/** Small procedural layers: no shader downloads, textures or extra runtime. */
export function themeFloor(c:CanvasRenderingContext2D,s:Run,t:number,reduced:boolean){
  if(s.level===1)return;
  c.save();
  if(s.level===2){
    for(let y=70;y<920;y+=54){poly(c,rect(58,y,844,46),'#e8e4cf','#51676c',.6);for(let x=90;x<900;x+=160){const p=project(x,y+24);c.fillStyle='#596b72';c.fillRect(p.x,p.y,2,1);}}
    for(let i=0;i<11;i++){const y=90+i*73,phase=reduced?0:t*.9;const pts=Array.from({length:24},(_,j)=>project(80+j*34,y+Math.sin(j*.65+phase+i)*7));c.beginPath();pts.forEach((p,j)=>j?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.strokeStyle='#7db4db88';c.lineWidth=2;c.stroke();}
  }else if(s.level===3){
    for(let x=80;x<900;x+=180)for(let y=80;y<900;y+=180){poly(c,rect(x,y,170,170),'#d8cfe8','#a493bb',.7);line(c,project(x+20,y+30),project(x+120,y+70),'#baaccd',.7);}
    for(const [x,y] of [[230,230],[730,230],[230,730],[730,730]]){
      poly(c,circle(x,y,67),'#f6f2fc','#927ba9',1.5);poly(c,[project(x,y-42),project(x+26,y),project(x,y+42),project(x-26,y)],lilac);
      star(c,project(x+18,y-10),reduced?4:3+Math.max(0,Math.sin(t*1.7+x))*4,white);
    }
  }else if(s.level===4){
    for(const x of [65,520])for(const y of [65,520]){
      poly(c,rect(x,y,375,375),'#dc987e','#8e5b4d',1.5);
      for(let j=0;j<4;j++){line(c,project(x+25,y+40+j*85),project(x+350,y+40+j*85),'#bd7b64',1);}
      for(let i=0;i<3;i++)poly(c,rect(x+145+i*25,y+160,12,50),ink);
    }
    if(!reduced)for(let i=0;i<18;i++){const p=project(80+(i*83)%800,80+(i*137)%800);c.fillStyle=i%2?sun:coral;c.globalAlpha=.25+.25*Math.sin(t+i);c.fillRect(p.x,p.y-((t*12+i*13)%50),2,3);}c.globalAlpha=1;
  }else{
    poly(c,circle(480,480,365),paper,'#baa5cc',2);
    for(let i=0;i<8;i++){const a=i*TAU/8,p=project(480+Math.cos(a)*340,480+Math.sin(a)*340);line(c,project(480,480),p,i%2?'#d8c4e4':sun,i%2?1:3);star(c,p,5,ink);}
    for(const r of [90,180,275]){const ps=circle(480,480,r);poly(c,ps,'#ffffff00','#d6c5e0',1);}
    for(let i=0;i<22;i++){const p=project(90+(i*173)%780,90+(i*233)%780);star(c,p,reduced?2:1+Math.max(0,Math.sin(t*1.5+i))*3,i%3?lilac:sun);}
  }
  c.restore();
}
function hazardPolys(h:Hazard):P[][]{
  if(h.kind==='heat')return [rect(h.x,h.y,h.width,h.length)];
  if(h.kind==='meteor')return [circle(h.x,h.y,h.radius)];
  if(h.kind==='beam'){
    const ux=Math.cos(h.angle),uy=Math.sin(h.angle);return [[[-h.width/2,0],[h.width/2,0],[h.width/2,h.length],[-h.width/2,h.length]].map(([side,along])=>project(h.x+ux*along-uy*side,h.y+uy*along+ux*side))];
  }
  const a=h.gap-h.gapWidth/2,b=h.gap+h.gapWidth/2;
  return h.vx?[rect(h.x-h.width/2,48,h.width,a-48),rect(h.x-h.width/2,b,h.width,912-b)]:[rect(48,h.y-h.width/2,a-48,h.width),rect(b,h.y-h.width/2,912-b,h.width)];
}
export function drawHazards(c:CanvasRenderingContext2D,s:Run){
  const boundary=rect(48,48,864,864);c.save();c.beginPath();boundary.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.closePath();c.clip();
  for(const h of s.hazards){
    const warning=h.delay>0,color=h.kind==='tide'?pond:h.kind==='beam'?lilac:h.kind==='heat'?'#f9c060':sun;
    c.save();c.globalAlpha=warning?.65:.9;c.setLineDash(warning?[5,4]:[]);
    for(const ps of hazardPolys(h))poly(c,ps,warning?'#ed927e55':color,warning?'#8a3429':ink,warning?2:3);
    c.setLineDash([]);c.globalAlpha=1;
    if(h.kind==='beam'&&!warning)line(c,project(h.x,h.y),project(h.x+Math.cos(h.angle)*h.length,h.y+Math.sin(h.angle)*h.length),white,4);
    if(h.kind==='tide'){
      const p=project(h.vx?h.x:h.gap,h.vx?h.gap:h.y);c.font='bold 9px monospace';c.textAlign='center';c.fillStyle=ink;c.fillText('GAP',p.x,p.y-8);
      if(warning){const end=project(h.vx?900:h.gap,h.vx?h.gap:900);line(c,p,end,'#7b9fa7',1);}
    }
    if(warning&&h.kind!=='tide'){
      const p=h.kind==='heat'?project(h.x+h.width/2,h.y+h.length/2):h.kind==='beam'?project(h.x+Math.cos(h.angle)*140,h.y+Math.sin(h.angle)*140):project(h.x,h.y);
      c.font='bold 12px monospace';c.textAlign='center';c.fillStyle=ink;c.fillText('!',p.x,p.y-10);
      c.fillStyle=white;c.fillRect(p.x-18,p.y-4,36,4);c.fillStyle=coral;c.fillRect(p.x-18,p.y-4,36*(1-h.delay/h.warning),4);
    }
    if(h.kind==='meteor'&&!warning){const p=project(h.x,h.y);star(c,p,22,sun);star(c,p,12,white);}
    if(h.kind==='heat'&&!warning){
      for(let x=h.x+55;x<h.x+h.width-25;x+=90)for(let y=h.y+55;y<h.y+h.length-25;y+=90){const p=project(x,y);poly(c,[{x:p.x-4,y:p.y+3},{x:p.x,y:p.y-7},{x:p.x+4,y:p.y+3}],coral,ink,1);}
      const p=project(h.x+h.width/2,h.y+h.length/2);c.font='bold 11px monospace';c.textAlign='center';c.fillStyle=ink;c.fillText('HOT',p.x,p.y);
    }
    c.restore();
  }
  c.restore();
}
export function drawImpact(c:CanvasRenderingContext2D,s:Run,reduced:boolean){
  if(reduced)return;
  c.save();
  for(const ghost of s.trail){const p=project(ghost.x,ghost.y);c.globalAlpha=ghost.life*.9;c.fillStyle=pond;c.fillRect(p.x-12,p.y-33,24,32);c.strokeStyle=ink;c.lineWidth=1;c.strokeRect(p.x-12,p.y-33,24,32);}
  for(const pulse of s.pulses){c.globalAlpha=pulse.life/pulse.duration;poly(c,circle(pulse.x,pulse.y,pulse.radius*(1-pulse.life/pulse.duration)), '#ffffff00',white,3);star(c,project(pulse.x,pulse.y),6*c.globalAlpha,sun);}
  c.restore();
}
export function bossArt(c:CanvasRenderingContext2D,e:Enemy,s:Run,t:number,reduced:boolean){
  const p=project(e.x,e.y),body=e.flash>0?white:ink,accent=PALETTE[levelFor(s.level).color];
  const point=(x:number,y:number)=>({x:p.x+x,y:p.y+y});
  const shape=(points:number[][],fill:string)=>poly(c,points.map(([x,y])=>point(x,y)),fill,ink,2);
  c.save();
  if(s.level===2){
    // Alternating, articulated legs keep the crab's weight close to the floor.
    for(const sign of [-1,1])for(let i=0;i<3;i++){const lift=reduced?0:Math.sin(t*7+i*2+sign)*4;line(c,point(sign*21,-22+i*7),point(sign*(39+i*3),-22+i*8-lift),ink,5);line(c,point(sign*(39+i*3),-22+i*8-lift),point(sign*(48+i*3),3+i*2),ink,4);}
    shape([[-31,-32],[-20,-49],[19,-49],[34,-31],[28,-12],[-26,-12]],e.recovery?white:accent);
    shape([[-20,-45],[0,-55],[23,-44],[15,-24],[-16,-24]],body);
    for(const sign of [-1,1]){line(c,point(sign*27,-33),point(sign*50,-49),ink,7);shape([[sign*45,-47],[sign*60,-58],[sign*61,-75],[sign*52,-61],[sign*45,-72],[sign*36,-58]],white);c.fillStyle=white;c.fillRect(p.x+sign*12-3,p.y-43,6,7);}
  }else if(s.level===3){
    for(const x of [-25,25])for(const y of [-9,-37])shape([[x-7,y],[x+7,y],[x+10,y+10],[x-8,y+10]],body);
    shape([[-37,-30],[-23,-62],[13,-66],[36,-43],[31,-14],[-18,-9]],body);
    shape([[-26,-31],[-16,-55],[9,-59],[27,-42],[20,-21],[-15,-17]],lilac);
    for(const [x,y,r] of [[-16,-51,14],[5,-60,22],[22,-43,16]]){shape([[x-r*.4,y],[x,y-r],[x+r*.4,y],[x,y+8]],white);line(c,point(x,y-r),point(x,y+8),lilac,2);}
    shape([[-10,-9],[11,-9],[14,1],[-13,1]],white);c.fillStyle=ink;c.fillRect(p.x-7,p.y-7,3,3);c.fillRect(p.x+5,p.y-7,3,3);
  }else if(s.level===4){
    shape([[-30,-62],[26,-62],[35,-13],[20,-4],[-23,-4],[-35,-16]],body);
    shape([[-17,-70],[14,-70],[20,-60],[-23,-60]],white);
    shape([[-20,-47],[18,-47],[21,-19],[-21,-19]],e.recovery?'#777':coral);
    for(let i=0;i<3;i++){const h=reduced?14:12+Math.sin(t*7+i)*5;shape([[-15+i*11,-24],[-11+i*11,-24-h],[-4+i*11,-24]],sun);}
    for(const x of [-15,15])shape([[x-6,-6],[x+6,-6],[x+8,5],[x-8,5]],ink);
    for(const sign of [-1,1]){line(c,point(sign*27,-45),point(sign*43,-24),ink,8);shape([[sign*40,-30],[sign*54,-29],[sign*57,-15],[sign*40,-12]],white);}
  }else{
    const bob=reduced?0:Math.sin(t*2)*3;c.translate(0,bob);
    shape([[-23,-43],[0,-62],[23,-43],[34,-7],[0,0],[-34,-7]],body);
    shape([[-13,-46],[0,-58],[13,-46],[10,-29],[-10,-29]],white);c.fillStyle=ink;c.fillRect(p.x-7,p.y-44,4,5);c.fillRect(p.x+3,p.y-44,4,5);
    shape([[-12,-23],[0,-35],[12,-23],[0,-10]],lilac);line(c,point(39,-64),point(39,-2),ink,4);star(c,point(39,-66),12,sun);
    c.beginPath();c.ellipse(p.x,p.y-73,32,10,0,0,TAU);c.strokeStyle=sun;c.lineWidth=4;c.stroke();c.strokeStyle=ink;c.lineWidth=1;c.stroke();
    for(let i=0;i<5;i++){const a=i*TAU/5+(reduced?0:t*.35);star(c,point(Math.cos(a)*46,-40+Math.sin(a)*35),4,i%2?lilac:sun);}
  }
  c.restore();
}
