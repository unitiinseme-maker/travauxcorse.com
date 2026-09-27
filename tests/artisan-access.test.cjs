const {test}=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const blob=require('@vercel/blob');
const entries=new Map();
const originals={list:blob.list,get:blob.get,put:blob.put};
blob.list=async({prefix})=>({blobs:[...entries.keys()].filter(path=>path.startsWith(prefix)).map(path=>({pathname:path})),hasMore:false});
blob.get=async(path)=>entries.has(path)?{statusCode:200,stream:new Blob([entries.get(path)]).stream()}:null;
blob.put=async(path,body,opts)=>{assert.equal(opts.access,'private');entries.set(path,String(body));return {pathname:path};};
const artisans=require('../api/artisans');
const assignments=require('../api/assign-request');
const access=require('../api/artisan-access');
Object.assign(blob,originals);
const secret='p'.repeat(64),password='private-artisan-password-123456789',origin='https://travauxcorse-com.vercel.app';
function adminHeaders(){const payload=Buffer.from(JSON.stringify({exp:Date.now()+60000,nonce:'test-nonce',password:crypto.createHash('sha256').update(password).digest('hex')})).toString('base64url');return {origin,'content-type':'application/json',cookie:'__Host-tc-editor='+payload+'.'+crypto.createHmac('sha256',secret).update(payload).digest('base64url'),'x-csrf-token':crypto.createHmac('sha256',secret).update('test-nonce').digest('base64url')};}
function request(handler,body,headers={},method='POST'){return new Promise((resolve,reject)=>{const responseHeaders={};const res={setHeader:(key,value)=>responseHeaders[key]=value,end:value=>resolve({status:res.statusCode,body:JSON.parse(value),headers:responseHeaders})};handler({method,headers,body},res).catch(reject);});}
test('admin registers artisan, assigns a project and one-use invitation opens only their project',async()=>{
  process.env.CMS_SECRET=secret;process.env.CMS_ADMIN_PASSWORD=password;
  const headers=adminHeaders();
  let r=await request(artisans,{action:'add',name:'Entreprise test',email:'artisan@example.fr',trades:'Électricité'},headers);
  assert.equal(r.status,200);assert.equal(r.body.invitationSent,false);
  const artisanId=r.body.artisan.id;
  const projectPath='requests/2026-09-27/a.json';
  entries.set(projectPath,JSON.stringify({name:'Client',email:'client@example.fr',phone:'0612345678',trades:'Électricité',title:'Rénovation',commune:'Bastia',description:'Changer le tableau'}));
  entries.set('requests/2026-09-27/b.json',JSON.stringify({name:'Autre',email:'autre@example.fr',trades:'Plomberie',title:'Autre projet',commune:'Ajaccio'}));
  r=await request(assignments,{action:'assign',id:projectPath,artisanId},headers);
  assert.equal(r.status,200);assert.equal(r.body.notificationSent,false);assert.ok(r.body.inviteUrl);
  const token=new URL(r.body.inviteUrl).hash.split('=')[1];
  r=await request(access,{}, {origin,'content-type':'application/json'},'GET');assert.equal(r.status,401);
  r=await request(access,{action:'redeem',token},{origin,'content-type':'application/json'});assert.equal(r.status,200);
  const cookie=r.headers['Set-Cookie'].split(';')[0];
  r=await request(access,{}, {cookie},'GET');assert.equal(r.status,200);
  assert.equal(r.body.projects.length,1);assert.equal(r.body.projects[0].title,'Rénovation');
  assert.equal(r.body.projects[0].client.email,'client@example.fr');
  r=await request(access,{action:'redeem',token},{origin,'content-type':'application/json'});assert.equal(r.status,401);
});
