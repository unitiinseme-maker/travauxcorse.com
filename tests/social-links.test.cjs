const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),crypto=require('node:crypto');
function moduleAt(file,require){const scope={module:{exports:{}},require,URL,Response,Buffer,console,TypeError,SyntaxError};vm.runInNewContext(fs.readFileSync(__dirname+'/../'+file,'utf8'),scope);return scope.module.exports;}
let saved=null;
const store=moduleAt('lib/social-store.js',()=>({get:async()=>saved?{statusCode:200,stream:JSON.stringify(saved)}:null,put:async(path,data)=>{assert.equal(path,'site/social-links.json');saved=JSON.parse(data);}}));
test('optional social URLs validate hosts and reject injected or unrelated addresses',()=>{
  assert.equal(store.validateSocialLinks({facebook:'',instagram:''}).facebook,'');
  assert.equal(store.validateSocialLinks({facebook:' https://www.facebook.com/travauxcorse ',instagram:'https://instagram.com/travauxcorse/'}).facebook,'https://www.facebook.com/travauxcorse');
  for(const value of ['javascript:alert(1)','http://facebook.com/x','https://facebook.com.evil.test/x','https://evil.test/?facebook.com','https://user:pass@facebook.com/x'])assert.throws(()=>store.validateSocialLinks({facebook:value}));
});
test('storage starts empty and persists/removes each link independently',async()=>{
  assert.equal((await store.loadSocialLinks()).facebook,'');
  await store.saveSocialLinks({facebook:'https://www.facebook.com/page',instagram:''});
  assert.equal((await store.loadSocialLinks()).facebook,'https://www.facebook.com/page');
  await store.saveSocialLinks({facebook:'',instagram:'https://www.instagram.com/page/'});
  assert.equal((await store.loadSocialLinks()).facebook,'');
});
test('public read and protected write preserve admin session, origin and CSRF checks',async()=>{
  const secret='test secret',nonce='test nonce',csrf=crypto.createHmac('sha256',secret).update(nonce).digest('base64url');
  const api=moduleAt('api/social-links.js',name=>name==='node:crypto'?crypto:name.includes('site-config')?{allowedAdminOrigin:req=>req.headers.origin==='https://www.travauxcorse.com'}:name.includes('editorial')?{cmsConfig:()=>({secret,password:'test'}),cmsSession:req=>req.headers.cookie==='valid'?{nonce}:null}:store);
  async function call(method,headers={},body){const res={setHeader(){},end(value){this.value=JSON.parse(value);}};await api({method,headers,body},res);return res;}
  assert.equal((await call('GET')).statusCode,200);
  assert.equal((await call('POST',{},{})).statusCode,401);
  const headers={cookie:'valid',origin:'https://www.travauxcorse.com','content-type':'application/json','x-csrf-token':csrf};
  assert.equal((await call('POST',{...headers,'x-csrf-token':''},{})).statusCode,403);
  assert.equal((await call('POST',{...headers,origin:'https://evil.test'},{})).statusCode,403);
  assert.equal((await call('POST',headers,{facebook:'https://evil.test',instagram:''})).statusCode,400);
  assert.equal((await call('POST',headers,{facebook:'',instagram:''})).statusCode,200);
  assert.equal((await call('DELETE',headers)).statusCode,405);
});
test('footer hides empty links, opens valid links safely, and survives app rerender',async()=>{
  let observer,links={facebook:'',instagram:''},footer;
  class Element{
    constructor(tag){this.tag=tag;this.children=[];this.dataset={};this.attributes={};}
    append(child){this.children.push(child);child.parent=this;}
    setAttribute(k,v){this.attributes[k]=v;}
    querySelector(){return this.children.find(x=>x.className==='tc-social-links');}
    remove(){this.parent.children=this.parent.children.filter(x=>x!==this);}
    replaceWith(next){this.parent.append(next);this.remove();}
  }
  footer=new Element('div');const events={};
  const scope={URL,console,document:{body:{},querySelector:()=>footer,createElement:tag=>new Element(tag),addEventListener:(name,fn)=>events[name]=fn},window:{addEventListener(){}},MutationObserver:class{constructor(fn){observer=fn;}observe(){}},fetch:async()=>({ok:true,json:async()=>links})};
  const source=fs.readFileSync(__dirname+'/../navigation.js','utf8').split('// One lightweight footer integration for prerendered pages and app.js navigation.')[1];
  vm.runInNewContext(source,scope);await new Promise(setImmediate);
  assert.equal(footer.children.length,0);
  links={facebook:'https://www.facebook.com/page',instagram:'https://www.instagram.com/page/'};events['tc-social-links-updated']();await new Promise(setImmediate);
  assert.equal(footer.children[0].children.length,2);
  for(const a of footer.children[0].children){assert.equal(a.target,'_blank');assert.equal(a.rel,'noopener noreferrer');assert.ok(a.attributes['aria-label'].includes('nouvel onglet'));}
  observer();assert.equal(footer.children.length,1);
  footer=new Element('div');observer();assert.equal(footer.children[0].children.length,2);
  links={facebook:'',instagram:'https://www.instagram.com/page/'};events['tc-social-links-updated']();await new Promise(setImmediate);assert.equal(footer.children[0].children.length,1);
  links={};events['tc-social-links-updated']();await new Promise(setImmediate);assert.equal(footer.children.length,0);
});
