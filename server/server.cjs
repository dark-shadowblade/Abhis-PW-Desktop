const http=require('http');
const fs=require('fs');
const path=require('path');
const {URL}=require('url');
const API='https://v1.sgmvv1.xyz/api/v1';
const CHUNK=1024*1024;
const CDN_HOST=/^a\\d+\\.stmvv1\\.xyz$/i;
const MIME={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json'};
function startServer(){return new Promise((resolve,reject)=>{
 const root=path.join(__dirname,'..','desktop');
 const server=http.createServer(async(req,res)=>{
  const local=new URL(req.url,'http://127.0.0.1');
  if(local.pathname==='/api/health'){res.writeHead(200,{'content-type':'application/json'});return res.end(JSON.stringify({ok:true,app:"Abhi's PW",proxyReady:true}));}
  if(local.pathname.startsWith('/api/v1/')){
   try{const upstream=new URL(API+local.pathname.slice('/api/v1'.length)+local.search);const headers={accept:req.headers.accept||'application/json'};if(req.headers['x-api-key'])headers['x-api-key']=req.headers['x-api-key'];const r=await fetch(upstream,{method:req.method,headers,signal:AbortSignal.timeout(30000)});const body=Buffer.from(await r.arrayBuffer());res.writeHead(r.status,{'content-type':r.headers.get('content-type')||'application/json','cache-control':'no-store'});return res.end(body)}catch(e){res.writeHead(502,{'content-type':'application/json'});return res.end(JSON.stringify({error:'Study API proxy failed',details:e.message}))}
  }
  if(local.pathname==='/video'&&req.method==='GET'){
   try{const raw=local.searchParams.get('url');if(!raw)throw Error('Missing stream URL');const target=checkedUrl(raw);const range=req.headers.range||'bytes=0-';const m=/^bytes=(\\d+)-(\\d*)$/.exec(range);if(!m){res.writeHead(416);return res.end('Invalid range')}const start=Number(m[1]);const requestedEnd=m[2]?Number(m[2]):start+CHUNK-1;if(!Number.isSafeInteger(start)||!Number.isSafeInteger(requestedEnd)||requestedEnd<start)throw Error('Invalid byte range');const end=Math.min(requestedEnd,start+CHUNK-1);const upstream=await fetchChunk(target,start,end);if(upstream.status!==206){const msg=(await upstream.text()).slice(0,400);res.writeHead(upstream.status,{'content-type':'text/plain'});return res.end(msg||'CDN range request failed')}const h={'content-type':upstream.headers.get('content-type')||'video/mp4','accept-ranges':'bytes','cache-control':'no-store','access-control-expose-headers':'Content-Range, Accept-Ranges, Content-Length'};for(const k of ['content-range','content-length'])if(upstream.headers.get(k))h[k]=upstream.headers.get(k);res.writeHead(206,h);if(!upstream.body)return res.end();const reader=upstream.body.getReader();try{while(true){const {done,value}=await reader.read();if(done)break;if(!res.write(Buffer.from(value)))await new Promise(ok=>res.once('drain',ok))}res.end()}catch(e){res.destroy(e)}
   }catch(e){if(!res.headersSent){res.writeHead(502,{'content-type':'text/plain'});res.end(e.message)}else res.destroy(e)}return;
  }
  if(local.pathname==='/download'&&req.method==='GET'){
   try{const raw=local.searchParams.get('url');if(!raw)throw Error('Missing stream URL');const target=checkedUrl(raw);const first=await fetchChunk(target,0,CHUNK-1);if(first.status!==206)throw Error('CDN returned '+first.status);const cr=/^bytes\\s+0-(\\d+)\\/(\\d+)$/i.exec(first.headers.get('content-range')||'');if(!cr)throw Error('CDN did not return a valid Content-Range');const firstEnd=Number(cr[1]),total=Number(cr[2]);if(!Number.isSafeInteger(total)||total<=0||firstEnd>=total||firstEnd>CHUNK-1)throw Error('Invalid CDN file size');const base=path.basename(local.searchParams.get('filename')||'lecture.mp4').replace(/[^a-zA-Z0-9._-]/g,'_');const filename=base.toLowerCase().endsWith('.mp4')?base:base+'.mp4';res.writeHead(200,{'content-type':'video/mp4','content-length':total,'content-disposition':'attachment; filename="'+filename+'"','cache-control':'no-store'});async function write(b){if(!res.write(b))await new Promise(ok=>res.once('drain',ok))}let b=Buffer.from(await first.arrayBuffer());if(b.length!==firstEnd+1)throw Error('First chunk length mismatch');await write(b);for(let start=firstEnd+1;start<total;start+=CHUNK){if(res.destroyed)return;const end=Math.min(start+CHUNK-1,total-1);const r=await fetchChunk(target,start,end);if(r.status!==206)throw Error('CDN chunk failed: '+r.status);const expected='bytes '+start+'-'+end+'/'+total;if((r.headers.get('content-range')||'').toLowerCase()!==expected.toLowerCase())throw Error('Unexpected CDN range');b=Buffer.from(await r.arrayBuffer());if(b.length!==end-start+1)throw Error('Incomplete CDN chunk');await write(b)}res.end()
   }catch(e){if(!res.headersSent){res.writeHead(502,{'content-type':'text/plain'});res.end('Download failed: '+e.message)}else res.destroy(e)}return;
  }
  const requested=local.pathname==='/'?'index.html':decodeURIComponent(local.pathname.slice(1));const file=path.resolve(root,requested);if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end('Forbidden')}fs.readFile(file,(err,data)=>{if(err){res.writeHead(404);return res.end('Not found')}res.writeHead(200,{'content-type':MIME[path.extname(file)]||'application/octet-stream','x-content-type-options':'nosniff'});res.end(data)});
 });
 server.once('error',reject);server.listen(4173,'127.0.0.1',()=>resolve(server));
})}
function checkedUrl(raw){const u=new URL(raw);if(u.protocol!=='https:'||!CDN_HOST.test(u.hostname)||u.port)throw Error('Invalid video CDN host');return u}
async function fetchChunk(base,start,end){const u=new URL(base);u.searchParams.set('s',String(start));u.searchParams.set('e',String(end));return fetch(u,{headers:{accept:'*/*','accept-encoding':'identity','user-agent':'ExoPlayer'},signal:AbortSignal.timeout(40000)})}
module.exports={startServer};