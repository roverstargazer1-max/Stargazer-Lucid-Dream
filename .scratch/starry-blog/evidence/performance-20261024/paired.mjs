import {spawnSync} from 'node:child_process';
import fs from 'node:fs/promises';
const root=new URL('./',import.meta.url);
const results=[];
for(let round=1;round<=3;round++)for(const version of ['baseline','final']){
 const label=`compressed-${version}-${round}`;
 const run=spawnSync(process.execPath,[new URL('startup.mjs',root).pathname,label],{env:{...process.env,STARFIELD_TEST_URL:`http://127.0.0.1:${version==='baseline'?4193:4194}`,PERF_CASE:'desktop-cold,mobile-fast4g,mobile-slow4g'},encoding:'utf8'});
 if(run.status!==0)throw Error(run.stderr||run.stdout);
 const report=JSON.parse(await fs.readFile(new URL(`${label}-startup-summary.json`,root)));
 for(const row of report.results){
  const result={round,version,case:row.settings.name,readyMs:row.readyMs,fcpMs:row.fcp,bytes:row.network.reduce((n,r)=>n+(r.encodedBytes||0),0),requests:row.network.length,cls:row.shifts.reduce((a,b)=>a+b,0),longTasks:row.tasks.map(t=>t.duration),unfinished:row.network.filter(r=>!r.end).map(r=>r.path),errors:row.errors};
  results.push(result);console.log(JSON.stringify(result));
 }
 await fs.writeFile(new URL('paired-summary.json',root),JSON.stringify({browser:report.results[0].browser,compressed:true,results},null,2)+'\n');
}
