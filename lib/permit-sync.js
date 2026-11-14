const crypto=require('node:crypto');
const {collect}=require('./permit-source');
const {mergeRecords}=require('./permit-model');
const store=require('./permit-store');
async function synchronize(){
  const startedAt=new Date().toISOString(),token=crypto.randomUUID();
  const previous=await store.mutate(db=>{if(db.sync.runningUntil>Date.now()){const e=new Error('Une synchronisation est déjà en cours.');e.status=409;throw e;}const previous={...db.sync};db.sync={...db.sync,runningUntil:Date.now()+360000,token,lastAttempt:startedAt};return previous;});
  try{
    const result=await collect(previous);
    return await store.mutate(db=>{
      if(db.sync.token!==token)throw new Error('Synchronisation remplacée : réessayez.');
      let counts={added:0,changed:0};
      if(!result.unchanged){
        const incoming=result.rows.filter(p=>db.records[p.id]||p.date>=result.since&&[2,5].includes(p.state));
        const merged=mergeRecords(db.records,incoming,startedAt);db.records=merged.records;counts={added:merged.added,changed:merged.changed};db.labels={...db.labels,...result.labels};
        Object.assign(db.sync,{revision:result.revision,coverageEnd:result.coverageEnd,sourceUpdatedAt:result.sourceUpdatedAt,counts:result.counts,firstImportSince:db.sync.firstImportSince||result.since});
      }
      Object.assign(db.sync,{lastSuccess:new Date().toISOString(),lastResult:counts,lastError:null,runningUntil:0,token:null});
      return {...counts,total:Object.keys(db.records).length,unchanged:!!result.unchanged,sync:db.sync};
    });
  }catch(e){await store.mutate(db=>{if(db.sync.token===token)Object.assign(db.sync,{lastError:'Échec de la source ou du stockage. Les données précédentes sont conservées.',runningUntil:0,token:null});}).catch(()=>{});throw e;}
}
module.exports={synchronize};
