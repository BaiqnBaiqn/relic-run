import {readFile,writeFile} from 'node:fs/promises';
import {PNG} from 'pngjs';
// Frame the existing Blender renders without resampling or changing their art.
const root=new URL('../games/relic-run/art/models/lowpoly/',import.meta.url),icons=JSON.parse(await readFile(new URL('icons.json',root),'utf8')),frames={};
for(const [id,icon] of Object.entries(icons)){
  const p=PNG.sync.read(Buffer.from(icon.src.split(',')[1],'base64'));let left=p.width,top=p.height,right=0,bottom=0;
  for(let y=0;y<p.height;y++)for(let x=0;x<p.width;x++)if(p.data[(y*p.width+x)*4+3]>0){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);}
  const size=Math.min(192,Math.max(right-left+1,bottom-top+1)+18);
  frames[id]={x:Math.max(0,Math.min(192-size,Math.floor((left+right-size)/2))),y:Math.max(0,Math.min(192-size,Math.floor((top+bottom-size)/2))),size};
}
await writeFile(new URL('frames.json',root),JSON.stringify(frames)+'\n');
console.log('Framed all 75 original low-poly sprites for legible inventory icons.');
