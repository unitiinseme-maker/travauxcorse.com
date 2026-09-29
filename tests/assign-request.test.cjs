const {test}=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const blob=require('@vercel/blob');
let record={date:'2026-09-27',name:'Client',email:'client@example.fr',trades:'Électricité',title:'Tableau électrique',commune:'Bastia'};
let writes=[];
const oldGet=blob.get,oldPut=blob.put;
blob.get=async()=>({statusCode:200,stream:new Blob([JSON.stringify(record)]).stream()});
blob.put=async(path,content,options)=>{record=JSON.parse(content);writes.push({path,options});};
const accounts=require('../lib/artisan-accounts');
const artisanId=crypto.randomUUID(),profile={id:artisanId,name:'Artisan confirmé',email:'artisan@example.fr',active:true};
accounts.readArtisan=async id=>id===artisanId?profile:null;
accounts.saveArtisan=async()=>{};
let deliveryWorks=false;
accounts.sendEmail=async()=>deliveryWorks?{sent:true}:{sent:false,reason:'Gmail a refusé la connexion.'};
const handler=require('../api/assign-request');
blob.get=oldGet;blob.put=oldPut;
const secret='s'.repeat(64),password='private-test-password-123456789';
function auth(){
  const payload=Buffer.from(JSON.stringify({exp:Date.now()+60000,nonce:'nonce-123',password:crypto.createHash('sha256').update(password).digest('hex')})).toString('base64url');
  const sign=crypto.createHmac('sha256',secret).update(payload).digest('base64url');
  return {cookie:'__Host-tc-editor='+payload+'.'+sign,csrf:crypto.createHmac('sha256',secret).update('nonce-123').digest('base64url')};
}
async function request(body,headers={}){return new Promise(resolve=>{const res={setHeader:()=>{},end:text=>resolve({status:res.statusCode,data:JSON.parse(text)})};handler({method:'POST',headers,body},res).catch(resolve);});}
test('real project assignments require an authenticated CMS session and CSRF token',async()=>{
  process.env.CMS_SECRET=secret;process.env.CMS_ADMIN_PASSWORD=password;
  const id='requests/2026-09-27/project.json',body={action:'assign',id,name:'Artisan',email:'artisan@example.fr'};
  let result=await request(body,{});assert.equal(result.status,401);
  const {cookie,csrf}=auth(),headers={cookie,origin:'https://travauxcorse-com.vercel.app','content-type':'application/json'};
  result=await request(body,headers);assert.equal(result.status,403);
  result=await request(body,{...headers,'x-csrf-token':csrf});assert.equal(result.status,200);
  assert.equal(record.assignedArtisans[0].email,'artisan@example.fr');assert.equal(writes[0].options.access,'private');assert.equal(writes[0].options.allowOverwrite,true);
  result=await request(body,{...headers,'x-csrf-token':csrf});assert.equal(result.status,409);
  result=await request({action:'remove',id,assignmentId:record.assignedArtisans[0].id},{...headers,'x-csrf-token':csrf});assert.equal(result.status,200);assert.equal(record.assignedArtisans.length,0);
});
test('a failed artisan notification can be retried without assigning the project twice',async()=>{
  process.env.CMS_SECRET=secret;process.env.CMS_ADMIN_PASSWORD=password;
  const id='requests/2026-09-27/project.json',assignmentId=crypto.randomUUID();
  record={date:'2026-09-27',name:'Client',email:'client@example.fr',trades:'Électricité',title:'Tableau électrique',commune:'Bastia',assignedArtisans:[{id:assignmentId,name:profile.name,email:profile.email,artisanId,notified:false}]};
  const {cookie,csrf}=auth(),headers={cookie,origin:'https://travauxcorse-com.vercel.app','content-type':'application/json','x-csrf-token':csrf};
  let result=await request({action:'notify',id,assignmentId},headers);
  assert.equal(result.status,200);assert.equal(result.data.notificationSent,false);
  assert.match(result.data.notificationError,/Gmail/);assert.equal(record.assignedArtisans.length,1);assert.equal(record.assignedArtisans[0].notified,false);
  deliveryWorks=true;
  result=await request({action:'notify',id,assignmentId},headers);
  assert.equal(result.status,200);assert.equal(result.data.notificationSent,true);
  assert.equal(record.assignedArtisans.length,1);assert.equal(record.assignedArtisans[0].notified,true);
  result=await request({action:'notify',id,assignmentId},headers);assert.equal(result.status,409);
});
