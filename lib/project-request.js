const norm=value=>String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
const field=(data,name)=>Object.entries(data).find(([key])=>norm(key)===name)?.[1];
const clean=(data,name,limit)=>typeof field(data,name)==='string'?field(data,name).trim().slice(0,limit):'';
function normalizeRequest(input){
  if(!input||typeof input!=='object'||Array.isArray(input))return null;
  if(!input.form_data){
    const {date,name,email,phone,trades,title,commune,delay,budget,property,surface,description,details}=input;
    if(typeof trades!=='string'||typeof title!=='string'||typeof email!=='string')return null;
    return {date:String(date||'').slice(0,40),name:String(name||'').slice(0,120),email:email.slice(0,254),phone:String(phone||'').slice(0,40),trades:trades.slice(0,1200),title:title.slice(0,160),commune:String(commune||'').slice(0,120),delay:String(delay||'').slice(0,80),budget:String(budget||'').slice(0,80),property:String(property||'').slice(0,80),surface:String(surface||'').slice(0,80),description:String(description||'').slice(0,10000),details:String(details||'').slice(0,3000)};
  }
  const data=input.form_data;
  if(!data||typeof data!=='object'||Array.isArray(data))return null;
  const request={
    date:typeof input.submitted_at?.date==='string'?input.submitted_at.date.slice(0,40):new Date().toISOString(),
    name:clean(data,'name',120),email:clean(data,'email',254),phone:clean(data,'telephone',40),
    trades:clean(data,'metiersdemandes',1200),title:clean(data,'projet',160),commune:clean(data,'commune',120),
    delay:clean(data,'delai',80),budget:clean(data,'budget',80),property:clean(data,'bien',80),surface:clean(data,'surface',80),
    description:clean(data,'description',10000),details:clean(data,'documentsdisponiblesetinformationsutiles',3000)
  };
  if(!request.trades||!request.title||!request.email||!request.name)return null;
  return request;
}
module.exports={normalizeRequest};
