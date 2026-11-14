const {get,put}=require('@vercel/blob');
const PATH='private-permits/state.json';
async function load(){
  const r=await get(PATH,{access:'private',useCache:false});
  if(!r)return {db:{version:1,records:{},followups:{},sync:{}},etag:null};
  if(r.statusCode!==200)throw new Error('Lecture de la veille impossible.');
  const db=JSON.parse(await new Response(r.stream).text());
  if(db.version!==1||!db.records||!db.followups)throw new Error('Format de stockage inconnu.');
  return {db,etag:r.blob.etag};
}
async function save(db,etag){return put(PATH,JSON.stringify(db),{access:'private',addRandomSuffix:false,contentType:'application/json',cacheControlMaxAge:60,...(etag?{ifMatch:etag}:{allowOverwrite:false})});}
function conflict(e){return /precondition|already exists|etag|condition/i.test(`${e.name} ${e.message}`);}
async function mutate(fn){for(let attempt=0;attempt<5;attempt++){const {db,etag}=await load();const result=await fn(db);try{await save(db,etag);return result;}catch(e){if(!conflict(e))throw e;}}const e=new Error('Modification simultanée : rechargez puis réessayez.');e.status=409;throw e;}
module.exports={load,mutate};
