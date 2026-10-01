const {test}=require('node:test');
const assert=require('node:assert/strict');
const {SITE_ORIGIN,LEGACY_ORIGIN,allowedAdminOrigin}=require('../lib/site-config');
test('domain migration allows same-origin administration on www and legacy deployment, rejects third parties',()=>{
  const previous=process.env.CMS_ALLOWED_ORIGIN;
  process.env.CMS_ALLOWED_ORIGIN=LEGACY_ORIGIN;
  try {
    for(const origin of [SITE_ORIGIN,LEGACY_ORIGIN,'https://travauxcorse.com']) {
      assert.equal(allowedAdminOrigin({headers:{origin,host:new URL(origin).host}}),true);
    }
    for(const origin of ['https://attacker.example','https://www.travauxcorse.com.attacker.example','null',undefined]) {
      assert.equal(allowedAdminOrigin({headers:{origin,host:'www.travauxcorse.com'}}),false);
    }
    assert.equal(allowedAdminOrigin({headers:{origin:LEGACY_ORIGIN,host:'www.travauxcorse.com'}}),false);
  } finally {if(previous===undefined)delete process.env.CMS_ALLOWED_ORIGIN;else process.env.CMS_ALLOWED_ORIGIN=previous;}
});
test('published editorial canonical and social image use the purchased domain',()=>{
  const html=require('../lib/content-render').page({kind:'guide',slug:'test',title:'Test',summary:'Test',body:'Test',images:[]});
  assert.ok(html.includes('href="https://www.travauxcorse.com/conseils/test/"'));
  assert.ok(html.includes('content="https://www.travauxcorse.com/travauxcorse-logo.png"'));
  assert.ok(!html.includes(LEGACY_ORIGIN));
});
