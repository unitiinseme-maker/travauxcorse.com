const {list,get,put,del}=require('@vercel/blob');
const ROOT='public-partners/';
const PATH=/^public-partners\/[0-9a-f-]{36}\.json$/;
async function readPartner(id){
  const path=ROOT+id+'.json';
  if(!PATH.test(path))return null;
  const blob=await get(path,{access:'private',useCache:false});
  if(!blob||blob.statusCode!==200)return null;
  const data=await new Response(blob.stream).text();
  return data.length<=550000?JSON.parse(data):null;
}
async function listPartners(){
  const paths=[];let cursor;
  do{
    const page=await list({prefix:ROOT,limit:1000,cursor});
    paths.push(...page.blobs.map(x=>x.pathname).filter(x=>PATH.test(x)));
    cursor=page.hasMore?page.cursor:undefined;
  }while(cursor&&paths.length<1000);
  const items=[];
  for(let i=0;i<paths.length;i+=8)items.push(...(await Promise.all(paths.slice(i,i+8).map(x=>readPartner(x.slice(ROOT.length,-5))))).filter(Boolean));
  return items.sort((a,b)=>a.name.localeCompare(b.name,'fr'));
}
async function savePartner(item){await put(ROOT+item.id+'.json',JSON.stringify(item),{access:'private',allowOverwrite:true,contentType:'application/json',cacheControlMaxAge:60});}
async function deletePartner(id){if(!PATH.test(ROOT+id+'.json'))throw Error('Invalid partner ID');await del(ROOT+id+'.json');}
module.exports={readPartner,listPartners,savePartner,deletePartner};
