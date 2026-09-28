const crypto=require('node:crypto');
const {cmsSession,cmsConfig}=require('./editorial');
const {readPartner,listPartners,savePartner,deletePartner}=require('../lib/partner-store');
const send=(res,status,value)=>{res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.end(JSON.stringify(value));};
const fields={name:120,category:100,zone:150,email:254,phone:50,website:300,description:600,specialties:250};
const text=(value,max)=>typeof value==='string'?value.trim().slice(0,max):'';
function image(value){
  if(!value)return '';
  if(typeof value!=='string'||value.length>420000)throw Error('Photo trop volumineuse (300 Ko maximum).');
  const match=/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if(!match)throw Error('Utilisez une image JPEG, PNG ou WebP.');
  const bytes=Buffer.from(match[2],'base64');
  if(bytes.length>300000||bytes.length<16)throw Error('Photo trop volumineuse (300 Ko maximum).');
  const valid=match[1]==='jpeg'&&bytes.subarray(0,3).equals(Buffer.from([255,216,255]))||match[1]==='png'&&bytes.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex'))||match[1]==='webp'&&bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP';
  if(!valid)throw Error('Le format de la photo est invalide.');
  return value;
}
module.exports=async function(req,res){
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
  const config=cmsConfig(),auth=config.secret&&config.password?cmsSession(req,config):null;
  const admin=new URL(req.url,'https://localhost').searchParams.get('admin')==='1';
  if(req.method==='GET'){
    if(admin&&!auth)return send(res,401,{error:'Connexion administrateur nécessaire.'});
    try{const partners=await listPartners();return send(res,200,{partners:admin?partners:partners.filter(p=>p.active)});}
    catch(error){console.error('Partner list failed',error?.message);return send(res,503,{error:'Nos partenaires sont momentanément indisponibles.'});}
  }
  if(req.method!=='POST'){res.setHeader('Allow','GET, POST');return send(res,405,{error:'Méthode non autorisée.'});}
  if(!auth)return send(res,401,{error:'Connexion administrateur nécessaire.'});
  const expected=crypto.createHmac('sha256',config.secret).update(auth.nonce).digest('base64url');
  const origin=process.env.CMS_ALLOWED_ORIGIN||'https://travauxcorse-com.vercel.app';
  if(req.headers.origin!==origin||req.headers['x-csrf-token']!==expected||!/^application\/json(?:;|$)/i.test(req.headers['content-type']||''))return send(res,403,{error:'Session invalide. Rechargez la page.'});
  try{
    let body=req.body;
    if(body===undefined){let raw='';for await(const part of req){raw+=part;if(Buffer.byteLength(raw)>500000)return send(res,413,{error:'Photo trop volumineuse.'});}body=JSON.parse(raw);}
    else if(typeof body==='string')body=JSON.parse(body);
    if(!body||typeof body!=='object'||Buffer.byteLength(JSON.stringify(body))>500000)return send(res,413,{error:'Envoi trop volumineux.'});
    if(body.action==='delete'){
      if(!await readPartner(body.id))return send(res,404,{error:'Partenaire introuvable.'});
      await deletePartner(body.id);return send(res,200,{deleted:true});
    }
    if(body.action==='toggle'){
      const partner=await readPartner(body.id);if(!partner)return send(res,404,{error:'Partenaire introuvable.'});
      partner.active=!partner.active;await savePartner(partner);return send(res,200,{partner});
    }
    if(body.action!=='save')return send(res,400,{error:'Action inconnue.'});
    const previous=body.id?await readPartner(body.id):null;
    if(body.id&&!previous)return send(res,404,{error:'Partenaire introuvable.'});
    const partner={...(previous||{id:crypto.randomUUID(),active:false,createdAt:new Date().toISOString()})};
    for(const [key,max] of Object.entries(fields))partner[key]=text(body[key],max);
    if(!partner.name||!partner.category)return send(res,400,{error:'Renseignez le nom et la catégorie.'});
    if(partner.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(partner.email))return send(res,400,{error:'Adresse e-mail invalide.'});
    if(partner.website){try{const url=new URL(partner.website);if(url.protocol!=='https:'||url.username||url.password)throw Error();partner.website=url.href;}catch{return send(res,400,{error:'Le site internet doit commencer par https://.'});}}
    try{partner.image=body.image===undefined?previous?.image||'':image(body.image);}catch(error){return send(res,400,{error:error.message});}
    partner.updatedAt=new Date().toISOString();
    await savePartner(partner);return send(res,200,{partner});
  }catch(error){console.error('Partner write failed',error?.message);return send(res,error instanceof SyntaxError?400:503,{error:'Enregistrement impossible. Réessayez.'});}
};
