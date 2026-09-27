const {test}=require('node:test');
const assert=require('node:assert/strict');
const {sendEmail}=require('../lib/artisan-accounts');
test('notification is sent only when sender and private email key are configured',async()=>{
  const before={key:process.env.RESEND_API_KEY,from:process.env.RESEND_FROM,fetch:global.fetch};
  let calls=[];
  try{
    delete process.env.RESEND_API_KEY;delete process.env.RESEND_FROM;
    let result=await sendEmail('artisan@example.fr','Projet affecté','Texte');assert.equal(result.sent,false);
    process.env.RESEND_API_KEY='test-key';process.env.RESEND_FROM='TravauxCorse <notifications@example.fr>';
    global.fetch=async(url,options)=>{calls.push({url,options});return {ok:true};};
    result=await sendEmail('artisan@example.fr','Un nouveau projet vous est affecté','Un dossier');
    assert.equal(result.sent,true);assert.equal(calls.length,1);
    assert.equal(calls[0].url,'https://api.resend.com/emails');
    assert.deepEqual(JSON.parse(calls[0].options.body).to,['artisan@example.fr']);
    assert.equal(JSON.parse(calls[0].options.body).subject,'Un nouveau projet vous est affecté');
  }finally{
    global.fetch=before.fetch;
    if(before.key===undefined)delete process.env.RESEND_API_KEY;else process.env.RESEND_API_KEY=before.key;
    if(before.from===undefined)delete process.env.RESEND_FROM;else process.env.RESEND_FROM=before.from;
  }
});
