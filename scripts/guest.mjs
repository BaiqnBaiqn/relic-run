import {context} from 'esbuild';
import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root=fileURLToPath(new URL('..',import.meta.url));
const outdir=path.join(root,'games/relic-run/.guest');
const buildOnly=process.argv.includes('--build');
const portArg=process.argv.find(arg=>arg.startsWith('--port='));
const port=portArg?Number(portArg.slice(7)):4173;
if(!Number.isInteger(port)||port<0||port>65535)throw new Error('Invalid port');
const builds=[];
try {
  for(const mode of ['guest','wallet']){
    const target=mode==='guest'?outdir:path.join(outdir,'wallet');
    await mkdir(target,{recursive:true});
    const connect=mode==='guest'?"'none'":'https://rpc.mainnet.chain.robinhood.com';
    await writeFile(path.join(target,'index.html'),'<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><meta name="theme-color" content="#f6f5ef"><meta http-equiv="Content-Security-Policy" content="default-src \'self\'; script-src \'self\'; style-src \'self\' \'unsafe-inline\'; connect-src '+connect+'; img-src \'self\' data:; media-src \'self\' blob:; object-src \'none\'; base-uri \'none\'; form-action \'none\'"><title>Relic Run · Five expeditions playtest</title><link rel="icon" href="data:,"><link rel="stylesheet" href="./game.css"></head><body><main id="root"></main><script src="./game.js"></script></body></html>');
    const build=await context({absWorkingDir:root,entryPoints:['games/relic-run/'+mode+'.tsx'],
      outfile:path.join(target,'game.js'),bundle:true,format:'iife',platform:'browser',target:'es2022',
      jsx:'automatic',minify:true,define:{'process.env.NODE_ENV':'"production"','__SUBMISSION_PREVIEW__':'false'},logLevel:'warning'});
    builds.push(build);await build.rebuild();
  }
  if(buildOnly){await Promise.all(builds.map(b=>b.dispose()));console.log('Built five-level guest and wallet playtests: '+outdir);}
  else{
    await Promise.all(builds.map(b=>b.watch()));
    const server=await builds[0].serve({host:'0.0.0.0',port,servedir:outdir});
    console.log('Playtest: http://localhost:'+server.port+' — guest play or connect a wallet. Refresh after edits.');
    const close=async()=>{await Promise.all(builds.map(b=>b.dispose()));};
    process.once('SIGINT',close);process.once('SIGTERM',close);
  }
}catch(error){await Promise.all(builds.map(b=>b.dispose()));throw error;}
