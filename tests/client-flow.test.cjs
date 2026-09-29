const {test}=require('node:test');
const assert=require('node:assert/strict');
const client=require('../api/client-access');
const artisan=require('../api/artisan-access');
function call(handler,method,body={},headers={}){return new Promise((resolve,reject)=>{
 const responseHeaders={};const res={setHeader(k,v){responseHeaders[k]=v;},end(value){resolve({status:this.statusCode,body:JSON.parse(value),headers:responseHeaders});}};
 Promise.resolve(handler({method,body,headers},res)).catch(reject);
});}
test('old client and artisan accounts and sessions cannot access project data',async()=>{
 for(const [handler,cookie] of [[client,'__Host-tc-client'],[artisan,'__Host-tc-artisan']]){
  for(const method of ['GET','POST']){
   const r=await call(handler,method,{action:'redeem',token:'old-demo-token'},{cookie:cookie+'=old-session'});
   assert.equal(r.status,410);
   assert.equal(r.headers['Cache-Control'],'private, no-store');
   assert.match(r.headers['Set-Cookie'],new RegExp(cookie+'=;.*Max-Age=0'));
   assert.equal(r.body.projects,undefined);
  }
 }
});
