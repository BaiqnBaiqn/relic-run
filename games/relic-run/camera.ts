import {ARENA_SIZE} from './arena.ts';
// Keep the full square island in view, with headroom for its upright scenery.
export const VIEW_WIDTH=1120,VIEW_HEIGHT=820;
const CENTER=ARENA_SIZE/2,ORIGIN_X=VIEW_WIDTH/2,ORIGIN_Y=425,ISO_X=.58,ISO_Y=.34;
export function project(x:number,y:number){
  return {x:ORIGIN_X+ISO_X*(x-CENTER)-ISO_X*(y-CENTER),y:ORIGIN_Y+ISO_Y*(x-CENTER)+ISO_Y*(y-CENTER)};
}
export function unproject(x:number,y:number){
  const dx=(x-ORIGIN_X)/ISO_X,dy=(y-ORIGIN_Y)/ISO_Y;
  return {x:CENTER+(dx+dy)/2,y:CENTER+(dy-dx)/2};
}
export function screenDirection(x:number,y:number){
  const wx=x/ISO_X+y/ISO_Y,wy=y/ISO_Y-x/ISO_X,length=Math.hypot(wx,wy);
  const magnitude=Math.min(1,Math.hypot(x,y));
  return length?{x:wx/length*magnitude,y:wy/length*magnitude}:{x:0,y:0};
}
