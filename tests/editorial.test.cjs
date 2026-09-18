const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const crypto=require('node:crypto');
const {createStore,encrypt,decrypt,validate}=require('../lib/content-store');const render=require('../lib/content-render');
const secret='test-secret-not-used-in-production-123456789';
function fakeGithub(){
  const blobs=new Map(),trees=new Map(),commits=new Map();let count=0,head='base';
  function blob(text){const content=Buffer.isBuffer(text)?text:Buffer.from(text);const sha=crypto.createHash('sha1').update(content).digest('hex');blobs.set(sha,content);return sha;}
  const files={};for(const p of ['conseils/index.html','realisations/index.html','sitemap.xml'])files[p]=blob(fs.readFileSync(require('node:path').join(__dirname,'..',p)));
  trees.set('initial',files);commits.set('base',{tree:{sha:'initial'}});
  async function fetcher(url,options){
    const path=url.split('travauxcorse.com/')[1],body=options.body?JSON.parse(options.body):null;let value;
    if(path==='git/ref/heads/main')value={object:{sha:head}};
    else if(path.startsWith('git/commits/')&&options.method==='GET')value=commits.get(path.split('/').pop());
    else if(path.startsWith('git/trees/')&&options.method==='GET'){const tree=trees.get(path.split('/').pop().split('?')[0]);value={tree:Object.entries(tree).map(([path,sha])=>({path,sha,type:'blob'}))};}
    else if(path.startsWith('git/blobs/')&&options.method==='GET')value={content:blobs.get(path.split('/').pop()).toString('base64')};
    else if(path==='git/blobs')value={sha:blob(Buffer.from(body.content,body.encoding==='base64'?'base64':'utf8'))};
    else if(path==='git/trees'){const tree={...trees.get(body.base_tree)};for(const item of body.tree){if(item.sha===null)delete tree[item.path];else tree[item.path]=item.sha;}const sha='tree'+(++count);trees.set(sha,tree);value={sha};}
    else if(path==='git/commits'){const sha='commit'+(++count);commits.set(sha,{tree:{sha:body.tree},parents:body.parents});value={sha};}
    else if(path==='git/refs/heads/main'){if(commits.get(body.sha).parents[0]!==head)return {ok:false,status:422};head=body.sha;value={};}
    else throw Error(path);
    return {ok:true,status:200,json:async()=>value};
  }
  return {fetcher,read:path=>{const tree=trees.get(commits.get(head).tree.sha);return tree[path]?blobs.get(tree[path]).toString():null;}};
}
const doc={id:'chantier-test',kind:'realisation',slug:'salle-de-bains-bastia',title:'Salle de bains à Bastia',summary:'Rénovation avec deux métiers.',body:'## Travaux\n\nÉlectricité et plomberie.',commune:'Bastia',trades:'Électricité, plomberie',images:[]};
test('private drafts authenticated encryption and tamper rejection',()=>{const encoded=encrypt({private:'secret draft'},secret);assert(!encoded.includes('secret draft'));assert.deepEqual(decrypt(encoded,secret),{private:'secret draft'});assert.throws(()=>decrypt(encoded,secret+'x'));});
test('validation rejects paths and active image content; renderer escapes HTML',()=>{assert.throws(()=>validate({...doc,slug:'../../index'}));assert.throws(()=>validate({...doc,images:[{data:'data:image/svg+xml;base64,PHN2Zz4=',caption:''}]}));const html=render.page({...doc,title:'<script>alert(1)</script>',body:'<img src=x onerror=alert(1)>'});assert(!html.includes('<img src=x'));assert(html.includes('&lt;script&gt;'));});
test('draft -> publish -> edit draft -> withdraw -> delete; preserves guides and sitemap',async()=>{
 const git=fakeGithub(),store=createStore({token:'test',secret,fetcher:git.fetcher});let result=await store.load();assert.equal(result.entries.length,6);
 result=await store.save({version:result.version,action:'draft',id:doc.id,doc});assert(!git.read(render.pathFor(doc)));assert(!git.read('content/editorial.enc').includes(doc.title));
 result=await store.save({version:result.version,action:'publish',id:doc.id,doc});assert(git.read(render.pathFor(doc)).includes(doc.title));assert(git.read('realisations/index.html').includes(doc.title));assert(git.read('sitemap.xml').includes(render.urlFor(doc)));assert(git.read('conseils/index.html').includes('choisir-artisan-corse'));
 const published=git.read(render.pathFor(doc)),edited={...doc,title:'Nouveau titre privé'};
 result=await store.save({version:result.version,action:'draft',id:doc.id,doc:edited});assert.equal(git.read(render.pathFor(doc)),published);assert(result.entries.find(x=>x.id===doc.id).hasUnpublishedChanges);
 const loaded=await store.load(doc.id);assert.equal(loaded.entry.draft.title,edited.title);assert.equal(loaded.entry.published.title,doc.title);
 await assert.rejects(()=>store.save({version:'stale',action:'publish',id:doc.id,doc}),{status:409});
 result=await store.save({version:result.version,action:'unpublish',id:doc.id});assert.equal(git.read(render.pathFor(doc)),null);assert(!git.read('sitemap.xml').includes(render.urlFor(doc)));assert(!git.read('realisations/index.html').includes(doc.title));
 result=await store.save({version:result.version,action:'delete',id:doc.id});assert.equal(result.entries.length,6);
});
test('API fails closed without configuration and rejects demo login, forged session and cross-origin writes',async()=>{
 const handler=require('../api/editorial');
 function request(req){return new Promise(async resolve=>{const headers={};const res={setHeader:(k,v)=>headers[k]=v,end:text=>resolve({status:res.statusCode,body:JSON.parse(text),headers})};await handler({headers:{},...req},res);});}
 delete process.env.CMS_GITHUB_TOKEN;let r=await request({method:'GET'});assert.equal(r.status,503);
 process.env.CMS_GITHUB_TOKEN='fake-token';process.env.CMS_SECRET=secret;process.env.CMS_ADMIN_PASSWORD='private-test-password-123456789';
 r=await request({method:'GET',url:'/api/editorial'});assert.equal(r.body.authenticated,false);
 const headers={origin:'https://travauxcorse-com.vercel.app','content-type':'application/json'};
 r=await request({method:'POST',headers,body:{action:'login',password:'admin'}});assert.equal(r.status,401);
 r=await request({method:'POST',headers:{...headers,origin:'https://evil.example'},body:{action:'login',password:process.env.CMS_ADMIN_PASSWORD}});assert.equal(r.status,403);
 r=await request({method:'POST',headers,body:{action:'login',password:process.env.CMS_ADMIN_PASSWORD}});assert.equal(r.status,200);assert(r.headers['Set-Cookie'].includes('HttpOnly; Secure; SameSite=Strict'));
 const cookie=r.headers['Set-Cookie'].split(';')[0];const payload=JSON.parse(Buffer.from(cookie.split('=')[1].split('.')[0],'base64url'));
 r=await request({method:'POST',headers:{...headers,cookie},body:{action:'publish'}});assert.equal(r.status,403);
 const csrf=crypto.createHmac('sha256',secret).update(payload.nonce).digest('base64url');
 r=await request({method:'POST',headers:{...headers,cookie,'x-csrf-token':csrf},body:{action:'logout'}});assert.equal(r.status,200);
 r=await request({method:'POST',headers:{...headers,cookie:cookie+'x','x-csrf-token':csrf},body:{action:'logout'}});assert.equal(r.status,401);
});
test('photos stay encrypted in drafts, then become public only on publication',async()=>{
 const git=fakeGithub(),store=createStore({token:'test',secret,fetcher:git.fetcher});
 const photo={data:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a/a8AAAAASUVORK5CYII=',caption:'Après'};
 const article={...doc,images:[photo]};validate(article);let r=await store.load();
 r=await store.save({version:r.version,action:'draft',id:article.id,doc:article});assert.equal(git.read(render.media(photo).path),null);
 r=await store.save({version:r.version,action:'publish',id:article.id,doc:article});assert(git.read(render.media(photo).path));assert(git.read(render.pathFor(doc)).includes('Après'));
 assert(!JSON.stringify(r.entries).includes('base64'));assert((await store.load(doc.id)).entry.draft.images[0].data.includes('base64'));
});
