const {test}=require('node:test');
const assert=require('node:assert/strict');
const handler=require('../api/submissions');

function request(req){return new Promise(async resolve=>{const headers={};const res={setHeader:(key,value)=>headers[key]=value,end:value=>resolve({status:res.statusCode,body:JSON.parse(value),headers})};await handler(req,res);});}

test('only private CMS sessions can read the archive',async()=>{
  const original=process.env.FORMSUBMIT_API_KEY;
  process.env.FORMSUBMIT_API_KEY='a-private-key';
  try{
    let result=await request({method:'GET',headers:{}});
    assert.equal(result.status,401);
    result=await request({method:'POST',headers:{}});
    assert.equal(result.status,405);
  }finally{if(original===undefined)delete process.env.FORMSUBMIT_API_KEY;else process.env.FORMSUBMIT_API_KEY=original;}
});

test('only work requests are displayed; field names match translated FormSubmit email',()=>{
  const items=handler.requests([
    {form_data:{'Métiers_demandés':'Électricité · Plomberie','Projet':'Salle de bains','Téléphone':'06 01 02 03 04',name:'Yoan',email:'test@example.fr',Commune:'Bastia',Description:'Rénovation'},submitted_at:{date:'2026-09-27 08:06:00.000000'}},
    {form_data:{company:'Entreprise partenaire',email:'pro@example.fr'}}
  ]);
  assert.equal(items.length,1);
  assert.equal(items[0].trades,'Électricité · Plomberie');
  assert.equal(items[0].phone,'06 01 02 03 04');
  assert.equal(items[0].date,'2026-09-27 08:06:00.000000');
});
