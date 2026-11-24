'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),origin='https://www.travauxcorse.com/';
const excluded=new Set(['admin','tests','api','lib','scripts','node_modules','.git','.github']);
function htmlFiles(dir){
 return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>{
  if(e.isDirectory())return excluded.has(e.name)?[]:htmlFiles(path.join(dir,e.name));
  return e.name==='index.html'?[path.join(dir,e.name)]:[];
 });
}
const expected=htmlFiles(root).map(f=>{let d=path.relative(root,path.dirname(f)).split(path.sep).join('/');return origin+(d?d+'/':'');});
const xml=fs.readFileSync(path.join(root,'sitemap.xml'),'utf8');
const urls=[...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]);
test('Every public HTML page has one sitemap URL',()=>{
 assert.equal(new Set(urls).size,urls.length,'duplicate URL');
 assert.deepEqual([...urls].sort(),[...expected].sort(),'unexpected or missing sitemap URL');
});
test('Priority pages have canonical, H1 and a direct lead link',()=>{
 for(const route of ['conseils/plombier-bastia','conseils/electricien-borgo','conseils/renover-maison-corse','conseils/climatisation-lucciana']){
  const html=fs.readFileSync(path.join(root,route,'index.html'),'utf8');
  assert.ok(urls.includes(origin+route+'/'),'missing sitemap '+route);
  assert.ok(html.includes('<link rel="canonical" href="'+origin+route+'/">'),'bad canonical '+route);
  assert.match(html,/<h1\b[^>]*>/,'no H1 '+route);
  assert.ok(!/<meta[^>]+noindex/i.test(html),'noindex '+route);
  assert.ok(html.includes('/deposer-une-demande/')||html.includes('/etre-rappele/'),'no lead path '+route);
 }
});
test('Guides landing page contains visible static direct links',()=>{
 const html=fs.readFileSync(path.join(root,'conseils','index.html'),'utf8');
 for(const route of ['plombier-bastia','electricien-borgo','renover-maison-corse'])
  assert.ok(html.includes('href="/conseils/'+route+'/"'),'missing link '+route);
});
test('Every article has structured information consistent with its public URL',()=>{
 for(const file of htmlFiles(path.join(root,'conseils'))){
  if(path.basename(path.dirname(file))==='conseils'||file.includes('tous-les-guides'))continue;
  const html=fs.readFileSync(file,'utf8'),url=origin+path.relative(root,path.dirname(file)).split(path.sep).join('/')+'/';
  const nodes=[...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].flatMap(m=>{const d=JSON.parse(m[1]);return d['@graph']||[d];});
  const article=nodes.find(n=>n['@type']==='Article');
  assert.ok(article,'missing Article '+url);
  assert.equal(article.url,url,'Article URL '+url);
  assert.equal(article.mainEntityOfPage,url,'mainEntityOfPage '+url);
  assert.equal(article.author?.name,'TravauxCorse','author '+url);
  assert.equal(article.publisher?.name,'TravauxCorse','publisher '+url);
  assert.ok(nodes.some(n=>n['@type']==='BreadcrumbList'),'breadcrumbs '+url);
 }
});
test('The unfiltered HTML directory links to every guide without hiding them',()=>{
 const folder=path.join(root,'conseils'),directory=path.join(folder,'tous-les-guides','index.html');
 const html=fs.readFileSync(directory,'utf8');
 const guides=htmlFiles(folder).filter(f=>f!==directory&&f!==path.join(folder,'index.html'));
 const expected=guides.map(f=>'/'+path.relative(root,path.dirname(f)).split(path.sep).join('/')+'/');
 const actual=[...html.matchAll(/href="(\/conseils\/[^"#]+\/)"/g)].map(m=>m[1]);
 assert.deepEqual([...new Set(actual)].sort(),expected.sort());
 assert.ok(!/<(?:section|li|ul|nav)\b[^>]*\shidden(?:[\s=>])/i.test(html),'directory must not require filters or JavaScript');
 const schema=JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
 assert.equal(schema['@type'],'CollectionPage');
 assert.equal(schema.mainEntity.numberOfItems,guides.length);
 assert.equal(schema.mainEntity.itemListElement.length,guides.length);
 assert.ok(fs.readFileSync(path.join(folder,'index.html'),'utf8').includes('href="/conseils/tous-les-guides/"'));
});
