const crypto = require('node:crypto');
const render = require('./content-render');
const seed = require('../content/seed.json');
const repo = 'unitiinseme-maker/travauxcorse.com';
const statePath = 'content/editorial.enc';
function fail(message, status=400) { const err=new Error(message); err.status=status; throw err; }
function key(secret) { return crypto.createHash('sha256').update(secret).digest(); }
function encrypt(value, secret) {
  const iv=crypto.randomBytes(12), cipher=crypto.createCipheriv('aes-256-gcm',key(secret),iv);
  const data=Buffer.concat([cipher.update(JSON.stringify(value),'utf8'),cipher.final()]);
  return JSON.stringify({v:1,iv:iv.toString('base64'),tag:cipher.getAuthTag().toString('base64'),data:data.toString('base64')});
}
function decrypt(text, secret) {
  const envelope=JSON.parse(text); if(envelope.v!==1)fail('Format de sauvegarde non reconnu.',500);
  const decipher=crypto.createDecipheriv('aes-256-gcm',key(secret),Buffer.from(envelope.iv,'base64'));
  decipher.setAuthTag(Buffer.from(envelope.tag,'base64'));
  return JSON.parse(Buffer.concat([decipher.update(Buffer.from(envelope.data,'base64')),decipher.final()]).toString());
}
function cleanText(value,max,required=false) {
  if(typeof value!=='string' || value.length>max || (required&&!value.trim()))fail('Un champ est manquant ou trop long.');
  return value.trim();
}
function validate(doc) {
  if(!doc || !['guide','realisation'].includes(doc.kind))fail('Type de contenu invalide.');
  const value={id:cleanText(doc.id,100,true),kind:doc.kind,slug:cleanText(doc.slug,100,true),title:cleanText(doc.title,150,true),summary:cleanText(doc.summary,400,true),body:cleanText(doc.body,40000,true),commune:cleanText(doc.commune||'',120),trades:cleanText(doc.trades||'',400),images:[]};
  if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.slug)||!/^[a-z0-9-]+$/.test(value.id))fail('Adresse de page invalide. Utilisez des lettres minuscules, chiffres et tirets.');
  if(!Array.isArray(doc.images)||doc.images.length>4)fail('Quatre photos maximum.');
  let total=0;
  for(const image of doc.images){
    const img={data:cleanText(image.data,500000,true),caption:cleanText(image.caption||'',180)};
    const {bytes}=render.media(img); total+=bytes.length;
    if(bytes.length>350000)fail('Une photo dépasse 350 Ko après réduction.');
    const type=img.data.slice(0,30);
    const valid=(type.startsWith('data:image/jpeg;')&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255)||(type.startsWith('data:image/png;')&&bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))||(type.startsWith('data:image/webp;')&&bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP');
    if(!valid)fail('Format de photo non reconnu.'); value.images.push(img);
  }
  if(total>1000000)fail('Les photos dépassent 1 Mo au total.');
  return value;
}
function summaries(entries) {
  const brief = doc => doc ? {id:doc.id,kind:doc.kind,slug:doc.slug,title:doc.title} : null;
  return entries.map(entry=>({id:entry.id,draft:brief(entry.draft),published:brief(entry.published),hasUnpublishedChanges:!!entry.published&&JSON.stringify(entry.draft)!==JSON.stringify(entry.published)}));
}
function createStore({token,secret,fetcher=fetch}) {
  async function gh(path,method='GET',data) {
    const response=await fetcher(`https://api.github.com/repos/${repo}/${path}`,{method,headers:{Authorization:`Bearer ${token}`,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','Content-Type':'application/json'},body:data?JSON.stringify(data):undefined,signal:AbortSignal.timeout(18000)});
    if(!response.ok) {if(response.status===409||response.status===422)fail('Une autre modification a été enregistrée. Rechargez les contenus avant de réessayer.',409);fail('Le stockage des contenus est indisponible. Vérifiez la connexion GitHub.',502);}
    return response.json();
  }
  async function snapshot() {
    const ref=await gh('git/ref/heads/main'),head=await gh(`git/commits/${ref.object.sha}`),tree=await gh(`git/trees/${head.tree.sha}?recursive=1`);
    if(tree.truncated)fail('Le dépôt est trop volumineux pour cet éditeur.',503);
    const files=new Map(tree.tree.filter(file=>file.type==='blob').map(file=>[file.path,file]));
    async function read(path){const item=files.get(path);if(!item)return null;const blob=await gh(`git/blobs/${item.sha}`);return Buffer.from(blob.content.replace(/\n/g,''),'base64').toString('utf8');}
    const encoded=await read(statePath);
    let state;
    try{state=encoded?decrypt(encoded,secret):structuredClone(seed);}catch{fail('Impossible de lire les brouillons. Vérifiez la clé CMS_SECRET sans la remplacer.',503);}
    return {head:ref.object.sha,tree:head.tree.sha,files,read,state,version:files.get(statePath)?.sha||'initial'};
  }
  async function load(id){const snap=await snapshot();if(id){const entry=snap.state.entries.find(item=>item.id===id);if(!entry)fail('Contenu introuvable.',404);return {entry,version:snap.version};}return {entries:summaries(snap.state.entries),version:snap.version};}
  async function save(input){
    const snap=await snapshot();if(input.version!==snap.version)fail('Le contenu a changé depuis son ouverture. Rechargez avant d’enregistrer.',409);
    const state=snap.state,entries=state.entries;
    if(!['draft','publish','unpublish','delete'].includes(input.action))fail('Action invalide.');
    const id=cleanText(input.id,100,true),old=entries.find(entry=>entry.id===id);
    const previousPublished=entries.filter(entry=>entry.published).map(entry=>entry.published);
    if(['draft','publish'].includes(input.action)){
      const doc=validate(input.doc);if(doc.id!==id)fail('Identifiant incohérent.');
      if(old&&(old.draft.kind!==doc.kind||old.draft.slug!==doc.slug))fail('Le type et l’adresse d’une page existante ne peuvent pas être modifiés.');
      if(entries.some(entry=>entry.id!==id&&render.pathFor(entry.draft)===render.pathFor(doc)))fail('Cette adresse est déjà utilisée.');
      const existingPath=snap.files.has(render.pathFor(doc));
      if(existingPath&&!previousPublished.some(item=>item.id===id&&render.pathFor(item)===render.pathFor(doc)))fail('Un fichier existe déjà à cette adresse.');
      if(!old&&entries.length>=100)fail('La limite de 100 contenus est atteinte.');
      const entry=old||{id,draft:doc,published:null};entry.draft=doc;
      if(input.action==='publish')entry.published=structuredClone(doc);
      if(!old)entries.push(entry);
    }else{
      if(!old)fail('Contenu introuvable.',404);
      if(input.action==='delete')state.entries=entries.filter(entry=>entry.id!==id);else old.published=null;
    }
    if(Buffer.byteLength(JSON.stringify(state))>12000000)fail('La bibliothèque dépasse 12 Mo. Réduisez le nombre de photos.');
    const writes=new Map([[statePath,encrypt(state,secret)]]),deletions=new Set();
    if(input.action!=='draft'){
      const docs=state.entries.filter(entry=>entry.published).map(entry=>entry.published);
      const paths=new Set(docs.map(render.pathFor));
      previousPublished.forEach(doc=>{if(!paths.has(render.pathFor(doc)))deletions.add(render.pathFor(doc));});
      for(const doc of docs){writes.set(render.pathFor(doc),render.page(doc));for(const img of doc.images){const asset=render.media(img);if(!snap.files.has(asset.path))writes.set(asset.path,asset.bytes);}}
      for(const [kind,path] of [['guide','conseils/index.html'],['realisation','realisations/index.html']]){
        const source=await snap.read(path);if(!source?.includes('<!-- CMS:START -->'))fail('Le modèle de page doit être mis à jour.',503);
        writes.set(path,source.replace(/<!-- CMS:START -->[\s\S]*?<!-- CMS:END -->/,()=>`<!-- CMS:START -->${render.cards(docs.filter(doc=>doc.kind===kind))}<!-- CMS:END -->`));
      }
      let sitemap=await snap.read('sitemap.xml');if(!sitemap)fail('Plan du site absent.',503);
      const managed=new Set([...previousPublished,...docs].map(doc=>'https://travauxcorse.com'+render.urlFor(doc)));
      sitemap=sitemap.replace(/<url>[\s\S]*?<\/url>/g,block=>{const url=/<loc>(.*?)<\/loc>/.exec(block)?.[1];return managed.has(url)?'':block;});
      writes.set('sitemap.xml',sitemap.replace('</urlset>',docs.map(doc=>`<url><loc>https://travauxcorse.com${render.urlFor(doc)}</loc></url>`).join('\n')+'\n</urlset>'));
    }
    const tree=[];
    // Blobs first, then one atomic tree/commit/ref update. No partial publication.
    for(const [path,data] of writes){
      const bytes=Buffer.isBuffer(data)?data:Buffer.from(data);
      const expected=crypto.createHash('sha1').update(Buffer.from(`blob ${bytes.length}\0`)).update(bytes).digest('hex');
      if(snap.files.get(path)?.sha===expected)continue;
      const blob=await gh('git/blobs','POST',{content:Buffer.isBuffer(data)?data.toString('base64'):data,encoding:Buffer.isBuffer(data)?'base64':'utf-8'});tree.push({path,mode:'100644',type:'blob',sha:blob.sha});
    }
    for(const path of deletions)tree.push({path,mode:'100644',type:'blob',sha:null});
    const nextTree=await gh('git/trees','POST',{base_tree:snap.tree,tree});
    const commit=await gh('git/commits','POST',{message:input.action==='draft'?'Enregistrer un brouillon éditorial':'Mettre à jour les publications TravauxCorse',tree:nextTree.sha,parents:[snap.head]});
    await gh('git/refs/heads/main','PATCH',{sha:commit.sha,force:false});
    return {entries:summaries(state.entries),version:tree.find(item=>item.path===statePath).sha,commit:commit.sha,publicationQueued:input.action!=='draft'};
  }
  return {load,save};
}
module.exports={createStore,encrypt,decrypt,validate};
