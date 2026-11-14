const crypto=require('node:crypto');
const {COMPANY_COLUMNS,company,contactability}=require('./permit-contact');
const STATUSES=['À étudier','À contacter','Contact en cours','Projet intéressant','Non pertinent','Archivé'];
const POTENTIAL=['Faible','Moyen','Élevé','Très élevé'];
const STATE={2:'Autorisé',4:'Annulé',5:'Chantier commencé',6:'Terminé'};
const NATURE={1:'Construction neuve',2:'Transformation / rénovation',3:'Transformation avec extension',4:'Transformation avec diminution',5:'Extension',6:'Diminution de surface'};
const digest=v=>crypto.createHash('sha256').update(v).digest('hex');
const number=v=>v===null||v===undefined||v===''?null:Number.isFinite(Number(v))?Number(v):null;
const yes=v=>v===true||v===1||v==='1';
const sum=(...v)=>v.every(x=>number(x)===null)?null:v.reduce((s,x)=>s+(number(x)||0),0);
// Project allowlist. Legal-entity identity is separately validated before storage.
function publicColumn(k){return /^(REG_CODE|REG_LIBELLE|DEP_CODE|DEP_LIBELLE|COMM|TYPE_DAU|NUM_DAU|NUM_PA|NUM_PD|ETAT_DAU|ETAT_PA|ETAT_PD|DATE_REELLE_\w+|AN_DEPOT|DR_DEPOT|DPC_AUT|DPC_DOC|DPC_DERN|ADR_(NUM|LIBVOIE|LIEUDIT|LOCALITE|CODPOST)_TER|SEC_CADASTRE\d+|NUM_CADASTRE\d+|SURF_\w+|EMPRISE_SOL_\w+|SUPERFICIE_TERRAIN|NATURE_PROJET_DECLAREE|NATURE_PROJET_COMPLETEE|DESTINATION_PRINCIPALE|TYPE_PRINCIP_LOGTS_CREES|TYPE_TRANSFO_PRINCIPAL|TYPE_PRINCIP_LOCAUX_TRANSFORMES|I_\w+|NB_LGT_\w+|NB_NIV_MAX|NB_CHAMBRES|AGRIVOLTAIQUE)$/.test(k);}
function analyze(raw,type){
  const homes=number(raw.NB_LGT_TOT_CREES),area=sum(raw.SURF_HAB_CREEE,raw.SURF_LOC_CREEE);
  const nature=number(raw.NATURE_PROJET_COMPLETEE)||number(raw.NATURE_PROJET_DECLAREE);
  const transformed=sum(raw.SURF_HAB_ISSUE_TRANSFO,raw.SURF_LOC_ISSUE_TRANSFO),size=(area||0)+(transformed||0);
  const fresh=nature===1,extension=[3,5].includes(nature)||yes(raw.I_EXTENSION);
  const local='SURF_COM_CREEE' in raw||number(raw.SURF_LOC_CREEE)>0||number(raw.SURF_LOC_ISSUE_TRANSFO)>0;
  const group=number(raw.NB_LGT_COL_CREES)>0?'Collectif':number(raw.NB_LGT_IND_CREES)>0?'Maison individuelle':local&&number(raw.DESTINATION_PRINCIPALE)===4?'Commerce':local?'Local professionnel':type==='PA'?'Aménagement':type==='PD'?'Démolition':'Non disponible';
  const trades=new Map();const add=(names,reason)=>names.forEach(name=>trades.set(name,{name,reason}));
  if(type==='PD')add(['Démolition & Dépose'],'Permis de démolir');
  else if(type==='PA')add(['Terrassement & VRD'],'Permis d’aménager : travaux de terrain et réseaux à vérifier');
  else if(fresh||extension){
    add(['Maçonnerie & Gros œuvre','Terrassement & VRD','Toiture, Couverture & Charpente','Étanchéité','Menuiserie extérieure','Isolation'],fresh?'Construction neuve':'Extension de surface');
    if((homes||0)>0||local)add(['Électricité courants forts','Plomberie & Sanitaire','Ventilation & VMC','Plâtrerie & Cloisons','Peinture','Carrelage & Faïence','Menuiserie intérieure'], 'Création de logements ou de locaux : équipement intérieur à vérifier');
  }else if([2,3,4].includes(nature))add(['Plâtrerie & Cloisons','Peinture','Électricité courants forts','Plomberie & Sanitaire'],'Transformation déclarée : périmètre à confirmer');
  if(yes(raw.I_PISCINE))add(['Piscine','Terrassement & VRD'],'Piscine explicitement déclarée');
  if(yes(raw.AGRIVOLTAIQUE))add(['Photovoltaïque & Énergie solaire'],'Installation photovoltaïque explicitement déclarée');
  let potential=0;const reasons=[];
  if((homes||0)>=10||size>=1000){potential=3;reasons.push('Au moins 10 logements ou 1 000 m² créés / issus d’une transformation');}
  else if((fresh&&(homes||0)>=1)||size>=100||(homes||0)>=2){potential=2;reasons.push('Construction neuve avec logement, plusieurs logements ou au moins 100 m² créés / issus d’une transformation');}
  else if(size>=20||type==='PA'||type==='PD'||yes(raw.I_PISCINE)){potential=1;reasons.push('Projet spécialisé ou surface créée / issue d’une transformation d’au moins 20 m²');}
  else reasons.push(area!==null&&area<20?'Petite surface créée (moins de 20 m²)':'Données insuffisantes pour établir un potentiel supérieur');
  if([4,6].includes(number(raw.ETAT_DAU??raw.ETAT_PA??raw.ETAT_PD))){potential=0;reasons.push('Dossier annulé ou travaux terminés');}
  return {homes,area,group,nature:NATURE[nature]||(type==='PA'?'Aménagement':type==='PD'?'Démolition':'Non disponible'),trades:[...trades.values()],potential,potentialLabel:POTENTIAL[potential],reasons};
}
function normalize(raw,source,communes={}){
  const type=raw.TYPE_DAU||(raw.NUM_PA?'PA':raw.NUM_PD?'PD':null),num=raw.NUM_DAU||raw.NUM_PA||raw.NUM_PD;
  const dept=String(raw.DEP_CODE||'');const date=raw.DATE_REELLE_AUTORISATION;
  if(!['2A','2B'].includes(dept)||!['PC','PA','DP','PD'].includes(type)||!num||!/^\d{4}-\d{2}-\d{2}$/.test(date||''))throw new Error('Schéma Sitadel inattendu : import interrompu.');
  const legalEntity=company(raw);
  const fields=Object.fromEntries(Object.entries(raw).filter(([k])=>publicColumn(k)||(legalEntity&&COMPANY_COLUMNS.includes(k))).sort(([a],[b])=>a.localeCompare(b)));
  const state=number(raw.ETAT_DAU??raw.ETAT_PA??raw.ETAT_PD);
  if(!STATE[state])throw new Error('État Sitadel inconnu : import interrompu.');
  return {id:digest(`${type}:${num}`),number:String(num),type,dept,date,state,status:STATE[state],commune:communes[raw.COMM]||null,communeCode:raw.COMM,address:[raw.ADR_NUM_TER,raw.ADR_LIBVOIE_TER,raw.ADR_LIEUDIT_TER,raw.ADR_CODPOST_TER,raw.ADR_LOCALITE_TER].filter(v=>v!==null&&v!==undefined&&v!=='').join(' ')||null,fields,sourceFields:{[source.rid]:fields},sources:[source],...analyze(fields,type)};
}
function mergeRecords(existing,incoming,now=new Date().toISOString()){
  const records={...existing};let added=0,changed=0;
  const grouped=new Map();
  for(const p of incoming){const prev=grouped.get(p.id);if(prev){const fields={...prev.fields};for(const [k,v] of Object.entries(p.fields))if(v!==null&&v!=='')fields[k]=v;grouped.set(p.id,{...prev,fields,sources:[...prev.sources,...p.sources],...analyze(fields,p.type)});}else grouped.set(p.id,p);}
  for(const [id,entry] of grouped){const old=records[id];
    const sourceFields={...old?.sourceFields};const sources=new Map((old?.sources||[]).map(s=>[s.rid,s]));
    for(const row of incoming.filter(r=>r.id===id)){Object.assign(sourceFields,row.sourceFields);row.sources.forEach(s=>sources.set(s.rid,s));}
    const fields={};
    // Keep each source's full latest row so a one-file correction cannot erase another file's attributes.
    for(const raw of Object.values(sourceFields))for(const [k,v] of Object.entries(raw))if(v!==null&&v!=='')fields[k]=v;
    for(const raw of Object.values(sourceFields))for(const [k,v] of Object.entries(raw))if(!(k in fields))fields[k]=v;
    const ordered=Object.fromEntries(Object.entries(fields).sort(([a],[b])=>a.localeCompare(b)));
    const state=number(fields.ETAT_DAU??fields.ETAT_PA??fields.ETAT_PD);
    const p={...entry,fields:ordered,sourceFields,sources:[...sources.values()],state,status:STATE[state],...analyze(fields,entry.type)};
    const fingerprint=digest(JSON.stringify({fields:ordered,commune:p.commune}));
    if(!old){added++;records[id]={...p,fingerprint,firstSeen:now,updatedAt:now};}
    else if(old.fingerprint!==fingerprint){changed++;records[id]={...p,fingerprint,firstSeen:old.firstSeen,updatedAt:now};}
    else records[id]={...old,sources:p.sources};
  }
  return {records,added,changed};
}
function queryRecords(db,params,now=new Date()){
  const text=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const all=Object.values(db.records||{}).map(p=>({...p,...analyze(p.fields,p.type),followup:db.followups?.[p.id]||{status:STATUSES[0]}}));
  const active=all.filter(p=>[2,5].includes(p.state));const cutoff=d=>new Date(now.getTime()-d*86400000).toISOString().slice(0,10);
  const stats={days7:0,days30:0,days90:0,newWeek:0,homes:0,homesUnavailable:0,strong:0,treated:0,departments:{'2A':0,'2B':0},potentials:[0,0,0,0],groups:{},communes:{}};
  for(const p of active){for(const d of [7,30,90])if(p.date>=cutoff(d))stats['days'+d]++;if(p.firstSeen>=cutoff(7))stats.newWeek++;stats.departments[p.dept]++;stats.potentials[p.potential]++;stats.homes+=p.homes||0;if(p.homes===null)stats.homesUnavailable++;if(p.potential>=2)stats.strong++;if(p.followup.firstAnalysis)stats.treated++;stats.groups[p.group]=(stats.groups[p.group]||0)+1;const c=p.commune||p.communeCode;stats.communes[c]=(stats.communes[c]||0)+1;}
  let rows=all.filter(p=>{
    if(params.get('includeInactive')!=='1'&&![2,5].includes(p.state))return false;
    for(const key of ['dept','type','group','nature'])if(params.get(key)&&p[key]!==params.get(key))return false;
    if(params.get('commune')&&p.communeCode!==params.get('commune'))return false;
    if(params.get('potential')&&String(p.potential)!==params.get('potential'))return false;
    if(params.get('status')&&p.followup.status!==params.get('status'))return false;
    if(params.get('contact')&&contactability(p,p.followup)!==params.get('contact'))return false;
    if(params.get('seen')==='new'&&p.followup.seenAt||params.get('seen')==='seen'&&!p.followup.seenAt)return false;
    if(params.get('from')&&p.date<params.get('from')||params.get('to')&&p.date>params.get('to'))return false;
    for(const key of ['homes','area'])for(const bound of ['Min','Max']){const v=params.get(key+bound);if(v!==null&&v!==''&&(p[key]===null||(bound==='Min'?p[key]<Number(v):p[key]>Number(v))))return false;}
    const q=text(params.get('q'));return !q||text([p.commune,p.communeCode,p.number,p.address].join(' ')).includes(q);
  });
  const sort=params.get('sort');rows.sort((a,b)=>{if(sort==='commune')return (a.commune||a.communeCode).localeCompare(b.commune||b.communeCode,'fr');if(['potential','area','homes'].includes(sort))return (b[sort]??-1)-(a[sort]??-1)||b.date.localeCompare(a.date);return b.date.localeCompare(a.date)||a.id.localeCompare(b.id);});
  const total=rows.length,page=Math.min(Math.max(1,Number(params.get('page'))||1),Math.max(1,Math.ceil(total/20)));
  return {rows:rows.slice((page-1)*20,page*20).map(({fields,sourceFields,sources,fingerprint,...p})=>({...p,company:company(fields),contactability:contactability({fields,address:p.address},p.followup)})),total,page,pages:Math.max(1,Math.ceil(total/20)),stats,communes:[...new Map(all.map(p=>[p.communeCode,{code:p.communeCode,name:p.commune||p.communeCode}])).values()].sort((a,b)=>a.name.localeCompare(b.name,'fr')),groups:[...new Set(all.map(p=>p.group))].sort()};
}
module.exports={STATUSES,POTENTIAL,publicColumn,normalize,mergeRecords,queryRecords,analyze};
