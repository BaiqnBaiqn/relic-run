import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import validator from 'gltf-validator';
import {PNG} from 'pngjs';
import {readGLB,geometryHash} from '../scripts/t1-models.mjs';
import {CHEST_GEAR,ITEM_TYPES} from '../games/relic-run/gear.ts';

const dir='games/relic-run/art/models/lowpoly';
test('75 unique Blender models match the complete catalog, palette, geometry budget and game icons',async()=>{
  const manifest=JSON.parse(await readFile(join(dir,'manifest.json'),'utf8'));
  const icons=JSON.parse(await readFile(join(dir,'icons.json'),'utf8'));
  assert.deepEqual(manifest.models.map(m=>m.id).sort(),CHEST_GEAR.map(g=>g.id).sort());
  assert.deepEqual(Object.keys(icons).sort(),CHEST_GEAR.map(g=>String(g.id)).sort());
  const shapes=new Set(),renders=new Set();
  for(const model of manifest.models){
    const gear=CHEST_GEAR.find(g=>g.id===model.id);
    assert.equal(model.type,gear.itemType);assert.equal(model.tier,gear.tier);assert.equal(model.name,gear.name);
    const bytes=await readFile(join(dir,model.file)),glb=readGLB(bytes);
    shapes.add(geometryHash(glb));
    const report=await validator.validateBytes(new Uint8Array(bytes));
    assert.equal(report.issues.numErrors,0,model.name);assert.equal(report.issues.numWarnings,0,model.name);
    assert.equal(glb.json.meshes.length,1);assert.equal(glb.json.textures?.length??0,0);
    assert.equal(glb.json.cameras?.length??0,0);
    let triangles=0;
    for(const mesh of glb.json.meshes)for(const p of mesh.primitives){assert.equal(p.mode??4,4);triangles+=glb.json.accessors[p.indices].count/3;}
    assert.equal(triangles,model.triangles);assert.ok(triangles>0&&triangles<=600);
    const colors=new Set();
    for(const mat of glb.json.materials){
      const rgb=mat.pbrMetallicRoughness.baseColorFactor?.slice(0,3)??[1,1,1];
      assert.ok(rgb.every(v=>v===rgb[0])&&[0,1].includes(rgb[0]));colors.add(rgb.join(','));
    }
    assert.equal(colors.size,2);
    assert.equal(icons[model.id].name,gear.itemType);assert.equal(icons[model.id].tier,gear.tier);
    const pngBytes=await readFile(join(dir,model.render));
    assert.equal(icons[model.id].src,'data:image/png;base64,'+pngBytes.toString('base64'));
    renders.add(createHash('sha256').update(pngBytes).digest('hex'));
    const png=PNG.sync.read(pngBytes);assert.equal(png.width,192);assert.equal(png.height,192);
    let visible=0;
    for(let i=0;i<png.data.length;i+=4)if(png.data[i+3]){visible++;assert.equal(png.data[i],png.data[i+1]);assert.equal(png.data[i+1],png.data[i+2]);}
    assert.ok(visible>400&&visible<png.width*png.height*.8,model.name+' must be visible and retain transparent space');
  }
  assert.equal(shapes.size,75);assert.equal(renders.size,75);
  for(const {type} of ITEM_TYPES){
    const tiers=manifest.models.filter(m=>m.type===type).sort((a,b)=>a.tier-b.tier);
    assert.equal(tiers.length,5);
    for(let i=1;i<5;i++){
      assert.ok(tiers[i].triangles>tiers[i-1].triangles,type+' must gain geometry');
      for(const part of tiers[i-1].parts)assert.ok(tiers[i].parts.includes(part),type+' must retain '+part);
    }
  }
});
