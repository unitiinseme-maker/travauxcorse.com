const crypto=require('node:crypto');
const {allowedAdminOrigin}=require('../lib/site-config');
const {cmsConfig,cmsSession}=require('./editorial');
const {loadSocialLinks,saveSocialLinks}=require('../lib/social-store');
function send(res,status,data){res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.end(JSON.stringify(data));}
module.exports=async function(req,res){
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
  if(req.method==='GET'){
    try{return send(res,200,await loadSocialLinks());}catch{return send(res,503,{error:'Réseaux sociaux momentanément indisponibles.'});}
  }
  if(req.method!=='POST'){res.setHeader('Allow','GET, POST');return send(res,405,{error:'Méthode non autorisée.'});}
  const config=cmsConfig(),auth=config.secret&&config.password?cmsSession(req,config):null;
  if(!auth)return send(res,401,{error:'Connexion administrateur nécessaire.'});
  const csrf=crypto.createHmac('sha256',config.secret).update(auth.nonce).digest('base64url');
  if(!allowedAdminOrigin(req)||req.headers['x-csrf-token']!==csrf||!/^application\/json(?:;|$)/i.test(req.headers['content-type']||''))return send(res,403,{error:'Session invalide. Rechargez la page.'});
  try{
    let body=req.body;
    if(body===undefined){let raw='';for await(const part of req){raw+=part;if(Buffer.byteLength(raw)>10000)return send(res,413,{error:'Contenu trop volumineux.'});}body=JSON.parse(raw);}
    else if(typeof body==='string')body=JSON.parse(body);
    if(!body||typeof body.facebook!=='string'||typeof body.instagram!=='string')return send(res,400,{error:'Renseignez les deux champs, vides si nécessaire.'});
    return send(res,200,await saveSocialLinks(body));
  }catch(error){return send(res,error instanceof TypeError||error instanceof SyntaxError?400:503,{error:error instanceof TypeError?error.message:'Enregistrement impossible. Réessayez.'});}
};
