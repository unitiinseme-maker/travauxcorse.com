const {list} = require('@vercel/blob');
let cached;
async function callbackCount(days, now = new Date()) {
  if (![1,7].includes(days)) throw Error('Invalid period');
  if (!process.env.BLOB_STORE_ID && !process.env.BLOB_READ_WRITE_TOKEN) return null;
  if (!cached || cached.until < Date.now()) {
    const paths = []; let cursor;
    do {
      const page = await list({prefix:'requests/callbacks/',limit:1000,cursor});
      paths.push(...page.blobs.map(b=>b.pathname)); cursor=page.hasMore?page.cursor:undefined;
      if (paths.length > 10000) throw Error('Callback count limit');
    } while (cursor);
    cached={paths,until:Date.now()+300000};
  }
  const end=now.toISOString().slice(0,10),start=new Date(Date.parse(end)-(days-1)*86400000).toISOString().slice(0,10);
  return cached.paths.filter(p=>{const date=p.match(/^requests\/callbacks\/(\d{4}-\d{2}-\d{2})\/[a-f0-9-]+\.json$/)?.[1];return date&&date>=start&&date<=end;}).length;
}
module.exports={callbackCount};
