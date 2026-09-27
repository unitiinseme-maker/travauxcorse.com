const crypto=require('node:crypto');
const {cmsSession,cmsConfig}=require('./editorial');
const {listArtisans,readArtisan,saveArtisan,newInvite,emailConfigured,sendEmail}=require('../lib/artisan-accounts');
const send=(res,status,data)=>{res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.end(JSON.stringify(data));};
const publicProfile=p=>({id:p.id,name:p.name,email:p.email,trades:p.trades,active:p.active,createdAt:p.createdAt});
module.exports=async function(req,res){
  res.setHeader('Cache-Control','private, no-store');res.setHeader('X-Content-Type-Options','nosniff');
  const config=cmsConfig(),session=config.secret&&config.password?cmsSession(req,config):null;
  if(!session)return send(res,401,{error:'Connexion administrateur nécessaire.'});
  if(req.method==='GET'){
    try{return send(res,200,{artisans:(await listArtisans()).map(publicProfile),emailConfigured:emailConfigured()});}
    catch(error){console.error('Artisan directory read failed',error?.message);return send(res,503,{error:'Répertoire momentanément indisponible.'});}
  }
  if(req.method!=='POST'){res.setHeader('Allow','GET, POST');return send(res,405,{error:'Méthode non autorisée.'});}
  const origin=process.env.CMS_ALLOWED_ORIGIN||'https://travauxcorse-com.vercel.app';
  const expected=crypto.createHmac('sha256',config.secret).update(session.nonce).digest('base64url');
  if(req.headers.origin!==origin||req.headers['x-csrf-token']!==expected||!/^application\/json(?:;|$)/i.test(req.headers['content-type']||''))return send(res,403,{error:'Session invalide. Rechargez la page.'});
  try{
    let body=req.body;
    if(body===undefined){let raw='';for await(const part of req){raw+=part;if(Buffer.byteLength(raw)>5000)return send(res,413,{error:'Envoi trop volumineux.'});}body=JSON.parse(raw);}
    else if(typeof body==='string')body=JSON.parse(body);
    if(!body||Buffer.byteLength(JSON.stringify(body))>5000)return send(res,413,{error:'Envoi trop volumineux.'});
    let profile;
    if(body.action==='add'){
      const name=typeof body.name==='string'?body.name.trim().slice(0,120):'';
      const email=typeof body.email==='string'?body.email.trim().toLowerCase().slice(0,254):'';
      const trades=typeof body.trades==='string'?body.trades.trim().slice(0,300):'';
      if(!name||!trades||!/^\S+@\S+\.\S+$/.test(email))return send(res,400,{error:'Indiquez le nom, l’e-mail et le métier de l’artisan.'});
      if((await listArtisans()).some(p=>p.email===email))return send(res,409,{error:'Cet e-mail est déjà enregistré.'});
      profile={id:crypto.randomUUID(),name,email,trades,active:true,createdAt:new Date().toISOString()};
    }else if(body.action==='invite'){
      profile=await readArtisan(body.id);
      if(!profile||!profile.active)return send(res,404,{error:'Artisan introuvable.'});
    }else return send(res,400,{error:'Action inconnue.'});
    const invite=newInvite(profile);
    await saveArtisan(profile);
    let delivery={sent:false};
    try{delivery=await sendEmail(profile.email,'Votre accès aux projets TravauxCorse','Bonjour '+profile.name+',\n\nVoici votre accès personnel aux projets qui vous seront affectés :\n'+invite.url+'\n\nCe lien est valable 7 jours.\n\nTravauxCorse');}
    catch(error){console.error('Artisan invitation delivery failed',error?.message);}
    return send(res,200,{artisan:publicProfile(profile),invitationSent:delivery.sent,inviteUrl:delivery.sent?undefined:invite.url});
  }catch(error){console.error('Artisan directory write failed',error?.message);return send(res,503,{error:'Impossible d’enregistrer cet artisan.'});}
};
