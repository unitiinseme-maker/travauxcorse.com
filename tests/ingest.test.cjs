const {test}=require('node:test');
const assert=require('node:assert/strict');
const blob=require('@vercel/blob');
const original=blob.put;
const writes=[];
blob.put=async(path,content,options)=>{writes.push({path,item:JSON.parse(content),options});return {pathname:path};};
const handler=require('../api/ingest-request');
blob.put=original;
function request(body){return new Promise(resolve=>{
  const res={setHeader:()=>{},end:data=>resolve({status:res.statusCode,data:JSON.parse(data)})};
  Promise.resolve(handler({method:'POST',headers:{'content-type':'application/json'},body},res)).catch(error=>resolve({error}));
});}
test('FormSubmit webhook stores a valid project in private Blob without interrupting the email confirmation',async()=>{
  const old=process.env.BLOB_STORE_ID;process.env.BLOB_STORE_ID='test-store';
  try{
    const result=await request({form_data:{name:'Client',email:'client@example.fr',Téléphone:'0612345678','Métiers_demandés':'Plomberie',Projet:'Réparation',Commune:'Bastia'}});
    assert.equal(result.status,200);assert.equal(writes.length,1);
    assert.equal(writes[0].item.trades,'Plomberie');assert.equal(writes[0].options.access,'private');
    assert.match(writes[0].path,/^requests\/\d{4}-\d{2}-\d{2}\//);
  }finally{if(old===undefined)delete process.env.BLOB_STORE_ID;else process.env.BLOB_STORE_ID=old;}
});
test('an unrecognized webhook body does not cause a FormSubmit 500 page',async()=>{
  const previous=console.error;console.error=()=>{};
  try{const result=await request({form_data:{foo:'bar'}});assert.equal(result.status,200);assert.equal(result.data.ok,true);}finally{console.error=previous;}
});
