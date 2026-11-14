const crypto=require('node:crypto');
const {synchronize}=require('../lib/permit-sync');
module.exports=async(req,res)=>{
  res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json');res.setHeader('X-Robots-Tag','noindex');
  const expected=process.env.CRON_SECRET,actual=req.headers.authorization||'';
  const equal=expected&&crypto.timingSafeEqual(crypto.createHash('sha256').update(actual).digest(),crypto.createHash('sha256').update(`Bearer ${expected}`).digest());
  if(!equal){res.statusCode=401;return res.end(JSON.stringify({error:'Non autorisé.'}));}
  if(req.method!=='GET'){res.statusCode=405;return res.end('{}');}
  try{res.end(JSON.stringify(await synchronize()));}catch(e){res.statusCode=e.status||503;res.end(JSON.stringify({error:'Synchronisation non terminée. Les données précédentes sont conservées.'}));}
};
