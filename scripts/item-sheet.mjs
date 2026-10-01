import {build} from 'esbuild';
import {mkdir,writeFile,copyFile} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import path from 'node:path';
import {chromium} from 'playwright';
import {SPRITE_SIZE} from '../games/relic-run/art/item-pixels-16.ts';

// Export the actual React icons, keeping the review sheet in sync with the game.
const root=fileURLToPath(new URL('..',import.meta.url)),out=path.join(root,'artifacts');
await mkdir(out,{recursive:true});
const modulePath=path.join(out,'item-sheet-data.mjs');
await build({stdin:{contents:`
  import {createElement} from 'react';
  import {renderToStaticMarkup} from 'react-dom/server';
  import {GearIcon} from './games/relic-run/icons.tsx';
  import {CHEST_GEAR,ITEM_TYPES,SLOTS} from './games/relic-run/gear.ts';
  export const items=CHEST_GEAR.map(gear=>({...gear,icon:renderToStaticMarkup(createElement(GearIcon,{gear,size:64}))}));
  export const types=ITEM_TYPES;
  export const slots=SLOTS;
`,resolveDir:root,loader:'tsx'},outfile:modulePath,bundle:true,format:'esm',platform:'node',packages:'external',jsx:'automatic',logLevel:'warning'});
const {items,types,slots}=await import(pathToFileURL(modulePath).href);
if(items.length!==75||new Set(items.map(g=>g.id)).size!==75)throw Error('Expected all 75 unique chest items.');
const escape=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[char]));
const text=(x,y,value,size=14,extra='')=>`<text x="${x}" y="${y}" font-size="${size}" ${extra}>${escape(value)}</text>`;
const label={weapon:'WEAPONS',ability:'ABILITIES',armor:'ARMOR',ring:'RINGS'};
const width=1560,margin=40,labelWidth=180,colWidth=260,rowHeight=112;
let y=152;
const body=[`<rect width="${width}" height="2064" fill="#eeeeec"/>`,
  text(margin,50,'RELIC RUN / CHEST ITEM ATLAS',28,'font-weight="700"'),
  text(margin,78,'75 UNIQUE SPRITES  ·  NATIVE 16 × 16 PIXELS  ·  1-BIT BLACK & WHITE',13),
  text(margin,109,'T1 → T5: stronger silhouettes, heavier construction and richer detail. Shown at 4× native size.',13,'fill="#555"')];
for(let tier=1;tier<=5;tier++)body.push(text(margin+labelWidth+(tier-.5)*colWidth,137,'T'+tier,16,'text-anchor="middle" font-weight="700"'));
for(const slot of slots){
  const group=types.filter(t=>t.slot===slot);
  body.push(`<rect x="${margin}" y="${y}" width="${width-2*margin}" height="30" fill="#111"/>`,text(margin+14,y+20,`${label[slot]} / ${group.length*5} ITEMS`,13,'fill="#fff" font-weight="700"'));
  y+=30;
  for(const type of group){
    body.push(text(margin+12,y+62,type.label.toUpperCase(),14,'font-weight="700"'));
    for(let tier=1;tier<=5;tier++){
      const gear=items.find(g=>g.itemType===type.type&&g.tier===tier),x=margin+labelWidth+(tier-1)*colWidth;
      if(!gear)throw Error('Missing item '+type.type+' tier '+tier);
      body.push(`<rect x="${x}" y="${y}" width="${colWidth}" height="${rowHeight}" fill="#fff" stroke="#ccc" stroke-width="1"/>`,
        `<g transform="translate(${x+(colWidth-64)/2},${y+10})">${gear.icon}</g>`,
        text(x+colWidth/2,y+94,gear.name,14,'text-anchor="middle"'));
    }
    y+=rowHeight;
  }
  y+=12;
}
body.push(text(margin,y+19,'CHEST EQUIPMENT ONLY / Boss soulbound weapons, starter gear, legacy gear and potions are separate.',12,'fill="#555"'));
const height=y+42;
body[0]=`<rect width="${width}" height="${height}" fill="#eeeeec"/>`;
const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" color="#111" fill="#111" font-family="Consolas,monospace">${body.join('\n')}</svg>`;
await writeFile(path.join(out,'chest-item-sheet.svg'),svg);

const cell=SPRITE_SIZE,atlasWidth=cell*5,atlasHeight=cell*types.length,frames={},sprites=[];
for(let row=0;row<types.length;row++)for(let tier=1;tier<=5;tier++){
  const gear=items.find(g=>g.itemType===types[row].type&&g.tier===tier),x=(tier-1)*cell,y=row*cell;
  sprites.push(`<g transform="translate(${x},${y})">${gear.icon.replace('width="64" height="64"',`width="${cell}" height="${cell}"`)}</g>`);
  frames[gear.id]={name:gear.name,type:gear.itemType,tier,frame:{x,y,w:cell,h:cell}};
}
const atlas=`<svg xmlns="http://www.w3.org/2000/svg" width="${atlasWidth}" height="${atlasHeight}" viewBox="0 0 ${atlasWidth} ${atlasHeight}" color="#000">${sprites.join('')}</svg>`;
await writeFile(path.join(out,'chest-item-atlas.svg'),atlas);
await writeFile(path.join(out,'chest-item-atlas.json'),JSON.stringify({image:'chest-item-atlas.png',width:atlasWidth,height:atlasHeight,cellSize:cell,bitDepth:1,palette:['#ffffff','#000000'],transparentIndex:0,frames},null,2));
await copyFile(path.join(root,'games/relic-run/art/items-1bit-16/atlas.png'),path.join(out,'chest-item-atlas.png'));
const browser=await chromium.launch({headless:true});
try{
  const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});
  await page.setContent(`<html><head><style>html,body{margin:0;padding:0}svg{display:block}</style></head><body>${svg}</body></html>`);
  await page.locator('body>svg').screenshot({path:path.join(out,'chest-item-sheet.png')});
}finally{await browser.close();}
console.log(`Exported all ${items.length} chest items: labeled ${width}×${height} review sheet and native ${atlasWidth}×${atlasHeight}, 1-bit atlas with ${cell}×${cell} JSON frames.`);
