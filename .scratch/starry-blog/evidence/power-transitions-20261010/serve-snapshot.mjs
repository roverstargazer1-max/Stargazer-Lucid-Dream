// Serve an immutable copy of the preview for alternating before/after tests.
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const root=path.resolve(process.argv[2]);
const port=Number(process.argv[3]||4187);
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2','.jpg':'image/jpeg'};
http.createServer(async(request,response)=>{
  try {
    let file=path.resolve(root,'.'+decodeURIComponent(new URL(request.url,'http://127.0.0.1').pathname));
    if(file!==root&&!file.startsWith(root+path.sep))throw Error('Outside snapshot');
    if((await stat(file)).isDirectory())file=path.join(file,'index.html');
    const content=await readFile(file);
    response.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});
    response.end(content);
  } catch {response.writeHead(404);response.end('Not found');}
}).listen(port,'127.0.0.1',()=>console.log(`Frozen preview: http://127.0.0.1:${port}/`));
