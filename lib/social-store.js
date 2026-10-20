const {get,put}=require('@vercel/blob');
const PATH='site/social-links.json';
function validateSocialLinks(input){
  if(!input||typeof input!=='object'||Array.isArray(input))throw new TypeError('Liens invalides.');
  const result={};
  for(const [network,domain] of [['facebook','facebook.com'],['instagram','instagram.com']]){
    const value=input[network];
    if(value!==undefined&&typeof value!=='string')throw new TypeError('Lien invalide.');
    const text=(value||'').trim();
    if(!text){result[network]='';continue;}
    let url;try{url=new URL(text);}catch{throw new TypeError('Indiquez une adresse HTTPS complète pour '+network+'.');}
    if(text.length>2000||url.protocol!=='https:'||url.username||url.password||url.port||![domain,'www.'+domain,'m.'+domain].includes(url.hostname))throw new TypeError('Indiquez un lien HTTPS vers '+domain+'.');
    result[network]=url.href;
  }
  return result;
}
async function loadSocialLinks(){
  const blob=await get(PATH,{access:'private',useCache:false});
  if(!blob)return validateSocialLinks(require('../content/social-links.json'));
  if(blob.statusCode!==200)throw Error('Social storage unavailable');
  return validateSocialLinks(JSON.parse(await new Response(blob.stream).text()));
}
async function saveSocialLinks(links){
  const value=validateSocialLinks(links);
  await put(PATH,JSON.stringify(value),{access:'private',allowOverwrite:true,contentType:'application/json',cacheControlMaxAge:60});
  return value;
}
module.exports={loadSocialLinks,saveSocialLinks,validateSocialLinks};
