const {cmsConfig, cmsSession} = require('./editorial');
const {audience} = require('../lib/audience');
const {callbackCount} = require('../lib/callback-count');
module.exports = async function(req, res) {
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  const send = (status, value) => {res.statusCode = status; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.end(JSON.stringify(value));};
  if (req.method !== 'GET') {res.setHeader('Allow', 'GET'); return send(405, {error: 'Méthode non autorisée.'});}
  const config = cmsConfig();
  if (!config.secret || !config.password || !cmsSession(req, config)) return send(401, {error: 'Connexion administrateur nécessaire.'});
  const raw = new URL(req.url, 'https://www.travauxcorse.com').searchParams.get('days') || '7';
  if (!['1', '7'].includes(raw)) return send(400, {error: 'Choisissez aujourd’hui ou les 7 derniers jours.'});
  const token = process.env.CLOUDFLARE_ANALYTICS_TOKEN, account = process.env.CLOUDFLARE_ANALYTICS_ACCOUNT_ID;
  if (!token || !account) return send(503, {error: 'La connexion aux statistiques n’est pas encore configurée.'});
  try {
    const [report, callbacks] = await Promise.all([audience({token, account, days: Number(raw)}), callbackCount(Number(raw)).catch(() => null)]);
    return send(200, {...report, callbackRequests:callbacks});
  }
  catch {return send(503, {error: 'Cloudflare ne répond pas ou l’accès a expiré. Réessayez plus tard.'});}
};
