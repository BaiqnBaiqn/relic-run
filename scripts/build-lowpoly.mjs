import {spawnSync} from 'node:child_process';
import {mkdir,writeFile,readdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {CHEST_GEAR,ITEM_TYPES} from '../games/relic-run/gear.ts';

const root=fileURLToPath(new URL('../',import.meta.url));
process.chdir(root);
const candidates=process.env.BLENDER_BIN?[process.env.BLENDER_BIN]:['blender'];
if(!process.env.BLENDER_BIN&&process.platform==='win32'){
  const foundation=join(process.env.ProgramFiles??'C:/Program Files','Blender Foundation');
  const installs=await readdir(foundation,{withFileTypes:true}).catch(()=>[]);
  for(const dir of installs.filter(d=>d.isDirectory()&&d.name.startsWith('Blender ')).sort((a,b)=>b.name.localeCompare(a.name,undefined,{numeric:true})))candidates.push(join(foundation,dir.name,'blender.exe'));
}
const blender=candidates.find(bin=>spawnSync(bin,['--version'],{windowsHide:true,stdio:'ignore'}).status===0);
if(!blender)throw Error('Install Blender or set BLENDER_BIN to its executable path.');
const dir='games/relic-run/art/models/lowpoly';
await mkdir(dir,{recursive:true});
await writeFile(join(dir,'catalog.json'),JSON.stringify({types:ITEM_TYPES,items:CHEST_GEAR.map(({id,name,itemType,tier,slot})=>({id,name,type:itemType,tier,slot}))},null,2)+'\n');
function run(bin,args){
  const result=spawnSync(bin,args,{cwd:root,stdio:'inherit',windowsHide:true});
  if(result.error)throw result.error;
  if(result.status!==0)throw Error(`${bin} failed with exit ${result.status}`);
}
run(blender,['--background','--factory-startup','--python-exit-code','1','--python','scripts/blender-items.py']);
run(process.execPath,['scripts/lowpoly-catalog.mjs']);
run(process.execPath,['scripts/item-frames.mjs']);
run(blender,['--background','--factory-startup','--python-exit-code','1','--python','scripts/package-lowpoly.py']);
