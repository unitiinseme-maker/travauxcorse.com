// Read-only integration check. No storage writes, no messages and no fabricated permits.
const assert=require('node:assert/strict');
const {collect}=require('../lib/permit-source');
const {mergeRecords,queryRecords}=require('../lib/permit-model');
(async()=>{
  const source=await collect(),first=mergeRecords({},source.rows.filter(p=>[2,5].includes(p.state))),again=mergeRecords(first.records,source.rows.filter(p=>[2,5].includes(p.state)));
  assert.equal(again.added,0);assert.equal(again.changed,0);
  const db={records:first.records,followups:{}},counts={};
  for(const dept of ['2A','2B']){const q=queryRecords(db,new URLSearchParams({dept}));counts[dept]=q.total;assert(q.rows.every(p=>p.dept===dept));}
  const empty=queryRecords(db,new URLSearchParams({q:'__NO_MATCH_PERMIT_TEST__'}));assert.equal(empty.total,0);
  for(const p of Object.values(first.records)){assert(p.date>=source.since);assert(p.trades.every(t=>t.reason));assert(!Object.keys(p.fields).some(k=>k.endsWith('_DEM')));}
  console.log(JSON.stringify({testedAt:new Date().toISOString(),since:source.since,coverageEnd:source.coverageEnd,sourceCounts:source.counts,unique:first.added,departments:counts,repeatAdded:again.added,repeatChanged:again.changed},null,2));
})().catch(e=>{console.error(e.message);process.exitCode=1;});
