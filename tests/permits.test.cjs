const {test}=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const {normalize,mergeRecords,queryRecords,analyze,publicColumn}=require('../lib/permit-model');
// Minimal project-only extract from the official 2026-10 logement file, fetched 2026-11-14.
const raw={COMM:'2A004',DEP_CODE:'2A',TYPE_DAU:'PC',NUM_DAU:'02A0042600044',ETAT_DAU:2,DATE_REELLE_AUTORISATION:'2026-08-20',NATURE_PROJET_COMPLETEE:1,NB_LGT_TOT_CREES:1,NB_LGT_COL_CREES:0,NB_LGT_IND_CREES:1,SURF_HAB_CREEE:151,SURF_LOC_CREEE:0,I_PISCINE:true};
const source={rid:'8b35affb-55fc-4c1f-915b-7750f974446a',vintage:'2026-10',url:'https://www.statistiques.developpement-durable.gouv.fr/'};
const p=normalize(raw,source,{'2A004':'Ajaccio'}),now='2026-11-14T12:00:00.000Z';
test('real source record stays project-only and receives conditional trade suggestions',()=>{
  for(const k of ['DENOM_DEM','SIREN_DEM','CODPOST_DEM','LOCALITE_DEM'])assert.equal(publicColumn(k),false);
  assert.equal(p.potentialLabel,'Élevé');assert.equal(p.homes,1);assert.equal(p.area,151);
  assert(p.trades.some(t=>t.name==='Piscine'));assert(!p.trades.some(t=>t.name==='Photovoltaïque'));
  assert.equal(analyze({},'PC').area,null);assert.equal(analyze({},'PC').homes,null);
  assert.equal(analyze({SURF_HAB_CREEE:10,NATURE_PROJET_COMPLETEE:5},'PC').potential,0);
  assert.equal(analyze({NB_LGT_TOT_CREES:15},'PC').potential,3);
  assert.deepEqual(analyze({},'PD').trades.map(t=>t.name),['Démolition & Dépose']);
  assert.throws(()=>normalize({...raw,DEP_CODE:'75'},source));
});
test('repeat imports and cross-file duplicates retain ID, first retrieval and update history',()=>{
  const first=mergeRecords({},[p,p],now);assert.equal(first.added,1);
  const again=mergeRecords(first.records,[p], '2026-11-15T12:00:00Z');assert.equal(again.added,0);assert.equal(again.changed,0);assert.equal(again.records[p.id].firstSeen,now);
  const correction=normalize({...raw,ETAT_DAU:4},source,{'2A004':'Ajaccio'});
  const updated=mergeRecords(first.records,[correction],'2026-11-16T12:00:00Z');assert.equal(updated.changed,1);assert.equal(updated.records[p.id].status,'Annulé');assert.equal(updated.records[p.id].firstSeen,now);
  assert.equal(queryRecords({records:updated.records},new URLSearchParams()).total,0);
  assert.equal(queryRecords({records:updated.records},new URLSearchParams('includeInactive=1')).total,1);
});
test('filters, dates, null numerical values, seen status and commercial indicators',()=>{
  const records=mergeRecords({},[p],now).records,db={records,followups:{[p.id]:{status:'À contacter',seenAt:now,firstAnalysis:now}}};
  const q=s=>queryRecords(db,new URLSearchParams(s),new Date(now));
  assert.equal(q('dept=2A&q=ajaccio&areaMin=150&homesMax=1&type=PC&potential=2&seen=seen').total,1);
  assert.equal(q('dept=2B').total,0);assert.equal(q('seen=new').total,0);assert.equal(q('areaMin=152').total,0);assert.equal(q('from=2026-09-01').total,0);
  assert.equal(q('status='+encodeURIComponent('À contacter')).total,1);
  assert.equal(q('').stats.days90,1);assert.equal(q('').stats.days30,0);assert.equal(q('').stats.treated,1);
});
const blob=require('@vercel/blob'),entries=new Map();let writes=0;
blob.get=async path=>entries.has(path)?{statusCode:200,blob:{etag:entries.get(path).etag},stream:new Blob([entries.get(path).text]).stream()}:null;
blob.put=async(path,value,options)=>{assert.equal(options.access,'private');const old=entries.get(path);if((options.ifMatch&&old?.etag!==options.ifMatch)||(!options.allowOverwrite&&!options.ifMatch&&old))throw new Error('precondition failed: already exists');const etag=String(++writes);entries.set(path,{text:String(value),etag});return {etag};};
const handler=require('../lib/permit-api'),cron=require('../lib/permit-cron');
const secret='s'.repeat(64),password='test-only-not-a-production-password';process.env.CMS_SECRET=secret;process.env.CMS_ADMIN_PASSWORD=password;
const payload=Buffer.from(JSON.stringify({exp:Date.now()+360000,nonce:'permit-test',password:crypto.createHash('sha256').update(password).digest('hex')})).toString('base64url');
const cookie='__Host-tc-editor='+payload+'.'+crypto.createHmac('sha256',secret).update(payload).digest('base64url');
const csrf=crypto.createHmac('sha256',secret).update('permit-test').digest('base64url');
const headers={cookie,'x-csrf-token':csrf,origin:'https://www.travauxcorse.com',host:'www.travauxcorse.com','content-type':'application/json'};
function call(method,url,body,head={},fn=handler){return new Promise((resolve,reject)=>{const response={headers:{},setHeader(k,v){this.headers[k]=v;},end(v){resolve({status:this.statusCode||200,data:JSON.parse(v),headers:this.headers});}};fn({method,url,body,headers:head},response).catch(reject);});}
test('admin-only boundary, CSRF, detail, persisted follow-up, concurrent edit and idempotent conversion',async()=>{
  const db={version:1,records:mergeRecords({},[p],now).records,followups:{},sync:{}};entries.set('private-permits/state.json',{text:JSON.stringify(db),etag:'initial'});
  assert.equal((await call('GET','/api/permits')).status,401);assert.equal((await call('POST','/api/permits',{action:'sync'})).status,401);
  assert.equal((await call('GET','/api/submissions?view=permits',null,{},require('../api/submissions'))).status,401);
  assert.equal((await call('GET','/api/submissions?view=permits-sync',null,{},require('../api/submissions'))).status,401);
  assert.equal((await call('GET','/api/permits',null,{cookie:'__Host-tc-editor=forged'})).status,401);
  assert.equal((await call('GET','/api/permits-sync',null,{},cron)).status,401);
  assert.equal((await call('POST','/api/permits',{action:'seen',id:p.id},{...headers,'x-csrf-token':'wrong'})).status,403);
  assert.equal((await call('POST','/api/permits',{action:'seen',id:p.id},{...headers,origin:'https://example.org'})).status,403);
  const detail=await call('GET','/api/permits?id='+p.id,null,headers);assert.equal(detail.status,200);assert.equal(detail.data.permit.commune,'Ajaccio');assert.match(detail.headers['Cache-Control'],/no-store/);
  assert.equal((await call('POST','/api/permits',{action:'seen',id:p.id},headers)).status,200);
  const save=await call('POST','/api/permits',{action:'save',id:p.id,status:'À contacter',notes:'Essai isolé du suivi',version:0},headers);assert.equal(save.status,200);
  assert.equal((await call('POST','/api/permits',{action:'save',id:p.id,status:'À étudier',version:0},headers)).status,409);
  const reread=await call('GET','/api/permits?id='+p.id,null,headers);assert.equal(reread.data.followup.notes,'Essai isolé du suivi');
  for(let i=0;i<2;i++)assert.equal((await call('POST','/api/permits',{action:'project',id:p.id},headers)).status,200);
  const projects=[...entries.keys()].filter(k=>k.startsWith('requests/'));assert.equal(projects.length,1);const project=JSON.parse(entries.get(projects[0]).text);assert.equal(project.email,'');assert.equal(project.phone,'');assert.equal(project.name,'');assert.equal(project.assignedArtisans.length,0);
});
