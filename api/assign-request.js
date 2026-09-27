const crypto=require('node:crypto');
const {get,put}=require('@vercel/blob');
const {cmsSession,cmsConfig}=require('./editorial');
const {normalizeRequest}=require('../lib/project-request');
const send=(res,status,value)=>{res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.end(JSON.stringify(value));};
const match=(a,b)=>{const x=crypto.createHash('sha256').update(String(a)).digest(),y=crypto.createHash('sha256').update(String(b)).digest();return crypto.timingSafeEqual(x,y);};
module.exports=async function(req,res){
  res.setHeader('Cache-Control','private, no-store');res.setHeader('X-Content-Type-Options','nosniff');
  if(req.method!=='POST'){res.setHeader('Allow','POST');return send(res,405,{error:'Méthode non autorisée.'});}
  const config=cmsConfig(),session=config.secret&&config.password?cmsSession(req,config):null;
  if(!session)return send(res,401,{error:'Reconnectez-vous pour affecter ce dossier.'});
  const origin=process.env.CMS_ALLOWED_ORIGIN||'https://travauxcorse-com.vercel.app';
  const csrf=crypto.createHmac('sha256',config.secret).update(session.nonce).digest('base64url');
  if(req.headers.origin!==origin||!match(req.headers['x-csrf-token']||'',csrf)||!/^application\/json(?:;|$)/i.test(req.headers['content-type']||''))return send(res,403,{error:'Session invalide. Rechargez la page.'});
  try{
    let body=req.body;
    if(body===undefined){let raw='';for await(const part of req){raw+=part;if(Buffer.byteLength(raw)>5000)return send(res,413,{error:'Envoi trop volumineux.'});}body=JSON.parse(raw);}
    else if(typeof body==='string')body=JSON.parse(body);
    if(!body||Buffer.byteLength(JSON.stringify(body))>5000)return send(res,413,{error:'Envoi trop volumineux.'});
    const path=body.id;
    if(typeof path!=='string'||!/^requests\/[a-zA-Z0-9/_-]+\.json$/.test(path)||path.includes('//')||path.length>220)return send(res,400,{error:'Dossier invalide.'});
    const blob=await get(path,{access:'private',useCache:false});
    if(!blob||blob.statusCode!==200)return send(res,404,{error:'Dossier introuvable.'});
    const raw=await new Response(blob.stream).text();
    if(raw.length>30000)return send(res,413,{error:'Dossier trop volumineux.'});
    const item=normalizeRequest(JSON.parse(raw));
    if(!item)return send(res,400,{error:'Dossier illisible.'});
    if(body.action==='assign'){
      const name=typeof body.name==='string'?body.name.trim().slice(0,120):'';
      const email=typeof body.email==='string'?body.email.trim().toLowerCase().slice(0,254):'';
      if(!name||!/^\S+@\S+\.\S+$/.test(email))return send(res,400,{error:'Indiquez le nom et une adresse e-mail valide pour l’artisan.'});
      if(item.assignedArtisans.some(a=>a.email.toLowerCase()===email))return send(res,409,{error:'Cet artisan est déjà affecté à ce dossier.'});
      if(item.assignedArtisans.length>=10)return send(res,400,{error:'Ce dossier comporte déjà dix artisans.'});
      item.assignedArtisans.push({id:crypto.randomUUID(),name,email,at:new Date().toISOString()});
    }else if(body.action==='remove'){
      const before=item.assignedArtisans.length;
      item.assignedArtisans=item.assignedArtisans.filter(a=>a.id!==body.assignmentId);
      if(before===item.assignedArtisans.length)return send(res,404,{error:'Affectation introuvable.'});
    }else return send(res,400,{error:'Action non reconnue.'});
    await put(path,JSON.stringify(item),{access:'private',allowOverwrite:true,contentType:'application/json',cacheControlMaxAge:60});
    return send(res,200,{ok:true,assignedArtisans:item.assignedArtisans});
  }catch(error){console.error('Request assignment failed',error?.message);return send(res,error instanceof SyntaxError?400:503,{error:'L’affectation n’a pas pu être enregistrée. Réessayez.'});}
};
