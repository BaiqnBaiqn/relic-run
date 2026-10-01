import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {createServer} from 'node:http';
import {build} from 'esbuild';
import {chromium} from 'playwright';
import {MODEL_DIR,MODEL_IDS} from './t1-models.mjs';

await mkdir('artifacts',{recursive:true});
const models=await Promise.all(Object.entries(MODEL_IDS).map(async([name,id])=>({name,id,bytes:(await readFile(join(MODEL_DIR,name+'.glb'))).toString('base64')})));
const {outputFiles}=await build({stdin:{contents:`
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
const models=${JSON.stringify(models)};
window.modelPreviews={};
async function main(){
  for(const model of models){
    const bytes=Uint8Array.from(atob(model.bytes),c=>c.charCodeAt(0));
    const gltf=await new GLTFLoader().parseAsync(bytes.buffer,'');
    const scene=new THREE.Scene(),pivot=new THREE.Group();
    // Use neutral preview lighting; retain the monochrome light in the GLB itself.
    gltf.scene.traverse(node=>{if(node.isLight)node.intensity=0;});
    const box=new THREE.Box3().setFromObject(gltf.scene),center=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3());
    gltf.scene.position.sub(center);pivot.add(gltf.scene);scene.add(pivot);
    const light=new THREE.DirectionalLight(0xffffff,2.7);light.position.set(-3,6,8);scene.add(light,new THREE.AmbientLight(0xffffff,1.6));
    const canvas=document.querySelector('[data-model="'+model.name+'"] canvas');
    const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:false,preserveDrawingBuffer:true});
    renderer.setPixelRatio(1);renderer.setSize(256,256,false);renderer.setClearColor(0x000000,0);renderer.outputColorSpace=THREE.SRGBColorSpace;
    const extent=Math.max(size.x,size.y,size.z)*.65,camera=new THREE.OrthographicCamera(-extent,extent,extent,-extent,.01,100);
    camera.position.set(1.6,.7,5);camera.lookAt(0,0,0);
    let angle=0;
    function paint(){pivot.rotation.y=angle;renderer.render(scene,camera);}
    paint();
    document.querySelector('[data-model="'+model.name+'"] button').onclick=()=>{angle+=Math.PI/4;paint();};
    window.modelPreviews[model.name]={src:canvas.toDataURL('image/png'),width:256,height:256,meshes:0};
    gltf.scene.traverse(node=>{if(node.isMesh)window.modelPreviews[model.name].meshes++;});
  }
  window.modelsReady=true;
}
main().catch(error=>{document.querySelector('#status').textContent=error.message;window.modelError=error.message;});
`,resolveDir:resolve('.')},bundle:true,write:false,format:'iife',minify:true});
const html=`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>T1 weapons · Black & white</title><style>
*{box-sizing:border-box}body{margin:0;background:#efefe9;color:#111;font:13px/1.6 ui-monospace,Consolas,monospace;padding:44px}main{max-width:1200px;margin:auto}header{border-bottom:2px solid #111;padding-bottom:24px;margin-bottom:32px}h1{font-size:30px;letter-spacing:-1px;margin:7px 0}small{letter-spacing:1.8px;font-size:10px}header p{max-width:700px;margin:0;color:#555}.grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:20px}article{background:white;border:1px solid #111;box-shadow:4px 4px #111;padding:18px;min-width:0}canvas{display:block;width:100%;height:auto;image-rendering:pixelated;background:repeating-conic-gradient(#e8e8e3 0% 25%,#f5f5f1 0% 50%) 50% / 20px 20px;border:1px solid #bbb}h2{font-size:16px;text-transform:uppercase;margin:16px 0 0}article p{font-size:10px;margin:0 0 14px;color:#555}button{border:1px solid #111;padding:7px 10px;background:#fff;color:#111;font:inherit;font-size:10px;cursor:pointer}button:hover{background:#eee}footer{margin-top:30px;font-size:10px;color:#555}#status{color:#900}@media(max-width:800px){body{padding:22px}.grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:440px){.grid{grid-template-columns:1fr}}
</style></head><body><main><header><small>RELIC RUN / USER-SUPPLIED MODELS</small><h1>T1 weapons. Black & white.</h1><p>Original low-poly geometry, monochrome textures and neutral light. Rotate each model to inspect it.</p></header><div class="grid">${models.map(m=>`<article data-model="${m.name}"><canvas width="256" height="256" aria-label="T1 ${m.name} model"></canvas><h2>${m.name}</h2><p>TIER 1 · BLACK + WHITE</p><button>Rotate 45° ↻</button></article>`).join('')}</div><footer>Original files preserved. Colors removed from embedded textures, emissive maps and the wand light. Lighting produces natural gray shading.</footer><p id="status"></p></main><script>${outputFiles[0].text.replaceAll('</script','<\\/script')}</script></body></html>`;
await writeFile('artifacts/t1-models.html',html);
const server=createServer((req,res)=>{res.writeHead(200,{'Content-Type':'text/html'});res.end(html);});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader']});
try{
  const page=await browser.newPage({viewport:{width:1280,height:710},deviceScaleFactor:1});
  await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>window.modelsReady||window.modelError);
  const error=await page.evaluate(()=>window.modelError);if(error)throw Error(error);
  const previews=await page.evaluate(()=>window.modelPreviews),icons={};
  for(const model of models){const preview=previews[model.name];await writeFile(join(MODEL_DIR,model.name+'.png'),Buffer.from(preview.src.split(',')[1],'base64'));icons[model.id]={name:model.name,src:preview.src,width:preview.width,height:preview.height};}
  await writeFile(join(MODEL_DIR,'icons.json'),JSON.stringify(icons)+'\n');
  await page.screenshot({path:'artifacts/t1-models-black-white.png',fullPage:true});
  for(const button of await page.getByRole('button').all())await button.click();
  await page.screenshot({path:'artifacts/t1-models-rotated.png',fullPage:true});
  console.log('Rendered four actual GLBs, saved T1 icons, interactive preview and two inspection views.');
}finally{await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
