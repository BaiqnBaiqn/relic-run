import {spriteFrame,type GenerationSprites} from '@rarefriends/friendsdk/sprites';
import {type Run,type Enemy} from './engine.ts';
import {project,VIEW_WIDTH,VIEW_HEIGHT} from './camera.ts';
import {ARENA_SIZE} from './arena.ts';
import {gearFor} from './gear.ts';
import {PALETTE} from './palette.ts';
import {modelImage} from './model-art.ts';
import {levelFor} from './levels.ts';
import {themeFloor,drawHazards,drawImpact,bossArt} from './effects.ts';

const {ink:INK,paper:PAPER,white:WHITE,meadow:MEADOW,pond:POND,sun:SUN,coral:CORAL,lilac:LILAC}=PALETTE,TAU=Math.PI*2;
type Point={x:number;y:number};
const masks={
  slime:['000011110000','001111111100','011111111110','111111111111','111111111111','110011110011','110011110011','111111111111','011111111110','001101101100'],
  archer:['100000000001','110001100011','011011110110','001111111100','000111111000','001101101100','011111111110','111011110111','110001100011','100001100001'],
  brute:['1100000011','1111111111','0111111110','1111111111','1111111111','1101111011','1111111111','0111111110','0111111110','0110000110'],
  boss:['11000000000000000011','11100000000000000111','01110000000000001110','00111001111110011100','00011111111111111000','00001111111111110000','00011111111111111000','00111111111111111100','00111111111111111100','00111001111110011100','00111001111110011100','00111111100111111100','00011111000011111000','00011111111111111000','00001111111111110000','00011111111111111000','00111111111111111100','00111111000011111100','00111110000001111100','00011110000001111000'],
};
function path(c:CanvasRenderingContext2D,points:Point[]){c.beginPath();points.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.closePath();}
function polygon(c:CanvasRenderingContext2D,points:Point[],fill:string=WHITE,stroke:string=INK,width=1.5){path(c,points);c.fillStyle=fill;c.fill();c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}
function groundRect(x:number,y:number,w:number,h:number){return [project(x,y),project(x+w,y),project(x+w,y+h),project(x,y+h)];}
function line(c:CanvasRenderingContext2D,a:Point,b:Point,width=1,color:string=INK){c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.strokeStyle=color;c.lineWidth=width;c.stroke();}
function dither(c:CanvasRenderingContext2D,points:Point[],dense=false,fill:string=WHITE){
  polygon(c,points,fill);c.save();path(c,points);c.clip();c.fillStyle=INK;
  const xs=points.map(p=>p.x),ys=points.map(p=>p.y),step=dense?4:5;
  for(let y=Math.floor(Math.min(...ys));y<Math.max(...ys);y+=step)for(let x=Math.floor(Math.min(...xs));x<Math.max(...xs);x+=step)c.fillRect(x+(Math.floor(y/step)%2)*2,y,dense?2:1,1);
  c.restore();
}
function ellipse(c:CanvasRenderingContext2D,x:number,y:number,rx:number,ry:number,fill:string=INK){c.fillStyle=fill;c.beginPath();c.ellipse(x,y,rx,ry,0,0,TAU);c.fill();}
const spriteCache=new Map<string,HTMLCanvasElement>();
function pixel(c:CanvasRenderingContext2D,rows:readonly string[],x:number,y:number,size:number,fill:string=INK,outline=true){
  const key=rows.join('')+fill+outline;
  let sprite=spriteCache.get(key);
  if(!sprite){
    sprite=document.createElement('canvas');sprite.width=rows[0].length+2;sprite.height=rows.length+2;
    const ctx=sprite.getContext('2d')!;
    const points=rows.flatMap((row,py)=>[...row].flatMap((p,px)=>p==='1'||p==='#'?[{x:px,y:py}]:[]));
    if(outline){ctx.fillStyle=WHITE;for(const p of points)ctx.fillRect(p.x,p.y,3,3);}
    ctx.fillStyle=fill;for(const p of points)ctx.fillRect(p.x+1,p.y+1,1,1);
    spriteCache.set(key,sprite);
  }
  // Scaling a whole bitmap avoids seams between adjacent pixels at fractional DPI.
  c.drawImage(sprite,Math.round(x-size),Math.round(y-size),sprite.width*size,sprite.height*size);
}
function plinth(c:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,height:number){
  const base=groundRect(x,y,w,h),top=base.map(p=>({x:p.x,y:p.y-height}));
  polygon(c,[top[1],top[2],base[2],base[1]],INK);dither(c,[top[2],top[3],base[3],base[2]],true);polygon(c,top);
}
function backdrop(c:CanvasRenderingContext2D,s:Run,t:number,reduced:boolean){
  c.fillStyle=PAPER;c.fillRect(0,0,VIEW_WIDTH,VIEW_HEIGHT);
  const low=28,high=ARENA_SIZE-low,corner=22;
  const outline=[[low+corner,low],[high-corner,low],[high,low+corner],[high,high-corner],[high-corner,high],[low+corner,high],[low,high-corner],[low,low+corner]].map(([x,y])=>project(x,y));
  // Flat meadow color and black cut edges follow the SDK's optional game palette.
  polygon(c,outline.map(p=>({x:p.x,y:p.y+16})),INK,INK,1.5);
  for(let i=0;i<outline.length;i++){const a=outline[i],b=outline[(i+1)%outline.length];
    if(b.x<a.x)for(let v=.1;v<1;v+=.13)line(c,{x:a.x+(b.x-a.x)*v,y:a.y+(b.y-a.y)*v+10},{x:a.x+(b.x-a.x)*v,y:a.y+(b.y-a.y)*v+16},.8,WHITE);
  }
  polygon(c,outline,s.level===5?'#e8def1':PALETTE[levelFor(s.level).color],INK,1.8);
  c.save();path(c,outline);c.clip();
  if(s.level===1)for(let y=48;y<high;y+=31)for(let x=48;x<high;x+=39){
    const p=project(x+((y*3)%13),y);c.fillStyle='#68804b';c.fillRect(Math.round(p.x),Math.round(p.y),2,1);
    if((x+y)%3===0)line(c,{x:p.x-2,y:p.y-1},{x:p.x+2,y:p.y+1},.6,'#68804b');
  }
  if(s.level===1){
  // Dotted borders leave a clear central field for reading bullets and enemies.
  dither(c,groundRect(48,180,17,420),false,MEADOW);dither(c,groundRect(895,340,17,420),false,MEADOW);
  dither(c,groundRect(195,48,160,22),false,MEADOW);dither(c,groundRect(345,890,210,18),false,MEADOW);
  // Ground paint only: no scenery, obstacles or new collision bodies.
  polygon(c,groundRect(427,427,106,106),PAPER,'#68804b',1);
  for(const size of [106,86]){path(c,groundRect(480-size/2,480-size/2,size,size));c.strokeStyle='#68804b';c.lineWidth=1;c.stroke();}
  }
  themeFloor(c,s,t,reduced);
  if(s.level===1&&(s.phase==='boss'||s.phase==='won')){
    for(const radius of [170,192,255]){const ring=Array.from({length:64},(_,i)=>project(480+Math.cos(i*TAU/64)*radius,480+Math.sin(i*TAU/64)*radius));path(c,ring);c.strokeStyle=radius===192?'#111':'#bbb';c.lineWidth=1;c.stroke();}
    for(let i=0;i<8;i++){const a=i*TAU/8,p=project(480+Math.cos(a)*225,480+Math.sin(a)*225);c.fillStyle=INK;c.fillRect(p.x-2,p.y-2,4,4);}
  }
  c.restore();
  c.fillStyle=INK;c.textAlign='center';c.font='9px monospace';
  c.fillText(`L${s.level} — ${(s.phase==='boss'?levelFor(s.level).boss:levelFor(s.level).name).toUpperCase()}`,VIEW_WIDTH/2,790);
}
function enemy(c:CanvasRenderingContext2D,e:Enemy,s:Run,t:number,reduced:boolean){
  const p=project(e.x,e.y),rows=masks[e.kind],size=e.kind==='boss'?3.5:e.kind==='brute'?3:2.5;
  const bob=reduced?0:Math.sin(t*(e.kind==='boss'?2:5)+e.id)*2;
  if((e.spawnDelay??0)>0){c.strokeStyle=INK;c.lineWidth=2;c.beginPath();c.ellipse(p.x,p.y,20,8,0,0,TAU);c.stroke();c.fillStyle=INK;c.font='9px monospace';c.textAlign='center';c.fillText('!',p.x,p.y-12);return;}
  ellipse(c,p.x,p.y+1,e.r*.85,4,'#0002');
  if(e.kind==='boss'&&s.level>1)bossArt(c,e,s,t,reduced);
  else{
    pixel(c,rows,p.x-rows[0].length*size/2,p.y-rows.length*size+bob,size,e.flash>0?'#999':INK);
    if(s.level>1){c.fillStyle=PALETTE[levelFor(s.level).color];c.fillRect(p.x-8,p.y-rows.length*size+8,16,5);if(e.kind==='archer')line(c,{x:p.x+15,y:p.y-25},{x:p.x+15,y:p.y-3},3,PALETTE[levelFor(s.level).color]);}
  }
  if(e.kind==='boss'){
    if(s.level===1){c.fillStyle=SUN;c.fillRect(p.x-17,p.y-42+bob,7,7);c.fillRect(p.x+10,p.y-42+bob,7,7);
    c.fillStyle=INK;c.fillRect(p.x-15,p.y-40+bob,3,3);c.fillRect(p.x+12,p.y-40+bob,3,3);}
    if(e.shielded){c.strokeStyle=INK;c.lineWidth=2;c.setLineDash([5,4]);c.strokeRect(p.x-43,p.y-82,86,88);c.setLineDash([]);c.fillStyle=PAPER;c.fillRect(p.x-29,p.y-98,58,12);c.fillStyle=INK;c.textAlign='center';c.font='8px monospace';c.fillText('SHIELDED',p.x,p.y-89);}
  }
  const statuses:[boolean,string,string][]=[
    [(e.slowUntil??0)>s.time,'SLOW',MEADOW],[Boolean(e.burn),'BURN',CORAL],
    [Boolean(e.bleed),'BLEED',CORAL],[(e.eclipseUntil??0)>s.time,'MARK',LILAC],
  ];
  statuses.filter(([active])=>active).forEach(([,name,color],i)=>{
    c.fillStyle=color;c.fillRect(p.x-19,p.y+8+i*11,38,10);c.strokeStyle=INK;c.lineWidth=.7;c.strokeRect(p.x-19,p.y+8+i*11,38,10);
    c.fillStyle=INK;c.font='bold 8px monospace';c.textAlign='center';c.fillText(name,p.x,p.y+16+i*11);
  });
  if(e.hp<e.maxHp&&e.kind!=='boss'){
    c.fillStyle=WHITE;c.fillRect(p.x-15,p.y-rows.length*size-10,30,5);c.strokeStyle=INK;c.lineWidth=1;c.strokeRect(p.x-15,p.y-rows.length*size-10,30,5);
    c.fillStyle=CORAL;c.fillRect(p.x-14,p.y-rows.length*size-9,28*e.hp/e.maxHp,3);
  }
}
export function render(c:CanvasRenderingContext2D,s:Run,sprites:GenerationSprites|null,t:number,reduced:boolean,portrait:HTMLImageElement|null=null){
  c.save();c.imageSmoothingEnabled=false;c.lineJoin='miter';c.lineCap='square';
  if(s.shake>0&&!reduced)c.translate(Math.sin(t*57)*s.shake*9,Math.cos(t*47)*s.shake*9);
  backdrop(c,s,t,reduced);drawHazards(c,s);drawImpact(c,s,reduced);
  if(s.abilityFlash>0&&['pulse','heal','ward'].includes(gearFor(s.loadout.ability).ability??'')){const ring=Array.from({length:40},(_,i)=>project(s.x+Math.cos(i*TAU/40)*150,s.y+Math.sin(i*TAU/40)*150));c.save();c.globalAlpha=s.abilityFlash*2;path(c,ring);c.strokeStyle=gearFor(s.loadout.ability).ability==='heal'?MEADOW:LILAC;c.lineWidth=5;c.stroke();c.restore();}
  for(const flame of s.flames){
    const half=flame.arc*Math.PI/360,points=Array.from({length:25},(_,i)=>{const a=flame.angle-half+2*half*i/24;return project(flame.x+Math.cos(a)*flame.range,flame.y+Math.sin(a)*flame.range);});
    c.save();c.globalAlpha=.35+Math.min(.3,flame.life*.2);polygon(c,[project(flame.x,flame.y),...points],SUN,CORAL,2);
    for(let i=2;i<points.length;i+=4){const p=points[i];polygon(c,[{x:p.x-3,y:p.y},{x:p.x,y:p.y-(reduced?9:9+Math.sin(t*8+i)*3)},{x:p.x+3,y:p.y}],CORAL,INK,.7);}
    c.restore();
  }
  for(const swing of s.swings){
    const half=swing.arc*Math.PI/360,points=Array.from({length:25},(_,i)=>{const a=swing.angle-half+2*half*i/24;return project(swing.x+Math.cos(a)*swing.range,swing.y+Math.sin(a)*swing.range);});
    c.save();c.globalAlpha=Math.min(1,swing.life*8);polygon(c,[project(swing.x,swing.y),...points],swing.bash?SUN:POND,INK,swing.bash?3:1.5);
    c.beginPath();points.forEach((p,i)=>i?c.lineTo(p.x,p.y-10):c.moveTo(p.x,p.y-10));c.strokeStyle=INK;c.lineWidth=swing.bash?7:3;c.stroke();c.restore();
  }
  for(const e of s.enemies)if(e.windup>0){
    const ux=e.aim.x,uy=e.aim.y,points=[[-24,0],[24,0],[24,250],[-24,250]].map(([side,ahead])=>project(e.x+ux*ahead-uy*side,e.y+uy*ahead+ux*side));
    c.save();c.globalAlpha=.8;dither(c,points,true,CORAL);c.restore();c.setLineDash([5,4]);path(c,points);c.strokeStyle=INK;c.lineWidth=2;c.stroke();c.setLineDash([]);
  }
  const layers:{depth:number;draw:()=>void}[]=[];
  for(const e of s.enemies)layers.push({depth:e.x+e.y,draw:()=>enemy(c,e,s,t,reduced)});
  const player=s.phase==='camp'?{x:650,y:520}:s;
  layers.push({depth:player.x+player.y,draw:()=>{
    const p=project(player.x,player.y),gear=gearFor(s.gearId);ellipse(c,p.x,p.y+2,15,4,'#0003');
    if(s.dashTime>0||s.abilityDashTime>0){c.strokeStyle=INK;c.lineWidth=1.5;c.strokeRect(p.x-18,p.y-4,36,7);}
    if(s.invul>0&&!reduced&&Math.floor(t*18)%2===0)c.globalAlpha=.4;
    if(portrait){c.drawImage(portrait,p.x-24,p.y-46,48,48);}
    else if(sprites){
      const rows=spriteFrame(sprites,s.facing,s.moving,reduced?0:Math.floor(t*9)%8).frame.rows;
      pixel(c,rows,p.x-24,p.y-45,3);
    }else{c.fillStyle=INK;c.fillRect(p.x-8,p.y-24,16,24);}
    c.globalAlpha=1;
    { // Starter weapons use the same low-poly sprite library.
      const model=modelImage(gear.id);
      if(model){const height=gear.family==='dagger'?32:gear.family==='sword'?54:48;c.drawImage(model,p.x+20-height/2,p.y-height+7,height,height);}
      else if(gear.family==='bow'){c.beginPath();c.ellipse(p.x+22,p.y-17,9,18,0,-Math.PI/2,Math.PI/2);c.strokeStyle=INK;c.lineWidth=2;c.stroke();line(c,{x:p.x+22,y:p.y-35},{x:p.x+22,y:p.y+1},1);}
      else {const height=gear.family==='dagger'?17:gear.family==='sword'?36:27;c.fillStyle=WHITE;c.fillRect(p.x+19,p.y-height,7,height);c.fillStyle=INK;c.fillRect(p.x+21,p.y-height+3,3,height-5);c.fillRect(p.x+17,p.y-height-1,11,5);}
    }
    if(s.weaponState.heat>0){for(let i=0;i<5;i++){c.fillStyle=i<s.weaponState.heat?CORAL:PAPER;c.fillRect(p.x-17+i*7,p.y+10,5,5);}}
    if(s.weaponState.fleetUntil>s.time){line(c,{x:p.x-24,y:p.y+7},{x:p.x+24,y:p.y+7},3,POND);}
    if(s.shield){c.beginPath();c.ellipse(p.x,p.y-23,34,38,0,0,TAU);c.strokeStyle=POND;c.lineWidth=6;c.stroke();c.strokeStyle=INK;c.lineWidth=1.5;c.stroke();c.fillStyle=INK;c.font='8px monospace';c.textAlign='center';c.fillText('1 HIT',p.x,p.y-65);}
  }});
  if(s.phase==='won')layers.push({depth:960,draw:()=>{
    const p=project(480,480);plinth(c,459,464,42,32,23);c.fillStyle=INK;c.fillRect(p.x-2,p.y-15,5,8);
    for(let i=0;i<5;i++){const a=i*TAU/5+t*.2,x=p.x+Math.cos(a)*45,y=p.y-30+Math.sin(a)*28;line(c,{x:x-3,y},{x:x+3,y});line(c,{x,y:y-3},{x,y:y+3});}
  }});
  layers.sort((a,b)=>a.depth-b.depth).forEach(layer=>layer.draw());
  for(const shot of s.shots){
    const p=project(shot.x,shot.y);p.y-=16;
    if(shot.enemy){const tail=project(shot.x-shot.vx*.055,shot.y-shot.vy*.055);tail.y-=16;if(!reduced)line(c,tail,p,3,PALETTE[levelFor(s.level).color]);ellipse(c,p.x,p.y,6,6,INK);ellipse(c,p.x,p.y,4.5,4.5,CORAL);c.fillStyle=WHITE;c.fillRect(p.x-1,p.y-1,2,2);}
    else if(shot.visual==='orb'){
      if(shot.comet&&!reduced){const tail=project(shot.x-shot.vx*.1,shot.y-shot.vy*.1);tail.y-=16;line(c,tail,p,9,SUN);line(c,tail,p,3,WHITE);}
      ellipse(c,p.x,p.y,shot.comet?12:9,shot.comet?12:9,INK);ellipse(c,p.x,p.y,shot.comet?10:7,shot.comet?10:7,shot.comet?SUN:shot.ricochet?LILAC:POND);ellipse(c,p.x-2,p.y-2,2,2,WHITE);
    }
    else{const trail=project(shot.x-shot.vx*(shot.visual==='arrow'?.065:.03),shot.y-shot.vy*(shot.visual==='arrow'?.065:.03));trail.y-=16;line(c,trail,p,5,WHITE);line(c,trail,p,2,INK);
      if(shot.visual==='arrow'){const a=Math.atan2(p.y-trail.y,p.x-trail.x);for(const side of [-1,1])line(c,p,{x:p.x-Math.cos(a+side*.5)*8,y:p.y-Math.sin(a+side*.5)*8},2);}
      else{c.fillStyle=INK;c.fillRect(p.x-2,p.y-2,4,4);}}
  }
  if(gearFor(s.gearId).family==='orbit')for(let i=0;i<3;i++){
    const a=s.time*3+i*TAU/3,p=project(s.x+Math.cos(a)*42,s.y+Math.sin(a)*42);
    c.save();c.translate(p.x,p.y-18);c.rotate(a);c.fillStyle=WHITE;c.fillRect(-10,-4,20,8);c.fillStyle=INK;c.fillRect(-8,-2,16,4);c.restore();
  }
  if(!reduced)for(const particle of s.particles){const p=project(particle.x,particle.y);c.globalAlpha=Math.max(0,particle.life/particle.maxLife);c.fillStyle=particle.color;c.fillRect(p.x,p.y-15,particle.size,particle.size);c.strokeStyle=INK;c.lineWidth=.5;c.strokeRect(p.x,p.y-15,particle.size,particle.size);}c.globalAlpha=1;
  c.font='bold 11px monospace';c.textAlign='center';c.lineWidth=3;
  for(const text of s.texts){const p=project(text.x,text.y);c.globalAlpha=Math.min(1,text.life*3);c.strokeStyle=WHITE;c.strokeText(text.text,p.x,p.y-27);c.fillStyle=INK;c.fillText(text.text,p.x,p.y-27);}c.globalAlpha=1;
  c.restore();
}
