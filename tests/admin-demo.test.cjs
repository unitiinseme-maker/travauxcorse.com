const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.join(__dirname,'..');

test('legacy browser demo administrator is discarded and cannot open the old admin route',()=>{
  const previous={role:'admin',page:'admin',currentUserEmail:'legacy@example.test',accounts:[{role:'admin',email:'legacy@example.test',password:'old-demo-password'}]};
  const scope={Intl,structuredClone,Uint8Array,location:{hash:'#admin',pathname:'/'},localStorage:{getItem(){return null}},sessionStorage:{getItem(){return JSON.stringify(previous)}},window:{addEventListener(){}},document:{addEventListener(){}}};
  vm.createContext(scope);
  vm.runInContext(fs.readFileSync(path.join(root,'app.js'),'utf8').replace(/render\(\);\s*loadPublicCategories\(\);[\s\S]*$/,''),scope);
  assert.equal(vm.runInContext('state.role',scope),'visiteur');
  assert.equal(vm.runInContext('state.currentUserEmail',scope),'');
  assert.equal(vm.runInContext('state.accounts',scope),undefined);
  assert.equal(vm.runInContext('pageFromUrl()',scope),'home');
  assert.equal(vm.runInContext('applicationPages.has("admin")',scope),false);
  assert.equal(fs.existsSync(path.join(root,'portal.js')),false);
});

test('published scripts and admin HTML contain no demo admin credential or access link',()=>{
  const delivered=['app.js','admin/index.html','admin/demandes/index.html'].map(file=>fs.readFileSync(path.join(root,file),'utf8')).join('\n');
  assert.doesNotMatch(delivered,/admin\/admin|password:\s*["']admin["']|data-page=["']admin["']|\/#admin|\/#login/);
  const editor=fs.readFileSync(path.join(root,'admin/index.html'),'utf8');
  const requests=fs.readFileSync(path.join(root,'admin/demandes/index.html'),'utf8');
  assert.match(editor,/id="editor-private-toolbar" hidden/);
  assert.match(editor,/id="editor-private-content" hidden/);
  assert.match(requests,/class="portal-card artisan-directory" hidden/);
});
