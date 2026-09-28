const norm=value=>String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
const field=(data,name)=>Object.entries(data).find(([key])=>norm(key)===name)?.[1];
const clean=(data,name,limit)=>typeof field(data,name)==='string'?field(data,name).trim().slice(0,limit):'';
function assignments(value){return Array.isArray(value)?value.slice(0,20).filter(a=>a&&typeof a==='object'&&typeof a.name==='string'&&typeof a.email==='string').map(a=>({id:String(a.id||'').slice(0,60),name:a.name.slice(0,120),email:a.email.slice(0,254),at:String(a.at||'').slice(0,40),artisanId:String(a.artisanId||'').slice(0,60),notified:!!a.notified,status:String(a.status||'Affectée').slice(0,50),response:String(a.response||'').slice(0,3000),respondedAt:String(a.respondedAt||'').slice(0,40)})):[];}
function metadata(input,request){
  request.status=typeof input.status==='string'?input.status.slice(0,80):'Demande reçue';
  request.history=Array.isArray(input.history)?input.history.slice(-100).filter(x=>x&&typeof x.text==='string').map(x=>({at:String(x.at||'').slice(0,40),text:x.text.slice(0,240)})):[];
  request.messages=Array.isArray(input.messages)?input.messages.slice(-100).filter(x=>x&&typeof x.text==='string').map(x=>({at:String(x.at||'').slice(0,40),from:String(x.from||'').slice(0,100),text:x.text.slice(0,3000)})):[];
  request.documents=Array.isArray(input.documents)?input.documents.slice(-30).filter(x=>x&&typeof x.path==='string'&&/^project-files\/[a-f0-9-]{36}\.[a-z0-9]+$/.test(x.path)).map(x=>({path:x.path,name:String(x.name||'').slice(0,160),type:String(x.type||'').slice(0,80),at:String(x.at||'').slice(0,40),owner:String(x.owner||'').slice(0,80)})):[];
  request.quotes=Array.isArray(input.quotes)?input.quotes.slice(-30).filter(x=>x&&typeof x.id==='string').map(x=>({id:x.id.slice(0,60),assignmentId:String(x.assignmentId||'').slice(0,60),at:String(x.at||'').slice(0,40),amount:Number(x.amount)||0,vat:Number(x.vat)||0,validUntil:String(x.validUntil||'').slice(0,40),description:String(x.description||'').slice(0,1000),pdfPath:String(x.pdfPath||'').slice(0,100),status:['Envoyé','Accepté','Refusé'].includes(x.status)?x.status:'Envoyé'})):[];
  return request;
}
function normalizeRequest(input){
  if(!input||typeof input!=='object'||Array.isArray(input))return null;
  if(typeof input.form_data==='string'){
    try{return normalizeRequest({...input,form_data:JSON.parse(input.form_data)});}catch{return null;}
  }
  if(input.data&&typeof input.data==='object'&&!input.form_data)return normalizeRequest(input.data);
  if(!input.form_data&&Object.keys(input).some(key=>norm(key)==='metiersdemandes'))return normalizeRequest({form_data:input});
  if(!input.form_data){
    const {date,name,email,phone,trades,title,commune,delay,budget,property,surface,description,details}=input;
    if(typeof trades!=='string'||typeof title!=='string'||typeof email!=='string')return null;
    return metadata(input,{date:String(date||'').slice(0,40),name:String(name||'').slice(0,120),email:email.slice(0,254),phone:String(phone||'').slice(0,40),trades:trades.slice(0,1200),title:title.slice(0,160),commune:String(commune||'').slice(0,120),delay:String(delay||'').slice(0,80),budget:String(budget||'').slice(0,80),property:String(property||'').slice(0,80),surface:String(surface||'').slice(0,80),description:String(description||'').slice(0,10000),details:String(details||'').slice(0,3000),assignedArtisans:assignments(input.assignedArtisans)});
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
  request.assignedArtisans=assignments(input.assignedArtisans);
  return metadata(input,request);
}
module.exports={normalizeRequest};
