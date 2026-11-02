import {startServer} from '../server/GameServer';
import {once} from 'node:events';
import assert from 'node:assert/strict';
const host=startServer(0);await once(host.http,'listening');const origin='http://127.0.0.1:'+(host.http.address() as any).port;
try{
const html=await fetch(origin+'/');assert.equal(html.headers.get('cache-control'),'no-cache');const text=await html.text();assert.ok(!text.includes('congrats.png'));
const script=text.match(/src="([^"]+\.js)"/)[1];const js=await fetch(origin+script);assert.equal(js.headers.get('cache-control'),'public, max-age=31536000, immutable');const code=await js.text();const names=[...code.matchAll(/\/assets\/[^"`\s]+?\.webp/g)].map(x=>x[0]);assert.ok(names.length>=5);
for(const path of [...new Set(names)]){const res=await fetch(origin+path);assert.equal(res.status,200);assert.equal(res.headers.get('content-type'),'image/webp');assert.equal(res.headers.get('cache-control'),'public, max-age=31536000, immutable');assert.ok(Number(res.headers.get('content-length'))<500*1024);const etag=res.headers.get('etag');assert.ok(etag);assert.equal((await fetch(origin+path,{headers:{'If-None-Match':etag}})).status,304);await res.arrayBuffer();}
assert.equal((await fetch(origin+'/figma-flow/settings.svg')).headers.get('cache-control'),'public, max-age=0, must-revalidate');
for(const path of ['/health','/api/leaderboard/weekly'])assert.equal((await fetch(origin+path)).headers.get('cache-control'),'no-store');
assert.equal((await fetch(origin+'/',{headers:{'If-None-Match':html.headers.get('etag')}})).status,304);
console.log('PASS HTML revalidation, hashed JS/WebP immutable, WebP MIME/size, conditional 304, unversioned revalidation, live API no-store; '+origin);

}finally{host.close();}
