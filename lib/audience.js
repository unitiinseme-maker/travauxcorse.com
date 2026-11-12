const HOSTS = ['www.travauxcorse.com', 'travauxcorse.com'];
const cache = new Map();
const TTL = 5 * 60 * 1000;

async function audience({ token, account, days = 7, fetcher = fetch, now = new Date() }) {
  if (![1, 7].includes(days)) throw new TypeError('Période invalide.');
  if (!token || !/^[a-f0-9]{32}$/.test(account || '')) throw Error('Configuration indisponible.');
  const end = now.toISOString().slice(0, 10);
  const start = new Date(Date.parse(end) - (days - 1) * 86400000).toISOString().slice(0, 10);
  const key = `${account}:${days}:${end}:${token}`;
  const cached = cache.get(key);
  if (cached && cached.until > now.getTime()) return cached.data;
  const filter = `date_geq: "${start}", date_leq: "${end}", requestHost_in: ${JSON.stringify(HOSTS)}`;
  const query = `{viewer {accounts(filter: {accountTag: "${account}"}) {
    total: rumPageloadEventsAdaptiveGroups(limit: 1, filter: {${filter}}) {count sum {visits}}
    daily: rumPageloadEventsAdaptiveGroups(limit: 90, filter: {${filter}}, orderBy: [date_ASC]) {count sum {visits} dimensions {date}}
    pages: rumPageloadEventsAdaptiveGroups(limit: 20, filter: {${filter}}, orderBy: [count_DESC]) {count dimensions {requestPath}}
    sources: rumPageloadEventsAdaptiveGroups(limit: 15, filter: {${filter}}, orderBy: [count_DESC]) {count dimensions {refererHost}}
  }}}`;
  const response = await fetcher('https://api.cloudflare.com/client/v4/graphql', {
    method: 'POST', headers: {Authorization: `Bearer ${token}`, 'Content-Type': 'application/json'},
    body: JSON.stringify({query}), signal: AbortSignal.timeout(15000)
  });
  if (!response.ok) throw Error('Cloudflare indisponible.');
  const result = await response.json();
  const data = result.data?.viewer?.accounts?.[0];
  if (result.errors?.length || !data || !Array.isArray(data.total) || !Array.isArray(data.daily) || !Array.isArray(data.pages) || !Array.isArray(data.sources)) throw Error('Statistiques indisponibles.');
  const metric = row => ({pageViews: Number(row?.count) || 0, visits: Number(row?.sum?.visits) || 0});
  const daily = new Map(data.daily.map(row => [row.dimensions.date, metric(row)]));
  const value = {
    source: 'Cloudflare Web Analytics', start, end, timezone: 'UTC', days,
    updatedAt: now.toISOString(), ...metric(data.total[0]),
    daily: Array.from({length: days}, (_, i) => {
      const date = new Date(Date.parse(start) + i * 86400000).toISOString().slice(0, 10);
      return {date, ...(daily.get(date) || {pageViews: 0, visits: 0})};
    }),
    pages: data.pages.map(row => ({path: row.dimensions.requestPath, pageViews: metric(row).pageViews})),
    sources: data.sources.map(row => ({host: row.dimensions.refererHost || '', pageViews: metric(row).pageViews}))
  };
  for (const [k, v] of cache) if (v.until <= now.getTime()) cache.delete(k);
  cache.set(key, {until: now.getTime() + TTL, data: value});
  return value;
}
module.exports = {audience};
