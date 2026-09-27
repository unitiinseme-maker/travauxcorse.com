const {list,get}=require('@vercel/blob');
const crypto=require('node:crypto');
const {cmsSession,cmsConfig}=require('./editorial');
const {normalizeRequest}=require('../lib/project-request');
const json=(res,status,value)=>{res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.end(JSON.stringify(value));};
module.exports=async function(req,res){
  res.setHeader('Cache-Control','private, no-store');
  res.setHeader('X-Content-Type-Options','nosniff');
  if(req.method!=='GET'){res.setHeader('Allow','GET');return json(res,405,{error:'Méthode non autorisée.'});}
  const config=cmsConfig();
  const session=config.secret&&config.password?cmsSession(req,config):null;
  if(!session)return json(res,401,{error:'Connectez-vous avec le mot de passe privé de publication.'});
  if(!process.env.BLOB_STORE_ID&&!process.env.BLOB_READ_WRITE_TOKEN)return json(res,503,{setup:true,error:'Le stockage privé des demandes doit être connecté au projet Vercel.'});
  try{
    const paths=[];let cursor;
    do{
      const page=await list({prefix:'requests/',limit:1000,cursor});
      paths.push(...page.blobs.map(blob=>blob.pathname).filter(path=>path.endsWith('.json')));
      cursor=page.hasMore?page.cursor:undefined;
    }while(cursor&&paths.length<5000);
    const results=[];
    for(let i=0;i<paths.length;i+=8){
      const batch=await Promise.all(paths.slice(i,i+8).map(async path=>{
        const blob=await get(path,{access:'private',useCache:false});
        if(!blob||blob.statusCode!==200)return null;
        const raw=await new Response(blob.stream).text();
        const item=raw.length<30000?normalizeRequest(JSON.parse(raw)):null;
        return item?{...item,id:path}:null;
      }));
      results.push(...batch.filter(Boolean));
    }
    results.sort((a,b)=>b.date.localeCompare(a.date));
    const csrf=crypto.createHmac('sha256',config.secret).update(session.nonce).digest('base64url');
    return json(res,200,{requests:results.slice(0,500),csrf,updatedAt:new Date().toISOString()});
  }catch(error){console.error('Private request store unavailable',error?.message);return json(res,502,{error:'Le stockage privé des demandes est momentanément indisponible. Les notifications par e-mail restent actives.'});}
};
