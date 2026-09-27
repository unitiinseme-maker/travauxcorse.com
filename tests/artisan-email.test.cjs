const {test,mock}=require('node:test');
const assert=require('node:assert/strict');
const nodemailer=require('nodemailer');
const {sendEmail,emailConfigured}=require('../lib/artisan-accounts');
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
test('Gmail sends artisan notification without a domain and reports SMTP failure',async()=>{
  const previous={key:process.env.RESEND_API_KEY,from:process.env.RESEND_FROM,gmail:process.env.GMAIL_APP_PASSWORD};
  const messages=[];
  const transport=mock.method(nodemailer,'createTransport',options=>({sendMail:async(message)=>{messages.push(message);},close:()=>{}}));
  try{
    delete process.env.RESEND_API_KEY;delete process.env.RESEND_FROM;
    process.env.GMAIL_APP_PASSWORD='test app password';
    assert.equal(emailConfigured(),true);
    assert.equal((await sendEmail('artisan@example.fr','Nouveau projet','Bonjour')).sent,true);
    assert.equal(transport.mock.calls[0].arguments[0].auth.user,'contact.travauxcorse@gmail.com');
    assert.equal(transport.mock.calls[0].arguments[0].auth.pass,'testapppassword');
    assert.equal(messages[0].to,'artisan@example.fr');
    transport.mock.restore();
    const failing=mock.method(nodemailer,'createTransport',()=>({sendMail:async()=>{throw Object.assign(new Error('auth'),{code:'EAUTH'});},close:()=>{}}));
    assert.equal((await sendEmail('artisan@example.fr','Nouveau projet','Bonjour')).sent,false);
    failing.mock.restore();
  }finally{
    transport.mock.restore();
    for(const [name,value] of Object.entries({RESEND_API_KEY:previous.key,RESEND_FROM:previous.from,GMAIL_APP_PASSWORD:previous.gmail})){
      if(value===undefined)delete process.env[name];else process.env[name]=value;
    }
  }
});
