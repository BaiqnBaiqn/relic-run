/** The SDK child receives only this narrow storage adapter, never browser storage. */
export type GameStorage=Pick<Storage,'getItem'|'setItem'>;
let supplied:GameStorage|null=null;
export function gameStorage():GameStorage{return supplied??localStorage;}
export function isBridgedStorage(){return supplied!==null;}
export function installGameStorage(storage:GameStorage){supplied=storage;return()=>{if(supplied===storage)supplied=null;};}
