const crypto=require('node:crypto');
const {createStore}=require('../lib/content-store');
const attempts=new Map();
function config(){return {token:process.env.CMS_GITHUB_TOKEN,secret:process.env.CMS_SECRET,password:process.env.CMS_ADMIN_PASSWORD};}
function ready(c){return !!(c.token&&c.secret?.length>=32&&c.password?.length>=20);}
function digest(v){return crypto.createHash('sha256').update(String(v)).digest();}
function same(a,b){return crypto.timingSafeEqual(digest(a),digest(b));}
function sign(value,secret){return crypto.createHmac('sha256',secret).update(value).digest('base64url');}
function session(req,c){
  const cookie=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('__Host-tc-editor='))?.slice(17);
  if(!cookie)return null;const [payload,signature]=cookie.split('.');if(!payload||!signature||!same(signature,sign(payload,c.secret)))return null;
  try{const data=JSON.parse(Buffer.from(payload,'base64url'));return data.exp>Date.now()&&data.password===digest(c.password).toString('hex')?data:null;}catch{return null;}
}
function send(res,status,value){res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.end(JSON.stringify(value));}
module.exports=async function(req,res){
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('X-Frame-Options','DENY');
  const c=config();if(!ready(c))return send(res,503,{configured:false,error:'La publication n’est pas encore activée. Configurez les accès privés dans Vercel pour enregistrer et publier les contenus.'});
  if(req.method==='GET'){
    const auth=session(req,c);if(!auth)return send(res,200,{configured:true,authenticated:false});
    try{return send(res,200,{configured:true,authenticated:true,csrf:sign(auth.nonce,c.secret),...await createStore(c).load(new URL(req.url,'https://localhost').searchParams.get('id'))});}catch(error){return send(res,error.status||503,{error:error.status?error.message:'Impossible de charger les contenus.'});}
  }
  if(req.method!=='POST'){res.setHeader('Allow','GET, POST');return send(res,405,{error:'Méthode non autorisée.'});}
  const origin=process.env.CMS_ALLOWED_ORIGIN||'https://travauxcorse-com.vercel.app';
  if(req.headers.origin!==origin||!/^application\/json(?:;|$)/i.test(req.headers['content-type']||''))return send(res,403,{error:'Origine de la requête non autorisée.'});
  try{
    let body=req.body;
    if(body===undefined){let raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>2200000)return send(res,413,{error:'Contenu trop volumineux.'});}body=JSON.parse(raw);}
    else if(typeof body==='string')body=JSON.parse(body);
    if(!body||Buffer.byteLength(JSON.stringify(body))>2200000)return send(res,413,{error:'Contenu trop volumineux.'});
    if(body.action==='login'){
      const ip=String(req.headers['x-forwarded-for']||req.socket?.remoteAddress||'unknown').split(',')[0];
      for(const [key,value] of attempts)if(value.until<Date.now())attempts.delete(key);
      const attempt=attempts.get(ip)||{count:0,until:Date.now()+900000};
      if(attempt.count>=5){res.setHeader('Retry-After','900');return send(res,429,{error:'Trop de tentatives. Réessayez dans 15 minutes.'});}
      if(typeof body.password!=='string'||!same(body.password,c.password)){attempt.count++;if(attempts.size<10000)attempts.set(ip,attempt);return send(res,401,{error:'Mot de passe incorrect.'});}
      attempts.delete(ip);const data={exp:Date.now()+8*3600000,nonce:crypto.randomBytes(24).toString('base64url'),password:digest(c.password).toString('hex')};
      const payload=Buffer.from(JSON.stringify(data)).toString('base64url');
      res.setHeader('Set-Cookie',`__Host-tc-editor=${payload}.${sign(payload,c.secret)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=28800`);
      return send(res,200,{authenticated:true});
    }
    const auth=session(req,c);if(!auth)return send(res,401,{error:'Reconnectez-vous pour enregistrer. Votre saisie reste affichée.'});
    if(!same(req.headers['x-csrf-token']||'',sign(auth.nonce,c.secret)))return send(res,403,{error:'Session invalide. Rechargez la page.'});
    if(body.action==='logout'){res.setHeader('Set-Cookie','__Host-tc-editor=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0');return send(res,200,{ok:true});}
    return send(res,200,await createStore(c).save(body));
  }catch(error){return send(res,error.status||500,{error:error.status?error.message:'L’enregistrement a échoué. Votre saisie est conservée à l’écran ; réessayez.'});}
};
