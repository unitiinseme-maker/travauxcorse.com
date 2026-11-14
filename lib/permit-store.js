const {get,put}=require('@vercel/blob');
const PATH='private-permits/state.json';
async function load(){
  // Preserve the stored representation's strong ETag: compressed HTTP responses
  // may expose a weak ETag that cannot be used for a conditional overwrite.
  const r=await get(PATH,{access:'private',useCache:false,headers:{'Accept-Encoding':'identity'}});
  if(!r)return {db:{version:1,records:{},followups:{},sync:{}},etag:null};
  if(r.statusCode!==200)throw new Error('Lecture de la veille impossible.');
  const db=JSON.parse(await new Response(r.stream).text());
  if(db.version!==1||!db.records||!db.followups)throw new Error('Format de stockage inconnu.');
  return {db,etag:r.blob.etag};
}
async function save(db,etag){return put(PATH,JSON.stringify(db),{access:'private',addRandomSuffix:false,contentType:'application/json',cacheControlMaxAge:60,...(etag?{ifMatch:etag}:{allowOverwrite:false})});}
function conflict(e){return /precondition|already exists|etag|condition/i.test(`${e.name} ${e.message}`);}
async function mutate(fn){for(let attempt=0;attempt<5;attempt++){const {db,etag}=await load();const result=await fn(db);try{await save(db,etag);return result;}catch(e){if(!conflict(e))throw e;if(attempt===4)console.error('Permit conditional write failed',e.name,{weakEtag:String(etag).startsWith('W/'),hasEtag:!!etag});await new Promise(resolve=>setTimeout(resolve,100*(attempt+1)));}}const e=new Error('Modification simultanée : rechargez puis réessayez.');e.status=409;throw e;}
module.exports={load,mutate};
