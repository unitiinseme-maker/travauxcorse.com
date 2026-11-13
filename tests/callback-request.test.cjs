const {test}=require('node:test'),assert=require('node:assert/strict');
const {createHandler}=require('../lib/callback-request');
const {normalizeRequest}=require('../lib/project-request');
const headers={host:'www.travauxcorse.com',origin:'https://www.travauxcorse.com','content-type':'application/json','x-forwarded-for':'192.0.2.10'};
const body={name:'Client test',phone:'06 12 34 56 78',commune:'Bastia',contactConsent:'oui',requestId:'00000000-0000-4000-8000-000000000001',originPath:'/conseils/electricien-bastia/'};
function setup(){
 const records=new Map(),emails=[];let mailSuccess=true,storeSuccess=true;
 const handler=createHandler({get:async path=>records.has(path)?{statusCode:200}:null,put:async(path,value)=>{if(!storeSuccess)throw Error('Storage failure');records.set(path,JSON.parse(value));},emailConfigured:()=>true,sendEmail:async(to,subject,text)=>{emails.push({to,subject,text});return {sent:mailSuccess};}});
 async function call(values=body,custom=headers,method='POST'){const res={headers:{},setHeader(k,v){this.headers[k]=v;},end(v){this.body=JSON.parse(v);}};await handler({method,headers:custom,body:values},res);return res;}
 return {records,emails,call,failMail(){mailSuccess=false;},failStore(){storeSuccess=false;}};
}
process.env.BLOB_STORE_ID='test-store';
test('callback validates the public boundary and never writes without explicit consent',async()=>{
 const s=setup();assert.equal((await s.call(body,headers,'GET')).statusCode,405);
 assert.equal((await s.call(body,{...headers,origin:'https://evil.example'})).statusCode,403);
 for(const values of [{...body,contactConsent:''},{...body,phone:'abc'},{...body,commune:''},{...body,name:''},{...body,website:'spam'},{...body,email:'invalid'},{...body,requestId:'../../escape'}])assert.equal((await s.call(values)).statusCode,400);
 assert.equal(s.records.size,0);assert.equal(s.emails.length,0);
});
test('three contact fields create a private, admin-readable lead and retries do not send duplicate emails',async()=>{
 const s=setup();let r=await s.call();assert.equal(r.statusCode,200);assert.deepEqual(r.body,{received:true});assert.equal(s.records.size,1);
 const [path,item]=[...s.records.entries()][0];assert.match(path,/^requests\/callbacks\//);const normalized=normalizeRequest(item);assert.equal(normalized.email,'');assert.equal(normalized.phone,body.phone);assert.equal(normalized.commune,'Bastia');assert.match(normalized.details,/electricien-bastia/);
 assert.equal(s.emails.length,1);assert.equal(s.emails[0].to,'contact.travauxcorse@gmail.com');
 r=await s.call();assert.equal(r.statusCode,200);assert.equal(s.records.size,1);assert.equal(s.emails.length,1);
});
test('a storage failure is not confirmed; a notification failure does not lose a saved lead',async()=>{
 let s=setup();s.failStore();let r=await s.call();assert.equal(r.statusCode,503);assert.equal(s.emails.length,0);assert.equal(r.body.received,undefined);
 s=setup();s.failMail();r=await s.call();assert.equal(r.statusCode,200);assert.equal(s.records.size,1);assert.match([...s.records.values()][0].details,/Notification email non confirmée/);
});
test('callback accepts no arbitrary source URL and throttles repeated submissions',async()=>{
 const s=setup();for(let i=1;i<=5;i++){const r=await s.call({...body,originPath:'https://secret.example/?token=x',requestId:`00000000-0000-4000-8000-${String(i).padStart(12,'0')}`});assert.equal(r.statusCode,200);}
 assert([...s.records.values()].every(r=>!r.details.includes('secret.example')));
 const blocked=await s.call({...body,requestId:'00000000-0000-4000-8000-000000000006'});assert.equal(blocked.statusCode,429);assert.equal(s.records.size,5);
});
