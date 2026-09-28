const crypto=require('node:crypto');
const {get,put}=require('@vercel/blob');
const COOKIE='__Host-tc-client=';
const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
const sign=(payload,secret)=>crypto.createHmac('sha256',secret).update(payload).digest('base64url');
const profilePath=email=>'clients/'+hash(email.toLowerCase())+'.json';
async function readProfile(email){
  const blob=await get(profilePath(email),{access:'private',useCache:false});
  if(!blob||blob.statusCode!==200)return null;
  const raw=await new Response(blob.stream).text();
  return raw.length<5000?JSON.parse(raw):null;
}
async function saveProfile(profile){
  await put(profilePath(profile.email),JSON.stringify(profile),{access:'private',allowOverwrite:true,contentType:'application/json',cacheControlMaxAge:60});
}
function newInvite(profile){
  const token=crypto.randomBytes(32).toString('base64url');
  profile.invite={hash:hash(token),exp:Date.now()+30*60*1000};
  return 'https://travauxcorse-com.vercel.app/client/mes-projets/#invitation='+encodeURIComponent(token)+'&email='+encodeURIComponent(profile.email);
}
function cookie(profile,secret){
  const payload=Buffer.from(JSON.stringify({email:profile.email,version:profile.version||1,exp:Date.now()+7*86400000})).toString('base64url');
  return COOKIE+payload+'.'+sign(payload,secret)+'; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=604800';
}
function session(req,secret){
  const value=(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(COOKIE))?.slice(COOKIE.length);
  if(!value)return null;
  const [payload,signature]=value.split('.');
  if(!payload||!signature)return null;
  const expected=sign(payload,secret);
  if(signature.length!==expected.length||!crypto.timingSafeEqual(Buffer.from(signature),Buffer.from(expected)))return null;
  try{const data=JSON.parse(Buffer.from(payload,'base64url'));return data.exp>Date.now()&&/^\S+@\S+\.\S+$/.test(data.email)?data:null;}catch{return null;}
}
module.exports={hash,readProfile,saveProfile,newInvite,cookie,session,profilePath};
