const crypto=require('node:crypto');
const {list,get,put}=require('@vercel/blob');
const ROOT='artisans/';
const SESSION='__Host-tc-artisan=';
const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
const sign=(value,secret)=>crypto.createHmac('sha256',secret).update(value).digest('base64url');
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
function newInvite(profile){const token=crypto.randomBytes(32).toString('base64url');profile.invites=(profile.invites||[]).filter(x=>x.exp>Date.now()).slice(-9);profile.invites.push({hash:hash(token),exp:Date.now()+7*86400000});return {token,url:'https://travauxcorse-com.vercel.app/artisan/mes-projets/#invitation='+encodeURIComponent(token)};}
function sessionCookie(profile,secret){const payload=Buffer.from(JSON.stringify({id:profile.id,email:profile.email,exp:Date.now()+14*86400000})).toString('base64url');return SESSION+payload+'.'+sign(payload,secret)+'; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=1209600';}
function parseSession(req,secret){
  const value=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(SESSION))?.slice(SESSION.length);
  if(!value)return null;const [payload,signature]=value.split('.');
  if(!payload||!signature||!crypto.timingSafeEqual(Buffer.from(hash(signature)),Buffer.from(hash(sign(payload,secret)))))return null;
  try{const data=JSON.parse(Buffer.from(payload,'base64url'));return data.exp>Date.now()?data:null;}catch{return null;}
}
async function sendEmail(to,subject,body){
  const key=process.env.RESEND_API_KEY,from=process.env.RESEND_FROM;
  if(!key||!from)return {sent:false,reason:'Service d’e-mail à configurer.'};
  const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify({from,to:[to],subject,text:body}),signal:AbortSignal.timeout(12000)});
  if(!response.ok){console.error('Artisan email provider returned HTTP',response.status);return {sent:false,reason:'Le service d’e-mail a refusé la notification.'};}
  return {sent:true};
}
module.exports={hash,readArtisan,listArtisans,saveArtisan,newInvite,sessionCookie,parseSession,sendEmail};
