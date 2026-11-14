// Only publicly released legal-entity identity; never identify individual applicants.
const COMPANY_COLUMNS=['DENOM_DEM','SIREN_DEM','SIRET_DEM','CJ_DEM','APE_DEM'];
function company(fields={}){
  const name=String(fields.DENOM_DEM||'').trim(),siren=String(fields.SIREN_DEM||'').trim(),category=String(fields.CJ_DEM||'');
  if(!name||!/^\d{9}$/.test(siren)||! /^[2-9]\d{3}$/.test(category))return null;
  return {name,siren,siret:/^\d{14}$/.test(String(fields.SIRET_DEM||''))?String(fields.SIRET_DEM):null};
}
function contactability(p,f={}){
  if(['provided','professional_public'].includes(f.contactSource)&&f.contactReference&&(f.contactEmail||f.contactPhone))return 'Coordonnées disponibles';
  if(company(p.fields))return 'Personne morale identifiée';
  return p.address?'Adresse du projet uniquement':'Aucun moyen de contact disponible';
}
function validateContact(b){
  const out={};for(const [key,max] of Object.entries({contactName:160,contactEmail:254,contactPhone:40,contactSource:30,contactReference:500}))out[key]=typeof b[key]==='string'?b[key].trim().slice(0,max):'';
  const fail=message=>{throw Object.assign(new Error(message),{status:400});};
  if(out.contactName||out.contactEmail||out.contactPhone){
    if(!['provided','professional_public'].includes(out.contactSource)||!out.contactReference)fail('Indiquez la provenance des coordonnées : communiquées directement ou coordonnées professionnelles publiques, avec une référence.');
    if(out.contactEmail&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(out.contactEmail))fail('Adresse email invalide.');
    if(out.contactPhone&&!/^\+?[\d\s().-]{6,40}$/.test(out.contactPhone))fail('Numéro de téléphone invalide.');
  }
  return out;
}
module.exports={COMPANY_COLUMNS,company,contactability,validateContact};
