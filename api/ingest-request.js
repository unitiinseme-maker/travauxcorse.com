const crypto=require('node:crypto');
const {put}=require('@vercel/blob');
const {normalizeRequest}=require('../lib/project-request');
const reply=(res,status,value)=>{res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.end(JSON.stringify(value));};
module.exports=async function(req,res){
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
  if(req.method!=='POST'){res.setHeader('Allow','POST');return reply(res,405,{error:'Méthode non autorisée.'});}
  if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']||''))return reply(res,415,{error:'Format non pris en charge.'});
  if(Number(req.headers['content-length']||0)>30000)return reply(res,413,{error:'Envoi trop volumineux.'});
  if(!process.env.BLOB_STORE_ID&&!process.env.BLOB_READ_WRITE_TOKEN)return reply(res,503,{error:'Stockage indisponible.'});
  try{
    let body=req.body;
    if(body===undefined){let raw='';for await(const part of req){raw+=part;if(Buffer.byteLength(raw)>30000)return reply(res,413,{error:'Envoi trop volumineux.'});}body=JSON.parse(raw);}
    else if(typeof body==='string')body=JSON.parse(body);
    if(Buffer.byteLength(JSON.stringify(body))>30000)return reply(res,413,{error:'Envoi trop volumineux.'});
    const item=normalizeRequest(body);
    if(!item||!/^\S+@\S+\.\S+$/.test(item.email)||!item.commune)return reply(res,400,{error:'Demande invalide.'});
    const path=`requests/${new Date().toISOString().slice(0,10)}/${crypto.randomUUID()}.json`;
    await put(path,JSON.stringify(item),{access:'private',contentType:'application/json',addRandomSuffix:false});
    return reply(res,200,{ok:true});
  }catch(error){console.error('Request ingestion failed',error?.message);return reply(res,error instanceof SyntaxError?400:503,{error:'Enregistrement temporairement impossible.'});}
};
