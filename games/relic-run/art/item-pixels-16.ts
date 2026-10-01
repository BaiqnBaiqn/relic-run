import {ITEM_TYPES,type ItemType} from '../gear.ts';

export const SPRITE_SIZE=16;
// Original art drawn directly on a 16×16 binary grid. These designs do not
// sample or enlarge the earlier 8×8 set. White cuts define facets and seams.
class Grid {
  pixels=new Uint8Array(SPRITE_SIZE*SPRITE_SIZE);
  p(x:number,y:number,value=1){if(x>=0&&x<16&&y>=0&&y<16)this.pixels[y*16+x]=value;}
  rect(x:number,y:number,w:number,h:number,value=1){for(let py=y;py<y+h;py++)for(let px=x;px<x+w;px++)this.p(px,py,value);}
  line(x:number,y:number,tx:number,ty:number,width=1,value=1){
    const dx=Math.abs(tx-x),dy=-Math.abs(ty-y),sx=x<tx?1:-1,sy=y<ty?1:-1;let err=dx+dy;
    const offset=Math.floor((width-1)/2);
    while(true){this.rect(x-offset,y-offset,width,width,value);if(x===tx&&y===ty)break;const e=2*err;if(e>=dy){err+=dy;x+=sx;}if(e<=dx){err+=dx;y+=sy;}}
  }
  poly(points:number[][],value=1){
    for(let y=0;y<16;y++)for(let x=0;x<16;x++){
      let inside=false;
      for(let i=0,j=points.length-1;i<points.length;j=i++){
        const [a,b]=points[i],[c,d]=points[j];
        if((b>y)!==(d>y)&&x<(c-a)*(y-b)/(d-b)+a)inside=!inside;
      }
      if(inside)this.p(x,y,value);
    }
    points.forEach(([x,y],i)=>this.line(x,y,...points[(i+1)%points.length] as [number,number],1,value));
  }
  oval(x:number,y:number,rx:number,ry:number,value=1){for(let py=0;py<16;py++)for(let px=0;px<16;px++)if(((px-x)/rx)**2+((py-y)/ry)**2<=1)this.p(px,py,value);}
  diamond(x:number,y:number,r:number,value=1){this.poly([[x,y-r],[x+r,y],[x,y+r],[x-r,y]],value);}
  rows(){return Array.from({length:16},(_,y)=>Array.from(this.pixels.slice(y*16,y*16+16),p=>p?'#':'.').join('')).join('/');}
}

function weapon(g:Grid,type:ItemType,t:number){
  if(type==='wand'){
    g.line(3,14,10,6,t>=3?3:2);
    g.line(4,12,8,8,1,0);
    if(t>=2){g.line(2,13,4,15);g.line(5,10,7,12);}
    const r=t===1?2:t<=3?3:4,cx=t>=4?10:11,cy=4;
    g.diamond(cx,cy,r);g.diamond(cx,cy,r-1,0);g.line(cx,cy-r+1,cx-1,cy,1);
    if(t>=2){g.p(cx+1,cy+1);g.line(cx-r,cy+1,cx-1,cy+r);}
    if(t>=3){g.line(6,5,7,7,2);g.line(12,7,14,6);g.p(13,5);}
    if(t>=4){g.poly([[5,1],[5,5],[7,7],[7,4]]);g.poly([[15,1],[13,3],[13,6],[15,4]]);g.p(10,0);}
    if(t===5){g.line(7,0,8,2);g.line(12,0,12,2);g.line(4,6,6,8,2);g.rect(3,12,2,2);g.p(3,12,0);g.p(9,5);}
    return;
  }
  if(type==='bow'){
    const top=t===1?2:1,bottom=t===1?13:14;
    g.line(5,top,5,bottom);
    const path=[[5,top],[8,top+1],[10,5],[11,7],[11,9],[10,11],[8,bottom-1],[5,bottom]];
    for(let i=1;i<path.length;i++)g.line(...path[i-1] as [number,number],...path[i] as [number,number],t>=2?2:1);
    if(t>=2){g.line(7,3,9,5,1,0);g.line(9,11,7,13,1,0);g.rect(10,7,3,3);}
    if(t>=3){g.line(3,0,6,2,2);g.line(3,15,6,13,2);g.p(12,4);g.p(12,12);}
    if(t>=4){g.line(8,1,12,5,2);g.line(12,11,8,15,2);g.line(10,3,12,6,1,0);g.line(12,10,10,13,1,0);}
    if(t===5){g.rect(6,0,4,2);g.rect(6,14,4,2);g.rect(13,5,2,2);g.rect(13,10,2,2);g.p(8,1,0);g.p(8,14,0);}
    g.line(1,8,14,8);g.line(12,6,14,8);g.line(12,10,14,8);g.p(2,7);g.p(2,9);
    return;
  }
  if(type==='sword'){
    g.line(2,14,6,10,t>=3?3:2);
    const blades=[
      [[13,2],[12,5],[7,10],[5,8],[10,3]],
      [[14,1],[13,5],[7,11],[5,8],[10,3]],
      [[14,0],[14,5],[8,11],[4,8],[10,2]],
      [[11,0],[15,0],[15,5],[9,11],[4,8],[8,3]],
      [[14,0],[15,4],[13,7],[8,12],[3,8],[8,3]],
    ];
    g.poly(blades[t-1]);g.line(7,8,12,t<=2?3:2,1,0);
    if(t>=3){g.line(8,9,13,4,1,0);g.p(10,5);}
    g.line(3,7,10,13,2);if(t>=2)g.line(4,8,8,12,1,0);
    if(t>=2){g.rect(1,13,2,2);g.p(2,13,0);}
    if(t>=4){g.line(2,6,2,9,2);g.line(9,13,12,13,2);g.p(11,6,0);}
    if(t===5){g.diamond(6,10,2);g.p(6,10,0);g.line(1,5,3,7);g.line(11,12,13,12);g.p(3,14,0);}
    return;
  }
  // Daggers keep a shorter blade and compact guard even at T5.
  g.line(3,13,6,10,t>=3?3:2);
  const blades=[
    [[11,5],[11,8],[7,11],[5,9],[8,6]],
    [[12,4],[12,8],[8,12],[5,9],[8,5]],
    [[13,3],[12,8],[8,12],[5,9],[9,4]],
    [[13,3],[14,5],[11,10],[7,12],[4,9],[9,4]],
    [[13,2],[14,4],[13,8],[9,12],[5,11],[4,8],[9,3]],
  ];
  g.poly(blades[t-1]);g.line(7,9,10,6,1,0);g.line(4,8,9,13,t>=2?2:1);
  if(t>=2){g.p(2,14);g.p(3,12,0);}
  if(t>=3){g.p(11,7,0);g.p(12,6,0);g.rect(5,12,2,2);}
  if(t>=4){g.p(14,6);g.p(12,9);g.line(7,10,11,6,1,0);g.p(3,9);}
  if(t===5){g.line(11,3,13,5,1,0);g.p(10,5,0);g.p(6,6);g.diamond(6,11,1);g.p(6,11,0);}
}

function ability(g:Grid,type:ItemType,t:number){
  if(type==='dash'){
    const left=t<=2?4:3,right=t<=2?11:12;
    g.poly([[6,2],[10,2],[right,5],[right,11],[8,14],[left,11],[left,5]]);
    g.poly([[6,4],[9,4],[10,6],[10,10],[8,12],[5,10],[5,6]],0);
    g.line(6,8,10,8);g.line(8,6,10,8);g.line(8,10,10,8);
    if(t>=2){g.p(8,1);g.rect(6,12,4,2);g.p(7,12,0);g.line(4,4,5,3);}
    if(t>=3){g.poly([[0,4],[4,6],[4,9],[1,7]]);g.poly([[15,4],[12,6],[12,9],[14,7]]);g.p(8,0);}
    if(t>=4){g.line(0,8,3,10,2);g.line(15,8,12,10,2);g.line(2,12,5,13);g.line(13,12,11,13);g.p(7,3,0);}
    if(t===5){g.line(0,2,4,4,2);g.line(15,2,12,4,2);g.p(2,4,0);g.p(13,4,0);g.line(5,14,10,14);g.p(7,10);}
    return;
  }
  if(type==='shield'){
    const edge=t===1?4:t===2?3:2;
    g.poly([[edge,3],[7,4],[15-edge,3],[15-edge,9],[11,13],[8,15],[4,13],[edge,9]]);
    g.poly([[edge+1,5],[7,6],[14-edge,5],[14-edge,9],[10,12],[8,13],[5,11],[edge+1,9]],0);
    g.line(7,6,7,11);g.line(5,8,10,8);
    if(t>=2){g.line(edge,2,7,3);g.line(7,3,15-edge,2);g.p(8,11);}
    if(t>=3){g.diamond(7,8,2);g.p(7,8,0);g.line(3,6,3,10);g.line(12,6,12,10);}
    if(t>=4){g.poly([[1,1],[4,3],[7,0],[11,3],[14,1],[14,5],[1,5]]);g.line(4,4,11,4,1,0);g.p(2,8,0);g.p(13,8,0);}
    if(t===5){g.rect(0,5,2,5);g.rect(14,5,2,5);g.p(0,6,0);g.p(15,6,0);g.line(4,12,7,15,2);g.line(11,12,8,15,2);g.p(7,1,0);}
    return;
  }
  if(type==='bash'){
    const shift=t===1?1:0;
    g.poly([[5,5+shift],[6,3+shift],[11,3+shift],[13,5+shift],[13,10],[10,13],[6,13],[3,10],[3,8],[5,8]]);
    g.rect(6,5+shift,6,4,0);g.line(8,4+shift,8,7+shift);g.line(10,4+shift,10,7+shift);
    g.line(4,9,7,11,1,0);g.rect(6,12,4,3);g.line(7,13,9,13,1,0);
    if(t>=2){g.rect(5,2,2,3);g.rect(8,2,2,2);g.rect(11,2,2,3);g.line(11,10,12,9,1,0);}
    if(t>=3){g.rect(2,7,2,4);g.rect(5,13,7,2);g.p(3,8,0);g.p(6,14,0);g.p(10,14,0);}
    if(t>=4){g.rect(13,5,2,5);g.rect(6,1,2,2);g.rect(10,1,2,2);g.line(8,9,10,9,1,0);g.p(14,6,0);}
    if(t===5){g.p(4,1);g.p(9,0);g.p(13,1);g.rect(1,7,2,5);g.rect(4,12,2,4);g.rect(10,12,3,4);g.p(11,14,0);g.line(6,10,8,12);}
    return;
  }
  // Heal: a cross engraved into a leaf-framed pendant.
  const radius=t===1?3:4;
  g.diamond(8,7,radius);g.line(8,5,8,9,1,0);g.line(6,7,10,7,1,0);
  g.line(8,10,8,13);g.diamond(8,14,1);g.p(8,14,0);
  if(t>=2){g.oval(5,4,2,1);g.oval(11,4,2,1);g.p(5,4,0);g.p(11,4,0);}
  if(t>=3){g.poly([[1,5],[5,6],[5,9],[2,8]]);g.poly([[15,5],[11,6],[11,9],[14,8]]);g.p(3,7,0);g.p(13,7,0);}
  if(t>=4){g.poly([[3,10],[6,10],[7,13],[4,12]]);g.poly([[13,10],[10,10],[9,13],[12,12]]);g.line(8,1,8,3,2);}
  if(t===5){g.line(3,1,6,3,2);g.line(13,1,10,3,2);g.p(1,9);g.p(15,9);g.line(4,13,6,14);g.line(12,13,10,14);g.p(8,3);}
}

function armor(g:Grid,type:ItemType,t:number){
  if(type==='robe'){
    const sleeve=t>=3?1:2;
    g.poly([[5,2],[7,4],[8,4],[10,2],[14-sleeve,4],[15-sleeve,7],[11,8],[10,6],[12,14],[3,14],[5,6],[4,8],[sleeve,7],[sleeve+1,4]]);
    g.poly([[5,4],[7,6],[8,6],[10,4],[9,7],[11,13],[4,13],[6,7]],0);
    g.line(7,6,6,12);g.line(8,6,9,12);g.line(5,9,10,9);
    if(t>=2){g.line(5,1,10,1);g.line(5,2,7,4,2);g.line(10,2,8,4,2);g.p(7,9,0);}
    if(t>=3){g.line(2,4,4,6,2);g.line(13,4,11,6,2);g.line(3,14,12,14,2);g.p(5,14,0);g.p(10,14,0);}
    if(t>=4){g.poly([[1,2],[5,3],[4,6],[0,5]]);g.poly([[14,2],[10,3],[11,6],[15,5]]);g.p(2,4,0);g.p(13,4,0);g.rect(7,10,2,3);}
    if(t===5){g.line(4,0,6,2,2);g.line(11,0,9,2,2);g.diamond(7,6,1);g.p(7,6,0);g.p(3,12);g.p(12,12);g.line(5,11,4,13);g.line(10,11,11,13);}
    return;
  }
  if(type==='light'){
    g.poly([[5,2],[7,4],[8,4],[10,2],[12,4],[11,7],[10,7],[11,12],[9,14],[6,14],[4,12],[5,7],[4,7],[3,4]]);
    g.poly([[5,4],[7,5],[8,5],[10,4],[9,8],[10,11],[5,11],[6,8]],0);
    g.line(7,5,8,10);g.p(8,6);g.p(7,8);g.line(5,12,10,12,1,0);
    if(t>=2){g.rect(2,3,3,3);g.rect(11,3,3,3);g.p(3,4,0);g.p(12,4,0);g.rect(6,13,4,2);}
    if(t>=3){g.line(4,6,6,8,2);g.line(11,6,9,8,2);g.line(5,9,7,11);g.line(10,9,8,11);g.p(7,9,0);}
    if(t>=4){g.poly([[1,2],[4,1],[5,5],[2,6]]);g.poly([[14,2],[11,1],[10,5],[13,6]]);g.p(3,3,0);g.p(12,3,0);g.line(4,11,4,13);g.line(11,11,11,13);}
    if(t===5){g.p(0,2);g.p(15,2);g.p(2,0);g.p(13,0);g.line(4,7,6,9,2);g.line(11,7,9,9,2);g.p(5,7,0);g.p(10,7,0);g.rect(7,12,2,2);}
    return;
  }
  const pad=t>=3?0:1;
  g.poly([[4,2],[6,3],[9,3],[11,2],[14-pad,4],[14-pad,7],[11,8],[11,12],[13,14],[2,14],[4,12],[4,8],[pad+1,7],[pad+1,4]]);
  g.rect(5,4,6,6,0);g.line(7,4,7,9);g.line(5,7,10,7);g.line(5,11,10,11,1,0);g.line(4,13,11,13,1,0);
  if(t>=2){g.rect(2,3,3,4);g.rect(11,3,3,4);g.p(3,4,0);g.p(12,4,0);g.rect(6,2,4,2);}
  if(t>=3){g.rect(0,3,4,4);g.rect(12,3,4,4);g.rect(1,4,2,1,0);g.rect(13,4,2,1,0);g.p(6,9);g.p(9,9);}
  if(t>=4){g.poly([[0,1],[4,2],[5,5],[0,5]]);g.poly([[15,1],[11,2],[10,5],[15,5]]);g.p(2,3,0);g.p(13,3,0);g.line(3,10,3,13,2);g.line(12,10,12,13,2);}
  if(t===5){g.rect(1,0,2,2);g.rect(13,0,2,2);g.rect(6,1,4,2);g.p(7,1,0);g.diamond(8,6,2);g.p(8,6,0);g.p(2,12,0);g.p(13,12,0);g.rect(6,14,4,2);}
}

function ring(g:Grid,type:ItemType,t:number){
  const rx=t===1?3:t===2?4:5,ry=t===1?3:4;
  g.oval(8,10,rx,ry);g.oval(8,10,rx-(t>=2?2:1),ry-(t>=2?2:1),0);
  if(t>=2){g.line(5,12,6,13,1,0);g.p(11,9,0);}
  if(t>=3){g.diamond(3,8,1);g.diamond(13,8,1);g.line(5,13,6,14);g.line(10,14,11,13);}
  if(t>=4){g.rect(2,8,2,4);g.rect(13,8,2,4);g.p(3,9,0);g.p(13,10,0);g.p(8,13,0);}
  if(t===5){g.poly([[1,5],[4,6],[4,9],[2,8]]);g.poly([[15,5],[12,6],[12,9],[14,8]]);g.p(2,6,0);g.p(14,6,0);g.rect(6,14,5,2);g.line(7,14,9,14,1,0);}
  if(type==='health'){
    const r=t<=2?2:3;
    g.poly([[8,3],[8-r,1],[6-r,3],[7-r,5],[8,8],[9+r,5],[10+r,3],[8+r,1]]);
    if(t>=2){g.line(6,3,5,4,1,0);g.p(10,3,0);}
    if(t>=3){g.line(7,6,8,7,1,0);g.p(11,5,0);}
    if(t>=4){g.p(4,1);g.p(12,1);g.p(6,0);g.p(10,0);}
    if(t===5){g.line(4,4,5,6);g.line(12,4,11,6);g.p(8,5,0);}
  }else if(type==='attack'){
    const r=t===1?2:t<=3?3:4;
    g.poly([[8,0],[8+r,4],[8,8],[8-r,4]]);
    g.line(8,2,7,4,1,0);
    if(t>=2)g.line(9,4,8,6,1,0);
    if(t>=3){g.p(4,4);g.p(12,4);g.p(5,6);g.p(11,6);}
    if(t>=4){g.line(3,2,5,4);g.line(13,2,11,4);}
    if(t===5){g.p(4,1);g.p(12,1);g.line(6,7,10,7);g.p(8,7,0);}
  }else if(type==='dexterity'){
    const r=t===1?3:t<=3?4:5;
    g.poly([[8-r,4],[6,2],[10,2],[8+r,4],[10,6],[6,6]]);
    g.poly([[8-r+1,4],[7,3],[9,3],[8+r-1,4],[9,5],[7,5]],0);g.rect(8,3,1,3);
    if(t>=2){g.p(6,1);g.p(10,1);g.p(8,7);}
    if(t>=3){g.p(3,4);g.p(13,4);g.p(5,6);g.p(11,6);}
    if(t>=4){g.line(4,1,6,2);g.line(12,1,10,2);g.line(4,6,6,7);g.line(12,6,10,7);}
    if(t===5){g.p(2,3);g.p(14,3);g.p(8,0);g.p(5,0);g.p(11,0);}
  }else{
    g.poly([[9,0],[12,0],[8,4],[11,4],[5,8],[7,4],[5,4]]);
    if(t>=2){g.line(9,2,8,3,1,0);g.line(4,3,6,2);}
    if(t>=3){g.line(3,5,5,4,2);g.line(11,5,13,3,2);g.p(11,4,0);}
    if(t>=4){g.line(1,2,5,1);g.line(1,4,4,3);g.line(12,6,15,3,2);g.p(13,5,0);}
    if(t===5){g.line(0,1,4,0,2);g.p(2,3);g.line(13,7,15,5);g.p(7,6,0);}
  }
}

export const ITEM_PIXELS:Record<ItemType,readonly string[]>=Object.fromEntries(ITEM_TYPES.map(({type,slot})=>[type,Array.from({length:5},(_,i)=>{
  const g=new Grid(),tier=i+1;
  if(slot==='weapon')weapon(g,type,tier);else if(slot==='ability')ability(g,type,tier);else if(slot==='armor')armor(g,type,tier);else ring(g,type,tier);
  return g.rows();
})])) as unknown as Record<ItemType,readonly string[]>;
