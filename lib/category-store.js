const {get,put}=require('@vercel/blob');
const names=require('../content/categories.json');
const PATH='site/categories.json';
const slug=(name)=>name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const initial=()=>names.map((name,index)=>({id:slug(name),name,order:index+1,active:true}));
async function loadCategories(){
  const blob=await get(PATH,{access:'private',useCache:false});
  if(!blob)return initial();
  if(blob.statusCode!==200)throw Error('Category storage unavailable');
  const data=JSON.parse(await new Response(blob.stream).text());
  if(!Array.isArray(data))throw Error('Invalid category storage');
  return data;
}
async function saveCategories(categories){
  await put(PATH,JSON.stringify(categories),{access:'private',allowOverwrite:true,contentType:'application/json',cacheControlMaxAge:60});
}
module.exports={loadCategories,saveCategories};
