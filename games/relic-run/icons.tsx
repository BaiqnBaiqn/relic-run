import {type Gear} from './gear.ts';
import {modelIcon,modelFrame,modelId,visualTier} from './model-art.ts';
import {ItemShader} from './item-shader.tsx';
export function PotionIcon({major=false}:{major?:boolean}){
  return <svg width="32" height="40" viewBox="0 0 32 40" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M11 3h10v5H11zM12 8v8L5 23v12h22V23l-7-7V8M6 27h20"/><path d="M9 30h14v2H9"/>{major&&<path d="M10 22h12M12 19h8"/>}</svg>;
}
export function GearIcon({gear,size=32}:{gear:Gear;size?:number}){
  const model=modelIcon(gear.id),frame=modelFrame(gear.id);
  if(model)return <svg width={size} height={size} viewBox={`${frame.x} ${frame.y} ${frame.size} ${frame.size}`} aria-hidden="true" data-model={model.name} data-sprite-id={modelId(gear.id)} data-tier={visualTier(gear.id)} className="rr-model-icon"><image href={model.src} width={model.width} height={model.height} style={{imageRendering:'pixelated'}}/>{visualTier(gear.id)>=3&&<ItemShader id={gear.id}/>}</svg>;
}
