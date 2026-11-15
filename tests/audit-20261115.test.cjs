const {test}=require('node:test');
const assert=require('node:assert/strict');
const Module=require('node:module');
const original=Module._load;
const stored={date:'2026-11-15',name:'TEST AUDIT',email:'test@example.invalid',trades:'Plomberie',title:'TEST AUDIT',commune:'Bastia',description:'x'.repeat(31000)};
let saved;
Module._load=function(name,parent,isMain){
 if(name==='@vercel/blob')return {list:async()=>({blobs:[{pathname:'requests/good.json'},{pathname:'requests/bad.json'}]}),get:async p=>({statusCode:200,stream:new Response(p.includes('good')?JSON.stringify(stored):'{invalid').body}),put:async(p,data)=>{saved=JSON.parse(data);}};
 if(name==='./editorial'&&parent.filename.endsWith('/api/submissions.js'))return {cmsConfig:()=>({secret:'test-secret',password:'test-password'}),cmsSession:()=>({nonce:'test-nonce'})};
 return original.call(this,name,parent,isMain);
};
const submissions=require('../api/submissions'),ingest=require('../api/ingest-request');Module._load=original;
function invoke(handler,body,method='GET'){return new Promise((resolve,reject)=>{const res={setHeader(){},end(data){resolve({status:this.statusCode,data:JSON.parse(data)});}};handler({url:'/',headers:{},method,body},res).catch(reject);});}
test('one unreadable record does not hide valid requests; records above 30 KB remain visible',async()=>{
 process.env.BLOB_STORE_ID='test-store';
 const r=await invoke(submissions);assert.equal(r.status,200);assert.equal(r.data.requests.length,1);assert.equal(r.data.unreadable,1);assert.equal(r.data.requests[0].name,'TEST AUDIT');delete process.env.BLOB_STORE_ID;
});
test('public ingestion cannot inject assignments, messages or project status',async()=>{
 process.env.BLOB_STORE_ID='test-store';
 const r=await invoke(ingest,{...stored,status:'Travaux terminés',assignedArtisans:[{name:'Injected',email:'test@example.invalid'}],messages:[{text:'Injected'}],documents:[{path:'project-files/00000000-0000-0000-0000-000000000000.pdf'}]},'POST');
 assert.equal(r.status,200);assert.equal(saved.status,'Demande reçue');assert.deepEqual(saved.assignedArtisans,[]);assert.deepEqual(saved.messages,[]);assert.deepEqual(saved.documents,[]);delete process.env.BLOB_STORE_ID;
});
