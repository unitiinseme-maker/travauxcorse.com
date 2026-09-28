const crypto=require('node:crypto');
const {cmsConfig,cmsSession}=require('./editorial');
const {loadCategories,saveCategories}=require('../lib/category-store');
const send=(res,status,value)=>{res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.end(JSON.stringify(value));};
module.exports=async function(req,res){
  res.setHeader('Cache-Control','private, no-store, max-age=0');
  res.setHeader('X-Content-Type-Options','nosniff');
  const admin=new URL(req.url,'https://localhost').searchParams.get('admin')==='1';
  const config=cmsConfig();
  const auth=admin||req.method!=='GET'?config.secret&&config.password?cmsSession(req,config):null:null;
  if(req.method==='GET'){
    if(admin&&!auth)return send(res,401,{error:'Connexion administrateur nécessaire.'});
    try{
      const categories=await loadCategories();
      return send(res,200,admin?categories:categories.filter(item=>item.active).sort((a,b)=>a.order-b.order).map(({id,name,order})=>({id,name,order})));
    }catch(error){console.error('Category read failed',error?.message);return send(res,503,{error:'Les catégories sont momentanément indisponibles. Réessayez.'});}
  }
  if(req.method!=='POST'){res.setHeader('Allow','GET, POST');return send(res,405,{error:'Méthode non autorisée.'});}
  if(!auth)return send(res,401,{error:'Connexion administrateur nécessaire.'});
  const expected=crypto.createHmac('sha256',config.secret).update(auth.nonce).digest('base64url');
  const origin=process.env.CMS_ALLOWED_ORIGIN||'https://travauxcorse-com.vercel.app';
  if(req.headers.origin!==origin||req.headers['x-csrf-token']!==expected||!/^application\/json(?:;|$)/i.test(req.headers['content-type']||''))return send(res,403,{error:'Session invalide. Rechargez la page.'});
  try{
    let body=req.body;
    if(body===undefined){let raw='';for await(const part of req){raw+=part;if(Buffer.byteLength(raw)>50000)return send(res,413,{error:'Liste trop volumineuse.'});}body=JSON.parse(raw);}
    else if(typeof body==='string')body=JSON.parse(body);
    if(!Array.isArray(body?.categories)||body.categories.length>150)return send(res,400,{error:'Liste de catégories invalide.'});
    const ids=new Set(),labels=new Set();
    const categories=body.categories.map((item,index)=>{
      const id=typeof item?.id==='string'?item.id:'';
      const name=typeof item?.name==='string'?item.name.trim():'';
      if(!/^[a-z0-9][a-z0-9-]{0,79}$/.test(id)||!name||name.length>100||typeof item.active!=='boolean'||ids.has(id)||labels.has(name.toLocaleLowerCase('fr')))throw Error('Une catégorie comporte un nom ou un identifiant invalide ou en double.');
      ids.add(id);labels.add(name.toLocaleLowerCase('fr'));
      return {id,name,order:index+1,active:item.active};
    });
    await saveCategories(categories);return send(res,200,{categories});
  }catch(error){
    if(error instanceof SyntaxError||error.message.startsWith('Une catégorie'))return send(res,400,{error:error instanceof SyntaxError?'JSON invalide.':error.message});
    console.error('Category write failed',error?.message);return send(res,503,{error:'Enregistrement impossible. Réessayez.'});
  }
};
