const {sendEmail,emailConfigured}=require('../lib/artisan-accounts');
const EMAIL='contact.travauxcorse@gmail.com';
const MAX_BODY=7000;
function reply(req,res,status,value){
  res.statusCode=status;
  if(/text\/html/.test(req.headers.accept||'')&&!/application\/json/.test(req.headers.accept||'')){
    res.setHeader('Content-Type','text/html; charset=utf-8');
    const message=status===200?'Merci, votre candidature a bien été envoyée à TravauxCorse. Nous reviendrons vers vous rapidement.':'Votre candidature n’a pas pu être envoyée. Revenez au formulaire ou contactez TravauxCorse par e-mail.';
    return res.end('<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Candidature | TravauxCorse</title><main style="max-width:600px;margin:12vh auto;padding:24px;font:18px/1.6 system-ui;color:#24211e"><h1>TravauxCorse</h1><p>'+message+'</p><a href="/devenir-partenaire/">Retour au site</a></main></html>');
  }
  res.setHeader('Content-Type','application/json; charset=utf-8');return res.end(JSON.stringify(value));
}
const field=(value,max)=>typeof value==='string'?value.trim().slice(0,max):'';
module.exports=async function(req,res){
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
  if(req.method!=='POST'){res.setHeader('Allow','POST');return reply(req,res,405,{error:'Méthode non autorisée.'});}
  const hostname=(req.headers.host||'').toLowerCase();
  if(!hostname||req.headers.origin!==`https://${hostname}`)return reply(req,res,403,{error:'Origine non autorisée. Rechargez le formulaire.'});
  try{
    let body=req.body;
    if(body===undefined){let raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>MAX_BODY)return reply(req,res,413,{error:'Candidature trop volumineuse.'});}
      body=/application\/json/i.test(req.headers['content-type']||'')?JSON.parse(raw):Object.fromEntries(new URLSearchParams(raw));
    }else if(typeof body==='string')body=/application\/json/i.test(req.headers['content-type']||'')?JSON.parse(body):Object.fromEntries(new URLSearchParams(body));
    if(!body||typeof body!=='object'||Buffer.byteLength(JSON.stringify(body))>MAX_BODY)return reply(req,res,413,{error:'Candidature trop volumineuse.'});
    const company=field(body.company,120),manager=field(body.manager,120),email=field(body.email,254),phone=field(body.phone,25),trade=field(body.trade,120),zone=field(body.zone,80),message=field(body.message,2500);
    if(!company||!manager||!trade||!zone||body.contactConsent!=='oui'||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!/^\+?[\d\s().-]{8,25}$/.test(phone))return reply(req,res,400,{error:'Vérifiez les coordonnées, le métier, la zone et votre accord de contact.'});
    if(!emailConfigured())return reply(req,res,503,{error:'L’envoi est momentanément indisponible. Contactez contact.travauxcorse@gmail.com.'});
    const content=['Nouvelle candidature partenaire TravauxCorse','',`Entreprise : ${company}`,`Responsable : ${manager}`,`E-mail : ${email}`,`Téléphone : ${phone}`,`Métier principal : ${trade}`,`Zone : ${zone}`,`Présentation : ${message||'Non renseignée'}`,'Accord de contact : Oui'].join('\n');
    const result=await sendEmail(EMAIL,'TravauxCorse — Nouvelle candidature partenaire',content);
    if(!result.sent)return reply(req,res,502,{error:'L’envoi a échoué. Réessayez ou contactez TravauxCorse par e-mail.'});
    return reply(req,res,200,{sent:true});
  }catch(error){console.error('Partner application delivery failed',error?.message);return reply(req,res,error instanceof SyntaxError?400:503,{error:'Envoi impossible pour le moment. Réessayez plus tard.'});}
};
