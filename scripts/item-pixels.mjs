import {mkdir,writeFile} from 'node:fs/promises';
import {deflateSync} from 'node:zlib';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
import {ITEM_PIXELS,SPRITE_SIZE as SIZE} from '../games/relic-run/art/item-pixels-16.ts';
import {CHEST_GEAR,ITEM_TYPES} from '../games/relic-run/gear.ts';

const root=fileURLToPath(new URL('..',import.meta.url)),out=path.join(root,'games/relic-run/art/items-1bit-16');
await mkdir(out,{recursive:true});
const crcTable=Array.from({length:256},(_,n)=>{for(let i=0;i<8;i++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
function chunk(name,data){
  const type=Buffer.from(name),size=Buffer.alloc(4);size.writeUInt32BE(data.length);
  let crc=0xffffffff;for(const byte of Buffer.concat([type,data]))crc=crcTable[(crc^byte)&255]^(crc>>>8);
  const checksum=Buffer.alloc(4);checksum.writeUInt32BE((crc^0xffffffff)>>>0);return Buffer.concat([size,type,data,checksum]);
}
// Actual indexed PNG, one bit per pixel: white and black, with an optional
// transparency entry for white. No resizing or grayscale conversion is involved.
function png(width,height,pixels,transparent=true){
  const header=Buffer.alloc(13);header.writeUInt32BE(width);header.writeUInt32BE(height,4);header[8]=1;header[9]=3;
  const stride=Math.ceil(width/8)+1,scanlines=Buffer.alloc(stride*height);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(pixels[y*width+x])scanlines[y*stride+1+(x>>3)]|=1<<(7-(x&7));
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('PLTE',Buffer.from([255,255,255,0,0,0])),
    ...(transparent?[chunk('tRNS',Buffer.from([0,255]))]:[]),chunk('IDAT',deflateSync(scanlines)),chunk('IEND',Buffer.alloc(0))]);
}
const atlasWidth=SIZE*5,atlasHeight=SIZE*ITEM_TYPES.length;
const sprites={},frames={},atlas=new Uint8Array(atlasWidth*atlasHeight),unique=new Set();
for(const gear of CHEST_GEAR){
  const source=ITEM_PIXELS[gear.itemType][gear.tier-1],rows=source.split('/');
  assert.equal(rows.length,SIZE,gear.name);assert.ok(rows.every(row=>row.length===SIZE&&/^[.#]+$/.test(row)),gear.name+` must be exactly ${SIZE}×${SIZE}`);
  assert.ok(!unique.has(source),'Duplicate sprite: '+gear.name);unique.add(source);
  const pixels=Uint8Array.from(rows.join(''),p=>p==='#'?1:0),data=png(SIZE,SIZE,pixels);
  assert.ok(pixels.some(Boolean),gear.name+' must not be empty');
  sprites[gear.id]={rows,src:'data:image/png;base64,'+data.toString('base64')};
  await writeFile(path.join(out,gear.id+'.png'),data);
  const x=(gear.tier-1)*SIZE,y=ITEM_TYPES.findIndex(type=>type.type===gear.itemType)*SIZE;
  for(let py=0;py<SIZE;py++)for(let px=0;px<SIZE;px++)atlas[(y+py)*atlasWidth+x+px]=pixels[py*SIZE+px];
  frames[gear.id]={name:gear.name,type:gear.itemType,tier:gear.tier,frame:{x,y,w:SIZE,h:SIZE}};
}
assert.equal(unique.size,75);
await writeFile(path.join(out,'atlas.png'),png(atlasWidth,atlasHeight,atlas));
await writeFile(path.join(out,'atlas-white.png'),png(atlasWidth,atlasHeight,atlas,false));
await writeFile(path.join(out,'atlas.json'),JSON.stringify({image:'atlas.png',width:atlasWidth,height:atlasHeight,bitDepth:1,palette:['#ffffff','#000000'],transparentIndex:0,frames},null,2));
await writeFile(path.join(out,'sprites.json'),JSON.stringify(sprites));
console.log(`Exported 75 unique native ${SIZE}×${SIZE}, 1-bit PNG sprites; ${atlasWidth}×${atlasHeight} atlas; two-color palette with binary transparency.`);
for(const {type} of ITEM_TYPES)console.log(type+': '+ITEM_PIXELS[type].map(s=>[...s].filter(c=>c==='#').length).join(' → '));
