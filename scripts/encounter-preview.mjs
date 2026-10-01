// Isolated visual study of the production renderer. Never touches a playtest save.
import {build} from 'esbuild';
import {mkdir,writeFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {chromium} from 'playwright';
await mkdir('artifacts',{recursive:true});
const result=await build({stdin:{contents:`
import {makeRun,enterBoss} from './games/relic-run/engine.ts';
import {bossPattern} from './games/relic-run/encounters.ts';
import {render} from './games/relic-run/render.ts';
import {sampleFriendSprites} from './games/relic-run/art/friend-sample.ts';
import {LEVELS} from './games/relic-run/levels.ts';
const sprites=sampleFriendSprites(7730n),states=[];
for(const l of LEVELS.slice(1)){
 const s=makeRun({weapon:200+l.id,ability:270+l.id,armor:300+l.id,ring:310+l.id},42,undefined,l.id);s.phase='door';enterBoss(s);
 s.x=630;s.y=640;const b=s.enemies[0];b.x=420;b.y=390;
 b.pattern=l.id===2?1:l.id===5?2:0;bossPattern(s,b);
 for(const h of s.hazards){h.delay=0;if(h.kind==='tide'){h.x+=h.vx*2.6;h.y+=h.vy*2.6;}}
 const canvas=document.querySelector('[data-level="'+l.id+'"]');states.push({s,c:canvas.getContext('2d')});
}
window.renderPreview=(reduced=false)=>{for(const {s,c} of states)render(c,s,sprites,2.5,reduced);};
window.renderPreview();
`,resolveDir:process.cwd(),loader:'ts'},bundle:true,write:false,format:'iife',platform:'browser',target:'es2022',minify:true});
const script=result.outputFiles[0].text;
const cards=[['SUNKEN','The Sunken Boardwalk','Tidemouth Crab · crossing tides','20 RF · 230 GEMZ'],['GLASSROOT','The Glassroot Quarry','Prismback Tortoise · locked beams','40 RF · 520 GEMZ'],['CINDER','The Cinder Orchard','The Kilnkeeper · heated plots','80 RF · 1,160 GEMZ'],['STARFALL','The Starfall Sanctuary','Astral Gardener · falling stars','160 RF · 2,560 GEMZ']];
const html=`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Relic Run · new expeditions</title><style>*{box-sizing:border-box}body{margin:0;padding:28px;background:#f6f5ef;color:#111;font:12px ui-monospace,Consolas,monospace}header{border-bottom:2px solid #111;padding-bottom:20px;margin-bottom:22px}h1{font-size:28px;letter-spacing:-1px;margin:6px 0 10px}header p{max-width:800px;line-height:1.7}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:22px}article{border:1px solid #111;box-shadow:4px 4px #111;background:#fff}article>div{padding:14px;border-bottom:1px solid #111;background:var(--color)}h2{font-size:16px;margin:4px 0 8px}small{letter-spacing:1px}article p{margin:5px 0}canvas{display:block;width:100%;height:auto;image-rendering:pixelated}.note{font-size:10px;padding:12px;line-height:1.7}a{color:inherit}@media(max-width:750px){body{padding:15px}.grid{grid-template-columns:1fr}h1{font-size:23px}}</style><header><small>RELIC RUN / FIVE EXPEDITIONS PLAYTEST</small><h1>New places. New patterns.</h1><p>Levels 2–5 are playable from camp. These staged attack studies use the actual game renderer. Effects keep the ink silhouettes, add restrained color, and make danger visible.</p><a href="http://127.0.0.1:4173/?mode=guest">Open the game ↗</a></header><div class="grid">${cards.map((c,i)=>`<article style="--color:${['#7DB4DB','#B3A0D8','#ED927E','#F2CE68'][i]}"><div><small>LEVEL 0${i+2} / ${c[0]}</small><h2>${c[1]}</h2><p>${c[2]}</p><p>${c[3]}</p></div><canvas width="1100" height="820" data-level="${i+2}"></canvas></article>`).join('')}</div><p class="note">One global RF redemption pool · a separate jackpot at every level · 0.25% jackpot roll only after a boss clear · 80 / 15 / 5 entry split. Balance remains in playtest.</p><script>${script.replaceAll('</script','<\/script')}</script></html>`;
await writeFile('artifacts/expeditions-preview.html',html);
const server=createServer((req,res)=>{res.writeHead(200,{'Content-Type':'text/html'});res.end(html);});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:1320,height:1100}});const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>typeof window.renderPreview==='function');await page.evaluate(()=>window.renderPreview());
 await page.screenshot({path:'artifacts/expeditions-preview.png',fullPage:true});
 await page.evaluate(()=>window.renderPreview(true));await page.screenshot({path:'artifacts/expeditions-reduced.png',fullPage:true});
 if(errors.length)throw Error(errors.join('\n'));console.log('Four production-renderer attack studies and reduced-motion previews saved.');
}finally{await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
