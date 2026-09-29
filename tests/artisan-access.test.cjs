const {test}=require('node:test');
const assert=require('node:assert/strict');
const artisan=require('../api/artisan-access');
test('legacy artisan invitations cannot be redeemed or issue a project session',async()=>{
 const result=await new Promise((resolve,reject)=>{
  const headers={};const res={setHeader(k,v){headers[k]=v;},end(body){resolve({status:this.statusCode,headers,body:JSON.parse(body)});}};
  Promise.resolve(artisan({method:'POST',body:{action:'redeem',token:'legacy-invitation'},headers:{origin:'https://travauxcorse-com.vercel.app'}},res)).catch(reject);
 });
 assert.equal(result.status,410);
 assert.equal(result.headers['Set-Cookie'].includes('Max-Age=0'),true);
 assert.equal(result.body.projects,undefined);
});
