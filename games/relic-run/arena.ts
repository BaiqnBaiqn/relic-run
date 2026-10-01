// World dimensions are independent of the isometric camera's drawing surface.
export const ARENA_SIZE=960;
export const ARENA_BOUNDS={left:48,top:48,right:912,bottom:912} as const;
export const PLAYER_START={x:480,y:780} as const;
export const BOSS_START={x:480,y:280} as const;
export const SPAWN_POINTS=[[120,120],[840,120],[120,800],[840,800]] as const;
