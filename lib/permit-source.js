const {publicColumn,normalize}=require('./permit-model');
const BASE='https://data.statistiques.developpement-durable.gouv.fr/dido/api/v1';
const DATASET='6513f0189d7d312c80ec5b5b';
const FILES=['8b35affb-55fc-4c1f-915b-7750f974446a','f8f0700f-806c-40a7-83b1-f21cf507e7c4','96883f50-538b-41f9-a059-c6eb97e6a23a','1a9a2f0c-56fe-4e69-84a7-fbbda2121f02'];
async function json(url,allowEmpty=false){for(let attempt=0;attempt<3;attempt++){let r;try{r=await fetch(url,{signal:AbortSignal.timeout(25000),headers:{Accept:'application/json'}});}catch(e){if(attempt<2){await new Promise(resolve=>setTimeout(resolve,2000));continue;}throw new Error(`Connexion source ${new URL(url).hostname}: ${e.cause?.code||e.name}`);}if(r.ok)return r.json();if(allowEmpty&&r.status===400){const error=await r.json().catch(()=>null);if(error?.code===400&&error.message==='Le fichier est vide.')return [];}
if([429,502,503,504].includes(r.status)&&attempt<2){const delay=Math.min(8000,Math.max(2000,(Number(r.headers.get('retry-after'))||2)*1000));await new Promise(resolve=>setTimeout(resolve,delay));continue;}throw new Error(`Source officielle indisponible (${r.status}).`);}}
async function collect(previous={},now=new Date()){
  const metadata=await json(`${BASE}/datasets/${DATASET}`);
  const revision=metadata.last_modified;
  if(!revision||!Array.isArray(metadata.datafiles))throw new Error('Métadonnées Sitadel invalides.');
  if(previous.revision===revision)return {unchanged:true,revision};
  const since=new Date(now.getTime()-90*86400000).toISOString().slice(0,10);
  const maps=await Promise.all(['2A','2B'].map(d=>json(`https://geo.api.gouv.fr/departements/${d}/communes?fields=nom,code`)));
  const communes=Object.fromEntries(maps.flat().map(c=>[c.code,c.nom]));
  const labels={};
  const results=await Promise.all(FILES.map(async rid=>{
    const file=metadata.datafiles.find(d=>d.rid===rid);if(!file)throw new Error('Un fichier officiel Sitadel manque.');
    const vintage=[...file.millesimes].sort((a,b)=>b.millesime.localeCompare(a.millesime))[0];
    const columns=vintage.columns.filter(c=>publicColumn(c.name)).map(c=>{labels[c.name]=c.description;return c.name;});
    for(const required of ['DEP_CODE','COMM','DATE_REELLE_AUTORISATION'])if(!columns.includes(required))throw new Error('Colonnes Sitadel manquantes.');
    const params=new URLSearchParams({millesime:vintage.millesime,DEP_CODE:'in:2A,2B',columns:columns.join(',')});
    // DPC_DERN is the source's monthly change marker, not the authorization date.
    // Re-read the preceding published month to catch corrections and late reports.
    if(previous.coverageEnd){
      const months=[],cursor=new Date(previous.coverageEnd.slice(0,7)+'-01T00:00:00Z');
      const end=metadata.temporal_coverage?.end||now.toISOString().slice(0,10);
      while(cursor.toISOString().slice(0,7)<=end.slice(0,7)&&months.length<240){months.push(cursor.toISOString().slice(0,7));cursor.setUTCMonth(cursor.getUTCMonth()+1);}
      if(!months.length)throw new Error('Période de mise à jour Sitadel incohérente.');
      const field=vintage.columns.find(c=>c.name==='DPC_DERN');
      params.set('DPC_DERN','in:'+(field?.type==='integer'?months.map(m=>m.replace('-','')):months.flatMap(m=>[m,m.replace('-','')])).join(','));
    }
    else params.set('DATE_REELLE_AUTORISATION',`gte:${since}`);
    const rows=await json(`${BASE}/datafiles/${rid}/json?${params}`,true);
    if(!Array.isArray(rows))throw new Error('Réponse Sitadel inattendue.');
    return {rows:rows.map(raw=>normalize(raw,{rid,vintage:vintage.millesime,url:vintage.weburl},communes)),count:rows.length,rid,vintage:vintage.millesime};
  }));
  return {revision,coverageEnd:metadata.temporal_coverage?.end||null,sourceUpdatedAt:metadata.last_update,labels,rows:results.flatMap(r=>r.rows),counts:results.map(({rows,...r})=>r),since};
}
module.exports={collect,BASE,DATASET};
