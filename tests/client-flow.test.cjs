const {test}=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const blob=require('@vercel/blob');
const records=new Map(),original={list:blob.list,get:blob.get,put:blob.put};
blob.list=async({prefix})=>({blobs:[...records.keys()].filter(p=>p.startsWith(prefix)).map(pathname=>({pathname})),hasMore:false});
blob.get=async(path)=>records.has(path)?{statusCode:200,stream:new Blob([records.get(path)]).stream()}:null;
blob.put=async(path,body)=>{records.set(path,Buffer.isBuffer(body)?body:String(body));return {pathname:path};};
const accounts=require('../lib/artisan-accounts');
const send=accounts.sendEmail;let delivered='';
accounts.sendEmail=async(to,subject,body)=>{delivered=body;return {sent:true};};
const client=require('../api/client-access');
const artisan=require('../api/artisan-access');
Object.assign(blob,original);accounts.sendEmail=send;
const origin='https://travauxcorse-com.vercel.app',secret='z'.repeat(64);
async function call(handler,body={},headers={},method='POST'){
  return new Promise((resolve,reject)=>{
    const responseHeaders={};
    const res={setHeader:(key,value)=>responseHeaders[key]=value,end:value=>resolve({status:res.statusCode,body:JSON.parse(value),headers:responseHeaders})};
    handler({method,headers,body},res).catch(reject);
  });
}
test('client sees only owned requests and the admin-assigned artisan reply and quote',async()=>{
  process.env.CMS_SECRET=secret;
  const own='requests/2026-09-28/own.json',other='requests/2026-09-28/other.json',artisanId=crypto.randomUUID(),assignmentId=crypto.randomUUID();
  records.set(own,JSON.stringify({date:new Date().toISOString(),name:'Client A',email:'a@example.fr',trades:'Électricité',title:'Projet A',commune:'Bastia',assignedArtisans:[{id:assignmentId,name:'Entreprise A',email:'artisan@example.fr',artisanId,at:new Date().toISOString()}]}));
  records.set(other,JSON.stringify({name:'Client B',email:'b@example.fr',trades:'Plomberie',title:'Projet B',commune:'Ajaccio'}));
  records.set('artisans/'+artisanId+'.json',JSON.stringify({id:artisanId,name:'Entreprise A',email:'artisan@example.fr',active:true}));
  const headers={origin,'content-type':'application/json'};
  let r=await call(client,{action:'request-link',email:'a@example.fr'},headers);
  assert.equal(r.status,200);
  const url=delivered.match(/https:\/\/\S+/)?.[0];assert.ok(url);
  const link=new URL(url),params=new URLSearchParams(link.hash.slice(1));
  r=await call(client,{action:'redeem',email:params.get('email'),token:params.get('invitation')},headers);
  assert.equal(r.status,200);const clientCookie=r.headers['Set-Cookie'].split(';')[0];
  r=await call(client,{}, {cookie:clientCookie},'GET');
  assert.equal(r.status,200);assert.equal(r.body.projects.length,1);assert.equal(r.body.projects[0].title,'Projet A');
  r=await call(client,{action:'message',project:other,text:'Unauthorized'}, {...headers,cookie:clientCookie});
  assert.equal(r.status,404);
  const artisanCookie=accounts.sessionCookie({id:artisanId,email:'artisan@example.fr'},secret).split(';')[0];
  r=await call(artisan,{action:'reply',project:own,assignmentId,message:'Disponible pour ce chantier'}, {...headers,cookie:artisanCookie});
  assert.equal(r.status,200);
  r=await call(artisan,{action:'quote',project:own,assignmentId,amount:1000,vat:20,description:'Travaux électriques'}, {...headers,cookie:artisanCookie});
  assert.equal(r.status,200);
  r=await call(client,{}, {cookie:clientCookie},'GET');
  assert.equal(r.body.projects[0].assignedArtisans[0].response,'Disponible pour ce chantier');
  assert.equal(r.body.projects[0].quotes[0].amount,1000);
  assert.equal(r.body.projects[0].history.length,2);
});
