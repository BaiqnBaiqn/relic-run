import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {PNG} from 'pngjs';
import validator from 'gltf-validator';

export const MODEL_IDS={sword:221,dagger:231,wand:201,bow:211};
export const MODEL_DIR=fileURLToPath(new URL('../games/relic-run/art/models/t1/',import.meta.url));
const sourceNames={sword:'sword.glb',dagger:'daggger.glb',wand:'wand.glb',bow:'bow.glb'};
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
export function readGLB(bytes){
  assert.equal(bytes.readUInt32LE(0),0x46546c67);assert.equal(bytes.readUInt32LE(4),2);assert.equal(bytes.readUInt32LE(8),bytes.length);
  let json,bin;
  for(let at=12;at<bytes.length;){const length=bytes.readUInt32LE(at),type=bytes.readUInt32LE(at+4);assert.ok(at+8+length<=bytes.length);const data=bytes.subarray(at+8,at+8+length);if(type===0x4e4f534a)json=JSON.parse(data.toString('utf8'));else if(type===0x004e4942)bin=data;else throw Error('Unexpected GLB chunk');at+=8+length;}
  assert.ok(json&&bin);assert.equal(json.buffers.length,1);assert.ok(!json.buffers[0].uri);
  return {json,bin};
}
function encodeGLB(json,bin){
  const text=Buffer.from(JSON.stringify(json)),j=Buffer.alloc(Math.ceil(text.length/4)*4,32);text.copy(j);
  const binary=Buffer.alloc(Math.ceil(bin.length/4)*4);bin.copy(binary);
  const out=Buffer.alloc(12+8+j.length+8+binary.length);
  out.writeUInt32LE(0x46546c67,0);out.writeUInt32LE(2,4);out.writeUInt32LE(out.length,8);
  out.writeUInt32LE(j.length,12);out.writeUInt32LE(0x4e4f534a,16);j.copy(out,20);
  out.writeUInt32LE(binary.length,20+j.length);out.writeUInt32LE(0x004e4942,24+j.length);binary.copy(out,28+j.length);return out;
}
export function geometryHash({json,bin}){
  const views=[...new Set(json.accessors.map(a=>a.bufferView))].sort((a,b)=>a-b);
  return sha(Buffer.concat(views.map(i=>{const v=json.bufferViews[i];return bin.subarray(v.byteOffset??0,(v.byteOffset??0)+v.byteLength);}))); 
}
export function textureColors(png){const colors=new Set();for(let i=0;i<png.data.length;i+=4)if(png.data[i+3])colors.add(png.data.subarray(i,i+3).join(','));return [...colors];}
function monochromeImage(bytes,emission){
  const png=PNG.sync.read(bytes),before=textureColors(png);
  for(let i=0;i<png.data.length;i+=4){
    const luminance=.2126*png.data[i]+.7152*png.data[i+1]+.0722*png.data[i+2];
    // Preserve the emissive mask, with neutral white light instead of a colored glow.
    const value=(emission?luminance>0:luminance>=128)?255:0;
    png.data[i]=png.data[i+1]=png.data[i+2]=value;
  }
  return {bytes:PNG.sync.write(png),width:png.width,height:png.height,before,after:textureColors(png)};
}
export async function convertModels(inputDirectory){
  await mkdir(join(MODEL_DIR,'source'),{recursive:true});
  const report={palette:['#000000','#ffffff'],models:[]};
  for(const [name,id] of Object.entries(MODEL_IDS)){
    const source=join(MODEL_DIR,'source',sourceNames[name]);
    if(inputDirectory)await copyFile(join(resolve(inputDirectory),sourceNames[name]),source);
    const original=await readFile(source),before=readGLB(original),json=structuredClone(before.json),chunks=[],imageReports=[];
    const emissionImages=new Set(json.materials.flatMap(m=>m.emissiveTexture?[json.textures[m.emissiveTexture.index].source]:[]));
    const baseImages=new Set(json.materials.flatMap(m=>m.pbrMetallicRoughness?.baseColorTexture?[json.textures[m.pbrMetallicRoughness.baseColorTexture.index].source]:[]));
    const images=new Map(json.images.map((im,i)=>{assert.equal(im.mimeType,'image/png');assert.ok(im.bufferView!==undefined&&!im.uri);return [im.bufferView,{image:im,index:i}];}));
    let offset=0;
    json.bufferViews=json.bufferViews.map((view,index)=>{
      let bytes=before.bin.subarray(view.byteOffset??0,(view.byteOffset??0)+view.byteLength);
      if(images.has(index)){const im=images.get(index),converted=monochromeImage(bytes,emissionImages.has(im.index)&&!baseImages.has(im.index));bytes=converted.bytes;imageReports.push({name:im.image.name,...converted,bytes:undefined});}
      const next={...view,byteOffset:offset,byteLength:bytes.length};chunks.push(bytes);offset+=bytes.length;
      const padding=(4-offset%4)%4;if(padding){chunks.push(Buffer.alloc(padding));offset+=padding;}return next;
    });
    for(const material of json.materials){
      const pbr=material.pbrMetallicRoughness;
      if(pbr?.baseColorFactor){const [r,g,b,a]=pbr.baseColorFactor,v=.2126*r+.7152*g+.0722*b>=.5?1:0;pbr.baseColorFactor=[v,v,v,a];}
      if(material.emissiveFactor){const v=material.emissiveFactor.some(n=>n>0)?1:0;material.emissiveFactor=[v,v,v];}
    }
    for(const light of json.extensions?.KHR_lights_punctual?.lights??[])light.color=[1,1,1];
    for(const sampler of json.samplers??[]){sampler.magFilter=9728;sampler.minFilter=9728;}
    for(const mesh of json.meshes)for(const p of mesh.primitives)assert.ok(!Object.keys(p.attributes).some(k=>k.startsWith('COLOR_')),'Unexpected vertex colors require conversion.');
    json.buffers[0].byteLength=offset;
    const output=encodeGLB(json,Buffer.concat(chunks)),after=readGLB(output);
    assert.equal(geometryHash(before),geometryHash(after));assert.deepEqual(before.json.nodes,after.json.nodes);
    assert.deepEqual(before.json.meshes,after.json.meshes);assert.deepEqual(before.json.accessors,after.json.accessors);
    const validation=await validator.validateBytes(new Uint8Array(output),{uri:name+'.glb'});
    assert.equal(validation.issues.numErrors,0,JSON.stringify(validation.issues));
    for(const im of imageReports)assert.ok(im.after.every(color=>color==='0,0,0'||color==='255,255,255'));
    await writeFile(join(MODEL_DIR,name+'.glb'),output);
    report.models.push({name,itemId:id,file:name+'.glb',source:'source/'+sourceNames[name],sourceSha256:sha(original),outputSha256:sha(output),geometrySha256:geometryHash(after),textures:imageReports,validation:validation.issues});
  }
  await writeFile(join(MODEL_DIR,'manifest.json'),JSON.stringify(report,null,2)+'\n');
  return report;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const report=await convertModels(process.argv[2]);
  for(const model of report.models)console.log(`${model.name}: black/white textures, unchanged geometry, ${model.validation.numErrors} GLB errors, ${model.validation.numWarnings} warnings.`);
}
