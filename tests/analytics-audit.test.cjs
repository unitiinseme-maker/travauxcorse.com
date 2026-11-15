const {test}=require('node:test');const assert=require('node:assert/strict');const vm=require('node:vm');const fs=require('node:fs');
const source=fs.readFileSync('navigation.js','utf8').split('// Google Analytics:')[1].split('// Short first-contact form')[0];
const code=source.slice(source.indexOf('(()=>{'));
function check(path,embedded){let touches=0;const self={};const context={window:{self,top:embedded?{}:self},location:{hostname:'www.travauxcorse.com',pathname:path},document:new Proxy({},{get(){touches++;throw Error('Analytics touched the document');}})};vm.runInNewContext(code,context);assert.equal(touches,0);assert.equal(context.window.tcAnalyticsInstalled,undefined);}
test('responsive preview frames do not start Google or Cloudflare analytics',()=>check('/',true));
test('test and administration pages do not start analytics',()=>{for(const path of ['/tests/responsive.html','/admin/demandes/','/api/submissions'])check(path,false);});
