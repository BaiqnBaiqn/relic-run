import {build} from 'esbuild';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('..',import.meta.url)),outdir=path.join(root,'games/relic-run/.preview');
await mkdir(outdir,{recursive:true});
const base={absWorkingDir:root,bundle:true,format:'iife',platform:'browser',target:'es2022',jsx:'automatic',minify:true,define:{'process.env.NODE_ENV':'"production"','__SUBMISSION_PREVIEW__':'true','globalThis.__FRIENDSDK_LIVE__':'false'},logLevel:'warning'};
await build({...base,entryPoints:['games/relic-run/sandbox-child.tsx'],outfile:path.join(outdir,'game.js')});
const childCsp="default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; font-src 'self'; media-src 'self' blob:; connect-src https://rpc.mainnet.chain.robinhood.com; base-uri 'none'; form-action 'none'; frame-src 'none'";
const hostCsp="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src https://rpc.mainnet.chain.robinhood.com; frame-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'";
async function versioned(name){const hash=createHash('sha256').update(await readFile(path.join(outdir,name))).digest('hex').slice(0,16);return `./${name}?v=${hash}`;}
async function html(name,csp){return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="${csp}"><meta name="theme-color" content="#f6f5ef"><title>Relic Run · Rare Friends</title><link rel="icon" href="data:,"><link rel="stylesheet" href="${await versioned(name+'.css')}"></head><body><main id="root"></main><script src="${await versioned(name+'.js')}"></script></body></html>`;}
await writeFile(path.join(outdir,'game.html'),await html('game',childCsp));
// A changed child document also changes the host hash, invalidating the whole
// release chain without relying on a browser's cached unversioned JS/CSS.
await build({...base,define:{...base.define,__PREVIEW_FRAME_URL__:JSON.stringify(await versioned('game.html'))},entryPoints:['games/relic-run/wallet.tsx'],outfile:path.join(outdir,'host.js')});
await writeFile(path.join(outdir,'index.html'),await html('host',hostCsp));
await writeFile(path.join(outdir,'.nojekyll'),'');
console.log('Built SDK host + sandboxed game + wallet-bound preview saves: '+outdir);
