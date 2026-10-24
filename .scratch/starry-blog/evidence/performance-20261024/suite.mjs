import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
const root=new URL('./',import.meta.url);
for(const [file,args,env]of [
 ['journey-loads.mjs',['final'],{STARFIELD_TEST_URL:'http://127.0.0.1:4194'}],
 ['reader-readiness.mjs',['final'],{}],
 ['journal.mjs',[],{}],
 ['lifecycle.mjs',[],{}],
 ['pages.mjs',[],{}],
 ['fallbacks.mjs',[],{}],
 ['audit.mjs',['pressure'],{PERF_CPU:'4',PERF_DEVICES:'mobile',PERF_NO_LEGACY:'1'}],
]){
 console.log('Starting',file,...args);
 const log=new URL(`../../../../.preview/performance-${file.replace('.mjs','')}.log`,root);
 const fd=fs.openSync(log,'w');
 const result=spawnSync(process.execPath,[new URL(file,root).pathname,...args],{env:{...process.env,...env},stdio:['ignore',fd,fd]});fs.closeSync(fd);
 console.log('Finished',file,'status',result.status);
 if(result.status!==0){console.log(fs.readFileSync(log,'utf8').slice(-6000));process.exit(1);}
}
