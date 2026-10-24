import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
const root=new URL('./',import.meta.url);
for(const [file,args,env]of [
 ['startup.mjs',['room-baseline'],{STARFIELD_TEST_URL:'http://127.0.0.1:4193',PERF_CASE:'mobile-slow4g'}],
 ['startup.mjs',['final-confirmed-1'],{STARFIELD_TEST_URL:'http://127.0.0.1:4194',PERF_ASSERT:'1'}],
 ['startup.mjs',['final-confirmed-2'],{STARFIELD_TEST_URL:'http://127.0.0.1:4194',PERF_CASE:'mobile-fast4g,mobile-slow4g',PERF_ASSERT:'1'}],
 ['pages.mjs',['baseline-home'],{PERF_VERSIONS:'baseline',PERF_KINDS:'home'}],
 ['pages.mjs',['final-pages'],{PERF_VERSIONS:'final',PERF_KINDS:'home,article,archive,journal'}],
 ['audit.mjs',['final'],{}],
 ['reader-readiness.mjs',['final'],{}],
]){
 console.log('Starting',file,...args);
 const log=new URL(`../../../../.preview/performance-finish-${args[0]}.log`,root),fd=fs.openSync(log,'w');
 const result=spawnSync(process.execPath,[new URL(file,root).pathname,...args],{env:{...process.env,...env},stdio:['ignore',fd,fd]});fs.closeSync(fd);
 console.log('Finished',file,'status',result.status);
 if(result.status!==0){console.log(fs.readFileSync(log,'utf8').slice(-6000));process.exit(1);}
}
