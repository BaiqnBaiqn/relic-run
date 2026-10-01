import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {PNG} from 'pngjs';
import validator from 'gltf-validator';
import {MODEL_DIR,MODEL_IDS,readGLB,geometryHash,textureColors} from '../scripts/t1-models.mjs';

for(const [name,id] of Object.entries(MODEL_IDS))test(`T1 ${name}: intact model, binary textures, neutral light, valid GLB and mapped icon`,async()=>{
  const source=readGLB(await readFile(join(MODEL_DIR,'source',name==='dagger'?'daggger.glb':name+'.glb')));
  const bytes=await readFile(join(MODEL_DIR,name+'.glb')),model=readGLB(bytes);
  assert.equal(geometryHash(model),geometryHash(source));
  for(const field of ['nodes','meshes','accessors','scenes','animations','skins'])assert.deepEqual(model.json[field],source.json[field]);
  const colors=new Set();
  for(const image of model.json.images){
    const view=model.json.bufferViews[image.bufferView],png=PNG.sync.read(model.bin.subarray(view.byteOffset,view.byteOffset+view.byteLength));
    for(const color of textureColors(png)){assert.ok(['0,0,0','255,255,255'].includes(color));colors.add(color);}
    const originalView=source.json.bufferViews[image.bufferView],original=PNG.sync.read(source.bin.subarray(originalView.byteOffset,originalView.byteOffset+originalView.byteLength));
    assert.equal(png.width,original.width);assert.equal(png.height,original.height);
    for(let i=3;i<png.data.length;i+=4)assert.equal(png.data[i],original.data[i],'Texture alpha must be unchanged');
  }
  assert.equal(colors.size,2,'Keep both black and white detail, including atlases shared by color and emission');
  for(const material of model.json.materials){
    const rgb=material.pbrMetallicRoughness.baseColorFactor?.slice(0,3)??[1,1,1];
    assert.ok(rgb.every(v=>v===rgb[0])&&[0,1].includes(rgb[0]));
    const emission=material.emissiveFactor??[0,0,0];assert.ok(emission.every(v=>v===emission[0]));
  }
  for(const light of model.json.extensions?.KHR_lights_punctual?.lights??[])assert.deepEqual(light.color,[1,1,1]);
  const result=await validator.validateBytes(new Uint8Array(bytes));assert.equal(result.issues.numErrors,0);assert.equal(result.issues.numWarnings,0);
  const icons=JSON.parse(await readFile(join(MODEL_DIR,'icons.json'),'utf8'));assert.equal(icons[id].name,name);
  const preview=PNG.sync.read(Buffer.from(icons[id].src.split(',')[1],'base64'));
  let opaque=0;for(let i=0;i<preview.data.length;i+=4)if(preview.data[i+3]){opaque++;assert.equal(preview.data[i],preview.data[i+1]);assert.equal(preview.data[i+1],preview.data[i+2]);}
  assert.ok(opaque>500,'Model icon must contain visible geometry');assert.ok(opaque<preview.width*preview.height/2,'Model icon must retain transparency');
});
