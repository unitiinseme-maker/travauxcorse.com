const {test}=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const blob=require('@vercel/blob');
const entries=new Map(),originals={get:blob.get,put:blob.put};
blob.get=async path=>entries.has(path)?{statusCode:200,stream:new Blob([entries.get(path)]).stream()}:null;
blob.put=async(path,value,options)=>{assert.equal(options.access,'private');entries.set(path,String(value));};
const handler=require('../api/categories');Object.assign(blob,originals);
const secret='s'.repeat(64),password='private-password-123456789';
process.env.CMS_SECRET=secret;process.env.CMS_ADMIN_PASSWORD=password;
const payload=Buffer.from(JSON.stringify({exp:Date.now()+360000,nonce:'category-test',password:crypto.createHash('sha256').update(password).digest('hex')})).toString('base64url');
const cookie='__Host-tc-editor='+payload+'.'+crypto.createHmac('sha256',secret).update(payload).digest('base64url');
const csrf=crypto.createHmac('sha256',secret).update('category-test').digest('base64url');
const headers={cookie,'x-csrf-token':csrf,origin:'https://travauxcorse-com.vercel.app','content-type':'application/json'};
function call(method,url,body,head={}){return new Promise((resolve,reject)=>{const response={headers:{},setHeader(key,value){this.headers[key]=value;},end(value){resolve({status:this.statusCode,data:JSON.parse(value),headers:this.headers});}};handler({method,url,body,headers:head},response).catch(reject);});}
test('categories are stored in Blob; public reads are anonymous, ordered and active only',async()=>{
  const seed=await call('GET','/api/categories');assert.equal(seed.status,200);assert.equal(seed.data.length,23);assert.match(seed.headers['Cache-Control'],/no-store/);
  assert.equal((await call('GET','/api/categories?admin=1')).status,401);
  assert.equal((await call('POST','/api/categories',{categories:[]})).status,401);
  assert.equal((await call('POST','/api/categories',{categories:[]},{...headers,'x-csrf-token':'wrong'})).status,403);
  const list=[{id:'electricite',name:'Électricité renommée',active:true},{id:'maconnerie',name:'Maçonnerie',active:false},{id:'nouveau-metier',name:'Métier ajouté',active:true}];
  const save=await call('POST','/api/categories',{categories:list},headers);assert.equal(save.status,200);assert.equal(entries.has('site/categories.json'),true);
  assert.deepEqual((await call('GET','/api/categories')).data,[{id:'electricite',name:'Électricité renommée',order:1},{id:'nouveau-metier',name:'Métier ajouté',order:3}]);
  assert.equal((await call('GET','/api/categories?admin=1',null,headers)).data.length,3);
  assert.equal((await call('POST','/api/categories',{categories:[list[0],list[0]]},headers)).status,400);
  const reordered=[{...list[2]},{...list[0],name:'Électricité'}];
  assert.equal((await call('POST','/api/categories',{categories:reordered},headers)).status,200);
  assert.deepEqual((await call('GET','/api/categories')).data.map(item=>item.name),['Métier ajouté','Électricité']);
});
