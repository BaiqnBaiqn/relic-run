import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {chromium} from 'playwright';
import {createServer} from 'node:http';
import validator from 'gltf-validator';
import {PNG} from 'pngjs';
import {createHash} from 'node:crypto';
import {CHEST_GEAR,ITEM_TYPES} from '../games/relic-run/gear.ts';

const sample=process.argv.includes('--sample'),dir='games/relic-run/art/models/lowpoly';
const manifest=JSON.parse(await readFile(join(dir,sample?'sample-manifest.json':'manifest.json'),'utf8'));
const tiers=sample?[1,5]:[1,2,3,4,5],models=manifest.models,icons={},reports=[];
await mkdir('artifacts',{recursive:true});
for(const model of models){
  const bytes=await readFile(join(dir,model.file)),validation=await validator.validateBytes(new Uint8Array(bytes),{uri:model.file});
  if(validation.issues.numErrors)throw Error(model.name+': '+JSON.stringify(validation.issues));
  const pngBytes=await readFile(join(dir,model.render)),png=PNG.sync.read(pngBytes);
  let visible=0;for(let i=0;i<png.data.length;i+=4)if(png.data[i+3]){visible++;if(png.data[i]!==png.data[i+1]||png.data[i+1]!==png.data[i+2])throw Error('Color tint in '+model.name);}
  if(visible<400)throw Error('Empty render '+model.name);
  const icon={name:model.type,title:model.name,tier:model.tier,src:'data:image/png;base64,'+pngBytes.toString('base64'),width:png.width,height:png.height};
  icons[model.id]=icon;reports.push({id:model.id,sha256:createHash('sha256').update(bytes).digest('hex'),...validation.issues});
}
if(!sample){
  if(models.length!==75||new Set(models.map(m=>m.id)).size!==75)throw Error('Expected exactly 75 unique models');
  if(CHEST_GEAR.some(g=>!icons[g.id]))throw Error('Catalog item missing');
  await writeFile(join(dir,'icons.json'),JSON.stringify(icons)+'\n');
  await writeFile(join(dir,'validation.json'),JSON.stringify(reports,null,2)+'\n');
}
const escape=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
const sheet=(slot)=>`<section data-slot="${slot}" class="category"><h2>${{weapon:'Weapons',ability:'Abilities',armor:'Armor',ring:'Rings'}[slot]}</h2><div class="tier-head"><span>FAMILY</span>${tiers.map(t=>'<span>TIER '+t+'</span>').join('')}</div>${ITEM_TYPES.filter(t=>t.slot===slot).map(type=>`<div class="family"><div class="family-name">${type.label}</div>${tiers.map(t=>{const m=models.find(m=>m.type===type.type&&m.tier===t);return `<article><img alt="${escape(m.name)}" src="${icons[m.id].src}"/><strong>${escape(m.name)}</strong><small>${m.triangles} triangles</small></article>`;}).join('')}</div>`).join('')}</section>`;
const html=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Relic Run · Blender equipment library</title><style>
*{box-sizing:border-box}body{margin:0;background:#edece6;color:#111;font:12px/1.5 ui-monospace,Consolas,monospace;padding:32px}main{max-width:1440px;margin:auto}header{padding-bottom:24px;border-bottom:2px solid #111;margin-bottom:24px}h1{font-size:28px;margin:6px 0 10px;letter-spacing:-1px}header>small{font-size:10px;letter-spacing:2px}header p{max-width:760px;color:#444}nav{display:flex;gap:8px;margin-top:20px}button{background:#fff;border:1px solid #111;padding:8px 13px;font:inherit;cursor:pointer}button.active{background:#111;color:white}.category{border:1px solid #111;background:#f8f7f2;margin-bottom:28px;box-shadow:4px 4px #111;overflow:hidden}.category h2{margin:0;background:#111;color:#fff;padding:12px 18px;font-size:15px;letter-spacing:2px;text-transform:uppercase}.tier-head,.family{display:grid;grid-template-columns:125px repeat(${tiers.length},minmax(0,1fr))}.tier-head{border-bottom:1px solid #111;background:#e1e0d9;font-size:10px;letter-spacing:1px;text-align:center;padding:10px 0}.family+.family{border-top:1px solid #bbb}.family-name{display:flex;align-items:center;padding:18px;font-size:12px;text-transform:uppercase;letter-spacing:1px;font-weight:bold;border-right:1px solid #bbb}article{min-width:0;padding:12px 8px;text-align:center;border-right:1px solid #ccc}article:last-child{border:0}article img{display:block;width:100%;height:154px;object-fit:contain;image-rendering:pixelated;margin:0 auto 6px}article strong{display:block;font-size:10px;line-height:1.4;min-height:28px}article small{font-size:9px;color:#666}footer{font-size:11px;color:#555;padding-block:8px 20px}.hidden{display:none}@media(max-width:750px){body{padding:12px}h1{font-size:21px}.category{overflow-x:auto}.family,.tier-head{min-width:950px}nav{flex-wrap:wrap}}
</style></head><body><main><header><small>RELIC RUN / BLENDER EQUIPMENT LIBRARY</small><h1>${sample?'Base → masterwork study.':'75 items. Five tiers. One family at a time.'}</h1><p>Original super-low-poly equipment inspired by RuneScape’s readable silhouettes. Each tier develops the previous shape. Pure black and white materials, flat faces, neutral shading.</p><nav>${['all','weapon','ability','armor','ring'].map((s,i)=>`<button class="${i?'':'active'}" data-filter="${s}">${{all:'All 75',weapon:'Weapons',ability:'Abilities',armor:'Armor',ring:'Rings'}[s]}</button>`).join('')}</nav></header>${['weapon','ability','armor','ring'].map(sheet).join('')}<footer>Authored in Blender 5.2.1 · ${models.length} models · ${Math.min(...models.map(m=>m.triangles))}–${Math.max(...models.map(m=>m.triangles))} triangles each · No textures or subdivision · Editable .blend + individual GLBs</footer></main><script>document.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-filter]').forEach(v=>v.classList.toggle('active',v===b));document.querySelectorAll('[data-slot]').forEach(s=>s.classList.toggle('hidden',b.dataset.filter!=='all'&&s.dataset.slot!==b.dataset.filter));});</script></body></html>`;
const name=sample?'lowpoly-study':'lowpoly-items';await writeFile('artifacts/'+name+'.html',html);
const server=createServer((req,res)=>{res.writeHead(200,{'Content-Type':'text/html'});res.end(html);});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({headless:true});
try{
  const page=await browser.newPage({viewport:{width:sample?1000:1440,height:1000},deviceScaleFactor:1});await page.goto('http://127.0.0.1:'+server.address().port);
  await page.evaluate(()=>Promise.all([...document.images].map(i=>i.decode())));
  for(const slot of ['weapon','ability','armor','ring'])await page.locator('[data-slot="'+slot+'"]').screenshot({path:'artifacts/'+name+'-'+slot+'.png'});
  await page.screenshot({path:'artifacts/'+name+'-all.png',fullPage:true});
  if(!sample){await page.getByRole('button',{name:'Armor',exact:true}).click();if(await page.locator('.category:visible').count()!==1)throw Error('Category filter failed');}
}finally{await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
console.log(`${models.length} Blender models validated; ${reports.reduce((n,r)=>n+r.numErrors,0)} errors, ${reports.reduce((n,r)=>n+r.numWarnings,0)} warnings. Preview and game icons generated.`);
