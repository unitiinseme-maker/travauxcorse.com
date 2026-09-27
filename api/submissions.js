const {cmsSession,cmsConfig}=require('./editorial');

const cache={key:'',until:0,items:[]};
const json=(res,status,value)=>{res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.end(JSON.stringify(value));};
const norm=value=>String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
const field=(data,name)=>Object.entries(data).find(([key])=>norm(key)===name)?.[1];
function requests(items){
  return items.filter(item=>item&&typeof item.form_data==='object'&&item.form_data!==null).map(item=>{
    const data=item.form_data;
    if(!field(data,'metiersdemandes')||!field(data,'projet'))return null;
    return {
      date:typeof item.submitted_at?.date==='string'?item.submitted_at.date.slice(0,32):'',
      name:String(field(data,'name')||'').slice(0,120),
      email:String(field(data,'email')||'').slice(0,254),
      phone:String(field(data,'telephone')||'').slice(0,40),
      trades:String(field(data,'metiersdemandes')||'').slice(0,1200),
      title:String(field(data,'projet')||'').slice(0,160),
      commune:String(field(data,'commune')||'').slice(0,120),
      delay:String(field(data,'delai')||'').slice(0,80),
      budget:String(field(data,'budget')||'').slice(0,80),
      property:String(field(data,'bien')||'').slice(0,80),
      surface:String(field(data,'surface')||'').slice(0,80),
      description:String(field(data,'description')||'').slice(0,10000),
      details:String(field(data,'documentsdisponiblesetinformationsutiles')||'').slice(0,3000)
    };
  }).filter(Boolean).slice(0,300);
}

module.exports=async function(req,res){
  res.setHeader('Cache-Control','private, no-store');
  res.setHeader('X-Content-Type-Options','nosniff');
  if(req.method!=='GET'){res.setHeader('Allow','GET');return json(res,405,{error:'Méthode non autorisée.'});}
  const c=cmsConfig();
  if(!c.secret||!c.password||!cmsSession(req,c))return json(res,401,{error:'Connectez-vous avec le mot de passe privé de publication.'});
  const apiKey=process.env.FORMSUBMIT_API_KEY?.trim();
  if(!apiKey)return json(res,503,{setup:true,error:'L’archive des demandes doit être activée avec la clé API FormSubmit.'});
  if(cache.key===apiKey&&cache.until>Date.now())return json(res,200,{requests:cache.items,updatedAt:new Date(cache.until-3600000).toISOString()});
  try{
    const response=await fetch('https://formsubmit.co/api/get-submissions/'+encodeURIComponent(apiKey),{headers:{Accept:'application/json'},signal:AbortSignal.timeout(12000)});
    if(!response.ok)return json(res,502,{error:'Impossible de consulter l’archive FormSubmit. Vérifiez la clé API ou réessayez plus tard.'});
    const size=Number(response.headers.get('content-length')||0);
    if(size>2000000)return json(res,502,{error:'L’archive est trop volumineuse pour cet affichage.'});
    const body=await response.text();
    if(body.length>2000000)return json(res,502,{error:'L’archive est trop volumineuse pour cet affichage.'});
    const data=JSON.parse(body);
    if(data.success!==true||!Array.isArray(data.submissions))return json(res,502,{error:'FormSubmit ne renvoie pas une archive valide. Vérifiez la clé API.'});
    cache.key=apiKey;cache.items=requests(data.submissions);cache.until=Date.now()+3600000;
    return json(res,200,{requests:cache.items,updatedAt:new Date().toISOString()});
  }catch{return json(res,502,{error:'L’archive FormSubmit est momentanément indisponible. Les demandes restent reçues par email.'});}
};
module.exports.requests=requests;
