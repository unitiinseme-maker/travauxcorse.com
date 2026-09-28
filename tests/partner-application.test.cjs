const {test}=require('node:test');
const assert=require('node:assert/strict');
const Module=require('node:module');
const original=Module._load;
let deliveries=[],accepted=true,configured=true;
Module._load=function(name,parent,isMain){if(name==='../lib/artisan-accounts'&&parent?.filename.endsWith('/api/partner-application.js'))return {emailConfigured:()=>configured,sendEmail:async(to,subject,body)=>{deliveries.push({to,subject,body});return {sent:accepted};}};return original.call(this,name,parent,isMain);};
const handler=require('../api/partner-application');Module._load=original;
const headers={host:'travauxcorse-com.vercel.app',origin:'https://travauxcorse-com.vercel.app','content-type':'application/json',accept:'application/json'};
const body={company:'Entreprise témoin',manager:'Responsable test',email:'test@example.fr',phone:'0612345678',trade:'Électricité',zone:'Haute-Corse',message:'Candidature de test',contactConsent:'oui'};
function request(method,values,custom=headers){return new Promise((resolve,reject)=>{const res={headers:{},setHeader(k,v){this.headers[k]=v;},end(content){resolve({status:this.statusCode,body:content,headers:this.headers});}};handler({method,body:values,headers:custom},res).catch(reject);});}
test('the partner application accepts only valid same-origin POST and delivers to TravauxCorse',async()=>{
  let r=await request('GET',body);assert.equal(r.status,405);
  r=await request('POST',body,{...headers,origin:'https://other.example'});assert.equal(r.status,403);
  r=await request('POST',{...body,contactConsent:''});assert.equal(r.status,400);
  r=await request('POST',body);assert.equal(r.status,200);assert.deepEqual(JSON.parse(r.body),{sent:true});
  assert.equal(deliveries.length,1);assert.equal(deliveries[0].to,'contact.travauxcorse@gmail.com');assert.match(deliveries[0].body,/Entreprise témoin/);
  accepted=false;r=await request('POST',body);assert.equal(r.status,502);assert.equal(JSON.parse(r.body).sent,undefined);
  configured=false;r=await request('POST',body);assert.equal(r.status,503);assert.equal(deliveries.length,2);
});
test('standard HTML POST has an on-site confirmation instead of FormSubmit redirect',async()=>{
  configured=true;accepted=true;
  const form={...headers,'content-type':'application/x-www-form-urlencoded',accept:'text/html'};
  const r=await request('POST',new URLSearchParams(body).toString(),form);
  assert.equal(r.status,200);assert.match(r.headers['Content-Type'],/text\/html/);assert.match(r.body,/candidature a bien été envoyée/);assert.match(r.body,/Retour au site/);
});
