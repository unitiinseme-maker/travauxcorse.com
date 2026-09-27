const crypto=require('node:crypto');
const {put}=require('@vercel/blob');
const {normalizeRequest}=require('../lib/project-request');
const reply=(res,status,value)=>{res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.end(JSON.stringify(value));};
const accepted=(res)=>reply(res,200,{ok:true});
const MAX_BODY=200000;
function parse(raw){
  try{return JSON.parse(raw);}catch{
    const fields=new URLSearchParams(raw);
    if(!fields.has('form_data'))return null;
    try{return {form_data:JSON.parse(fields.get('form_data'))};}catch{return null;}
  }
}
module.exports=async function(req,res){
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
  if(req.method!=='POST'){res.setHeader('Allow','POST');return reply(res,405,{error:'Méthode non autorisée.'});}
  // The notification must never fail merely because the private copy cannot be made.
  try{
    let body=req.body;
    if(body===undefined){let raw='';for await(const part of req){raw+=part;if(Buffer.byteLength(raw)>MAX_BODY){console.error('Request webhook body too large');return accepted(res);}}body=parse(raw);}
    else if(typeof body==='string')body=parse(body);
    else if(Buffer.byteLength(JSON.stringify(body))>MAX_BODY){console.error('Request webhook body too large');return accepted(res);}
    const item=normalizeRequest(body);
    if(!item||!/^\S+@\S+\.\S+$/.test(item.email)||!item.commune){
      console.error('Request webhook format not recognized',{
        contentType:String(req.headers['content-type']||'').slice(0,80),
        keys:body&&typeof body==='object'?Object.keys(body).slice(0,25):[],
        formKeys:body?.form_data&&typeof body.form_data==='object'?Object.keys(body.form_data).slice(0,25):[],
        missing:item?['email','commune','trades','name','title'].filter(key=>!item[key]):['unrecognized-payload']
      });
      return accepted(res);
    }
    if(!process.env.BLOB_STORE_ID&&!process.env.BLOB_READ_WRITE_TOKEN){console.error('Private request store not connected');return accepted(res);}
    const path=`requests/${new Date().toISOString().slice(0,10)}/${crypto.randomUUID()}.json`;
    await put(path,JSON.stringify(item),{access:'private',contentType:'application/json',addRandomSuffix:false});
    return accepted(res);
  }catch(error){console.error('Request ingestion failed',error?.message);return accepted(res);}
};
