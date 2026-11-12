const {test} = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const {audience} = require('../lib/audience');
const handler = require('../api/audience');
const account = 'a'.repeat(32), token = 'private-test-token';
const mockData = {data: {viewer: {accounts: [{total: [{count: 24, sum: {visits: 8}}], daily: [{count: 24, sum: {visits: 8}, dimensions: {date: '2026-11-12'}}], pages: [{count: 24, dimensions: {requestPath: '/conseils/test/'}}], sources: [{count: 24, dimensions: {refererHost: 'google.fr'}}]}]}}};
test('Cloudflare report scopes the domain, keeps totals separate from ranked lists and caches responses', async () => {
  let calls = 0;
  const fetcher = async (url, options) => {
    calls++; assert.equal(url, 'https://api.cloudflare.com/client/v4/graphql');
    assert.equal(options.headers.Authorization, `Bearer ${token}`);
    const {query} = JSON.parse(options.body);
    assert(query.includes('requestHost_in: ["www.travauxcorse.com","travauxcorse.com"]'));
    assert(query.includes('total: rumPageloadEventsAdaptiveGroups(limit: 1'));
    return {ok: true, json: async () => mockData};
  };
  const now = new Date('2026-11-12T12:00:00Z');
  const result = await audience({token, account, fetcher, now});
  assert.equal(result.pageViews, 24); assert.equal(result.visits, 8);
  assert.equal(result.daily.length, 7); assert.equal(result.daily[0].pageViews, 0);
  assert.equal(result.start, '2026-11-06'); assert.equal(result.pages[0].path, '/conseils/test/');
  assert(!JSON.stringify(result).includes(token));
  await audience({token, account, fetcher, now: new Date('2026-11-12T12:01:00Z')});
  assert.equal(calls, 1);
  await audience({token, account, fetcher, now: new Date('2026-11-12T12:06:00Z')});
  assert.equal(calls, 2);
});
test('Cloudflare access failures and partial GraphQL errors never appear as zero traffic', async () => {
  await assert.rejects(() => audience({token, account, days: 4}), TypeError);
  await assert.rejects(() => audience({token, account: 'bad'}));
  await assert.rejects(() => audience({token: 'new-token', account, fetcher: async () => ({ok: false})}));
  await assert.rejects(() => audience({token: 'new-token', account, fetcher: async () => ({ok: true, json: async () => ({...mockData, errors: [{message: 'secret error'}]})})}));
});
test('private statistics reject anonymous and forged sessions before any upstream request', async () => {
  process.env.CMS_SECRET = 'test-secret-for-session-signing-123456789';
  process.env.CMS_ADMIN_PASSWORD = 'test-password-123456789';
  const call = async (method = 'GET', cookie = '', url = '/api/audience?days=7') => {
    const headers = {}; const res = {setHeader: (k, v) => {headers[k] = v;}, end: value => {res.body = JSON.parse(value);}};
    await handler({method, url, headers: {cookie}}, res); return {...res, headers};
  };
  let r = await call(); assert.equal(r.statusCode, 401); assert.equal(r.headers['Cache-Control'], 'private, no-store');
  assert.equal((await call('GET', '__Host-tc-editor=forged.signature')).statusCode, 401);
  assert.equal((await call('POST')).statusCode, 405);
  const payload = Buffer.from(JSON.stringify({exp: Date.now() + 60000, nonce: 'test', password: crypto.createHash('sha256').update(process.env.CMS_ADMIN_PASSWORD).digest('hex')})).toString('base64url');
  const signature = crypto.createHmac('sha256', process.env.CMS_SECRET).update(payload).digest('base64url');
  const cookie = `__Host-tc-editor=${payload}.${signature}`;
  assert.equal((await call('GET', cookie, '/api/audience?days=999')).statusCode, 400);
  delete process.env.CLOUDFLARE_ANALYTICS_TOKEN;
  assert.equal((await call('GET', cookie)).statusCode, 503);
});
