const {company}=require('./permit-contact');
const fail=message=>{throw Object.assign(new Error(message),{status:400});};
function attachResearch(p,db){const co=company(p.fields);return {...p,businessResearch:co?db.companyResearch?.[co.siren]||null:null};}
function importResearch(db,rows){
  if(!Array.isArray(rows)||!rows.length||rows.length>100)fail('Import limité à 100 sociétés.');
  const known=new Set(Object.values(db.records).map(p=>company(p.fields)?.siren).filter(Boolean)),prepared={},stamp=new Date().toISOString();
  for(const row of rows){
    if(!row||!known.has(row.siren)||prepared[row.siren])fail('SIREN inconnu ou présent plusieurs fois.');
    const str=(key,max)=>{const v=row[key]||'';if(typeof v!=='string'||v.length>max)fail('Champ invalide : '+key);return v.trim();};
    const phone=str('phone',40),email=str('email',254),leaders=str('leaders',1200),note=str('note',1200),checkedAt=str('checkedAt',10);
    if(phone&&!/^\+?[\d\s().-]{6,40}$/.test(phone))fail('Téléphone invalide.');
    if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))fail('Email invalide.');
    if(!/^\d{4}-\d{2}-\d{2}$/.test(checkedAt)||checkedAt>stamp.slice(0,10))fail('Date de recherche invalide.');
    if(!Array.isArray(row.sources)||!row.sources.length||row.sources.length>6)fail('Sources obligatoires (6 maximum).');
    const sources=row.sources.map(v=>{if(typeof v!=='string'||v.length>1000)fail('Source invalide.');let u;try{u=new URL(v);}catch{fail('URL source invalide.');}if(u.protocol!=='https:'||u.username||u.password)fail('Source HTTPS requise.');return u.href;});
    prepared[row.siren]={phone,email,leaders,note,checkedAt,sources,importedAt:stamp};
  }
  for(const [siren,value] of Object.entries(prepared))if(db.companyResearch?.[siren]?.checkedAt>value.checkedAt)fail('Une recherche plus récente est déjà enregistrée.');
  let updated=0;db.companyResearch||={};for(const [siren,value] of Object.entries(prepared)){const old=db.companyResearch[siren];if(JSON.stringify({...old,importedAt:null})!==JSON.stringify({...value,importedAt:null})){db.companyResearch[siren]=value;updated++;}}
  return {companies:rows.length,updated,permits:Object.values(db.records).filter(p=>prepared[company(p.fields)?.siren]).length};
}
module.exports={attachResearch,importResearch};
