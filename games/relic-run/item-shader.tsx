import {useEffect,useRef} from 'react';
import {modelImage,modelId,visualTier} from './model-art.ts';

// All icons share ONE WebGL context. The ordinary Blender sprite stays under
// this transparent effect layer, including when WebGL is unavailable or lost.
const fragment=`precision mediump float;
varying vec2 uv; uniform sampler2D sprite; uniform float time; uniform vec3 tint;
void main(){
  float a=texture2D(sprite,uv).a;
  float edge=0.0;
  for(int x=-2;x<=2;x++)for(int y=-2;y<=2;y++)
    edge=max(edge,texture2D(sprite,uv+vec2(float(x),float(y))/96.0).a);
  float band=pow(max(0.0,1.0-abs(fract(uv.x*.55+uv.y*.65-time*.18)-.5)*9.0),2.0);
  float pulse=.65+.15*sin(time*2.0);
  float glint=a*band*.7;
  float halo=max(0.0,edge-a)*pulse*.65;
  gl_FragColor=vec4(mix(tint,vec3(1.0),band*.6),glint+halo);
}`;
const nodes=new Map<HTMLCanvasElement,number>();
let gpu:ReturnType<typeof setup>|undefined,failed=false,frame=0,last=-1;
function setup(){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=192;
  const gl=canvas.getContext('webgl',{alpha:true,premultipliedAlpha:false,antialias:false});if(!gl)return null;
  const compile=(type:number,source:string)=>{const s=gl.createShader(type)!;gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error('Item shader unavailable');return s;};
  const p=gl.createProgram()!,v=compile(gl.VERTEX_SHADER,'attribute vec2 pos; varying vec2 uv; void main(){uv=vec2((pos.x+1.0)/2.0,(1.0-pos.y)/2.0);gl_Position=vec4(pos,0.0,1.0);}'),f=compile(gl.FRAGMENT_SHADER,fragment);
  gl.attachShader(p,v);gl.attachShader(p,f);gl.linkProgram(p);gl.deleteShader(v);gl.deleteShader(f);
  if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error('Item shader unavailable');
  gl.useProgram(p);const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
  const a=gl.getAttribLocation(p,'pos');gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0);
  const time=gl.getUniformLocation(p,'time'),tint=gl.getUniformLocation(p,'tint'),textures=new Map<number,WebGLTexture>();
  canvas.addEventListener('webglcontextlost',()=>{failed=true;for(const c of nodes.keys())c.getContext('2d')?.clearRect(0,0,192,192);});
  return {draw(id:number,t:number){
    const image=modelImage(id);if(!image)return false;
    const key=modelId(id);let texture=textures.get(key);
    if(!texture){texture=gl.createTexture()!;gl.bindTexture(gl.TEXTURE_2D,texture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);textures.set(key,texture);}
    gl.bindTexture(gl.TEXTURE_2D,texture);gl.uniform1f(time,t);const tier=visualTier(id);gl.uniform3f(tint,...(tier>=5?[1,.74,.25]:tier===4?[.7,.48,1]:[.3,.7,1]) as [number,number,number]);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);return true;
  },canvas};
}
function paint(stamp:number){
  if(stamp-last>100&&!document.hidden&&!failed){
    last=stamp;try{
      if(gpu===undefined)gpu=setup();
      if(gpu)for(const [c,id] of nodes){const r=c.getBoundingClientRect();if(!r.width||!r.height||r.bottom<0||r.top>innerHeight||r.right<0||r.left>innerWidth)continue;
        const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches||c.closest('.rr-game')?.getAttribute('data-reduced')==='true';
        if(gpu.draw(id,reduced?1.6:stamp/1000)){const ctx=c.getContext('2d');ctx?.clearRect(0,0,192,192);ctx?.drawImage(gpu.canvas,0,0);c.dataset.shader='ready';}
      }
    }catch{failed=true;}
  }
  if(nodes.size&&!failed)frame=requestAnimationFrame(paint);else frame=0;
}
export function ItemShader({id}:{id:number}){
  const ref=useRef<HTMLCanvasElement>(null);
  useEffect(()=>{const c=ref.current;if(!c)return;nodes.set(c,id);if(!frame&&!failed)frame=requestAnimationFrame(paint);return()=>{nodes.delete(c);if(!nodes.size){cancelAnimationFrame(frame);frame=0;}};},[id]);
  return <foreignObject x="0" y="0" width="192" height="192" pointerEvents="none"><canvas ref={ref} width="192" height="192" className="rr-item-shader" aria-hidden="true"/></foreignObject>;
}
