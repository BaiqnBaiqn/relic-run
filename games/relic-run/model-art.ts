import models from './art/models/lowpoly/icons.json';
import frames from './art/models/lowpoly/frames.json';
import {gearFor,RARITIES,ITEM_TYPES} from './gear.ts';

export function visualTier(id:number){const g=gearFor(id);return g.tier??(g.rarity==='Jackpot'?5:g.soulbound?Math.min(5,Math.max(3,Math.floor((id-101)/10)+1)):Math.max(1,RARITIES.indexOf(g.rarity)+1));}
export function modelId(id:number){
  if(Object.hasOwn(models,String(id)))return id;
  const g=gearFor(id),family=g.itemType??g.family??g.ability;
  const type=g.slot==='weapon'?(family==='fan'?'bow':family==='orbit'?'dagger':family==='bolt'?'wand':family??'wand'):
    g.slot==='ability'?(family==='pulse'?'bash':family==='ward'?'shield':family??'bash'):
    g.slot==='armor'?(g.defense&&g.defense>1?'heavy':'robe'):(g.speed?'speed':g.power?'attack':'health');
  const index=ITEM_TYPES.findIndex(t=>t.type===type);
  return 200+Math.max(0,index)*10+visualTier(id);
}

// Rendered in Blender from the 75-item library; the game needs no 3D runtime.
export function modelIcon(id:number){return models[String(modelId(id)) as keyof typeof models];}
export function modelFrame(id:number){return frames[String(modelId(id)) as keyof typeof frames];}
const images=new Map<number,HTMLImageElement>();
export function modelImage(id:number){
  const art=modelIcon(id);if(!art)return null;
  let image=images.get(id);
  if(!image){image=new Image();image.src=art.src;images.set(id,image);}
  return image.complete&&image.naturalWidth>0?image:null;
}
