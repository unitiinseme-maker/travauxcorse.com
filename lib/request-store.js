const {list,get,put}=require('@vercel/blob');
const {normalizeRequest}=require('./project-request');
const PATH=/^requests\/[a-zA-Z0-9/_-]+\.json$/;
function validPath(path){return typeof path==='string'&&path.length<=220&&PATH.test(path)&&!path.includes('//');}
async function readRequest(path){
  if(!validPath(path))return null;
  const blob=await get(path,{access:'private',useCache:false});
  if(!blob||blob.statusCode!==200)return null;
  const raw=await new Response(blob.stream).text();
  if(raw.length>60000)return null;
  const item=normalizeRequest(JSON.parse(raw));
  return item?{...item,id:path}:null;
}
async function saveRequest(item){
  if(!validPath(item?.id))throw Error('Invalid request path');
  const {id,...value}=item;
  await put(id,JSON.stringify(value),{access:'private',allowOverwrite:true,contentType:'application/json',cacheControlMaxAge:60});
}
async function allRequests(){
  const paths=[];let cursor;
  do{
    const page=await list({prefix:'requests/',limit:1000,cursor});
    paths.push(...page.blobs.map(x=>x.pathname).filter(validPath));
    cursor=page.hasMore?page.cursor:undefined;
  }while(cursor&&paths.length<5000);
  const items=[];
  for(let i=0;i<paths.length;i+=8){
    const batch=await Promise.all(paths.slice(i,i+8).map(readRequest));
    items.push(...batch.filter(Boolean));
  }
  return items.sort((a,b)=>b.date.localeCompare(a.date));
}
module.exports={validPath,readRequest,saveRequest,allRequests};
