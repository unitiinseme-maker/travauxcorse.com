const nodemailer=require('nodemailer');
const {list,get,put}=require('@vercel/blob');
const ROOT='artisans/';
async function readArtisan(id){
  if(typeof id!=='string'||!/^[-a-f0-9]{36}$/.test(id))return null;
  const result=await get(ROOT+id+'.json',{access:'private',useCache:false});
  if(!result||result.statusCode!==200)return null;
  const text=await new Response(result.stream).text();return text.length<=5000?JSON.parse(text):null;
}
async function listArtisans(){
  const paths=[];let cursor;
  do{const page=await list({prefix:ROOT,limit:1000,cursor});paths.push(...page.blobs.map(x=>x.pathname).filter(x=>/^artisans\/[-a-f0-9]{36}\.json$/.test(x)));cursor=page.hasMore?page.cursor:undefined;}while(cursor&&paths.length<1000);
  const items=[];
  for(let i=0;i<paths.length;i+=8){const batch=await Promise.all(paths.slice(i,i+8).map(p=>readArtisan(p.slice(ROOT.length,-5))));items.push(...batch.filter(Boolean));}
  return items.sort((a,b)=>a.name.localeCompare(b.name,'fr'));
}
async function saveArtisan(profile){await put(ROOT+profile.id+'.json',JSON.stringify(profile),{access:'private',allowOverwrite:true,contentType:'application/json',cacheControlMaxAge:60});}
function gmailPassword(){const value=process.env.GMAIL_APP_PASSWORD?.replace(/\s/g,'');return value&&value!=='A_RENSEIGNER'?value:null;}
function emailConfigured(){return !!((process.env.RESEND_API_KEY&&process.env.RESEND_FROM)||gmailPassword());}
async function sendEmail(to,subject,body){
  const key=process.env.RESEND_API_KEY,from=process.env.RESEND_FROM;
  if((!key||!from)&&gmailPassword()){
    const password=gmailPassword();
    const transporter=nodemailer.createTransport({host:'smtp.gmail.com',port:465,secure:true,auth:{user:'contact.travauxcorse@gmail.com',pass:password},connectionTimeout:12000,greetingTimeout:12000,socketTimeout:12000});
    try{
      await transporter.sendMail({from:'TravauxCorse <contact.travauxcorse@gmail.com>',replyTo:'contact.travauxcorse@gmail.com',to,subject,text:body});
      return {sent:true};
    }catch(error){console.error('Artisan email SMTP failed',{code:error?.code,responseCode:error?.responseCode,appPasswordFormatValid:/^[A-Za-z0-9]{16}$/.test(password)});return {sent:false,reason:'L’envoi par Gmail a échoué. Vérifiez le mot de passe d’application.'};}
    finally{transporter.close();}
  }
  if(!key||!from)return {sent:false,reason:'Service d’e-mail à configurer.'};
  const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify({from,reply_to:'contact.travauxcorse@gmail.com',to:[to],subject,text:body}),signal:AbortSignal.timeout(12000)});
  if(!response.ok){console.error('Artisan email provider returned HTTP',response.status);return {sent:false,reason:'Le service d’e-mail a refusé la notification.'};}
  return {sent:true};
}
module.exports={readArtisan,listArtisans,saveArtisan,emailConfigured,sendEmail};
