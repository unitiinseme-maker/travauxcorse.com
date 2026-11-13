const crypto = require('node:crypto');
const {get, put} = require('@vercel/blob');
const {sendEmail, emailConfigured} = require('../lib/artisan-accounts');
const {allowedAdminOrigin} = require('../lib/site-config');
const EMAIL = 'contact.travauxcorse@gmail.com';
const WINDOW = 15 * 60 * 1000;
const MAX_BODY = 7000;
const clean = (value, max) => typeof value === 'string' ? value.trim().slice(0, max) : '';
const validPhone = value => /^[+0-9() .-]+$/.test(value) && value.replace(/\D/g, '').length >= 8 && value.replace(/\D/g, '').length <= 15;
function createHandler(deps = {}) {
  const read = deps.get || get, write = deps.put || put, email = deps.sendEmail || sendEmail;
  const configured = deps.emailConfigured || emailConfigured;
  const attempts = new Map();
  return async function(req, res) {
    res.setHeader('Cache-Control', 'no-store'); res.setHeader('X-Content-Type-Options', 'nosniff');
    const reply = (status, value) => {
      res.statusCode = status;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify(value));
    };
    if (req.method !== 'POST') {res.setHeader('Allow', 'POST'); return reply(405, {error: 'Méthode non autorisée.'});}
    if (!allowedAdminOrigin(req) || !/^application\/json(?:;|$)/i.test(req.headers['content-type'] || '')) return reply(403, {error: 'Rechargez le formulaire pour réessayer.'});
    try {
      let body = req.body;
      if (body === undefined) {
        let raw = ''; for await (const part of req) {raw += part; if (Buffer.byteLength(raw) > MAX_BODY) return reply(413, {error: 'Demande trop volumineuse.'});}
        body = JSON.parse(raw);
      } else if (typeof body === 'string') body = JSON.parse(body);
      if (!body || Array.isArray(body) || typeof body !== 'object' || Buffer.byteLength(JSON.stringify(body)) > MAX_BODY) return reply(400, {error: 'Demande invalide.'});
      if (body.website) return reply(400, {error: 'Vérifiez les champs du formulaire.'});
      const name = clean(body.name, 120), phone = clean(body.phone, 25), commune = clean(body.commune, 100);
      const contactEmail = clean(body.email, 254), trade = clean(body.trade, 100) || 'À préciser ensemble', description = clean(body.description, 2000);
      const originPath = clean(body.originPath, 240), source = /^\/(?!\/)[a-zA-Z0-9/_-]*\/?$/.test(originPath) ? originPath : '/';
      if (!name || !commune || !validPhone(phone) || body.contactConsent !== 'oui' || (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(body.requestId || '')) return reply(400, {error: 'Vérifiez votre nom, votre téléphone, votre commune et votre accord de contact.'});
      if (!process.env.BLOB_STORE_ID && !process.env.BLOB_READ_WRITE_TOKEN) return reply(503, {error: 'Le formulaire est momentanément indisponible. Appelez le 07 71 81 50 90.'});
      const now = Date.now(), identity = crypto.createHash('sha256').update(String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0]).digest('hex');
      for (const [key, value] of attempts) if (value.until <= now) attempts.delete(key);
      const attempt = attempts.get(identity) || {count: 0, until: now + WINDOW};
      if (attempt.count >= 5 || (!attempts.has(identity) && attempts.size >= 10000)) {res.setHeader('Retry-After', '900'); return reply(429, {error: 'Trop de demandes rapprochées. Réessayez plus tard ou appelez-nous.'});}
      attempt.count++; attempts.set(identity, attempt);
      const date = new Date(now).toISOString(), path = `requests/callbacks/${date.slice(0, 10)}/${body.requestId.toLowerCase()}.json`;
      const existing = await read(path, {access: 'private', useCache: false});
      if (existing?.statusCode === 200) return reply(200, {received: true});
      const item = {date, name, phone, email: contactEmail, commune, trades: trade, title: `Rappel demandé — ${trade}`.slice(0, 160), delay: 'À convenir par téléphone', budget: '', property: '', surface: '', description, details: `Demande de rappel. Page d’origine : ${source}`, status: 'Demande reçue', assignedArtisans: [], history: [{at: date, text: 'Demande de rappel reçue depuis le site.'}]};
      await write(path, JSON.stringify(item), {access: 'private', contentType: 'application/json', addRandomSuffix: false});
      let notified = false;
      try {
        if (configured()) {
          const content = ['Nouvelle demande de rappel TravauxCorse', '', `Nom : ${name}`, `Téléphone : ${phone}`, `Commune : ${commune}`, `Travaux : ${trade}`, `Email : ${contactEmail || 'Non renseigné'}`, `Projet : ${description || 'À préciser par téléphone'}`, `Page d’origine : ${source}`, 'Accord de contact : Oui', '', 'La demande est enregistrée dans votre administration : https://www.travauxcorse.com/admin/demandes/'].join('\n');
          notified = !!(await email(EMAIL, 'TravauxCorse — Demande de rappel à ' + commune.replace(/[\r\n]/g, ' '), content)).sent;
        }
      } catch { /* The private lead is kept even if the email provider fails. */ }
      if (!notified) {
        item.details += '\nNotification email non confirmée : demande conservée dans l’administration.';
        try {await write(path, JSON.stringify(item), {access: 'private', contentType: 'application/json', allowOverwrite: true, addRandomSuffix: false});} catch {console.error('Callback notification flag could not be saved');}
      }
      return reply(200, {received: true});
    } catch (error) {
      return reply(error instanceof SyntaxError ? 400 : 503, {error: error instanceof SyntaxError ? 'Demande invalide.' : 'L’enregistrement n’a pas été confirmé. Réessayez ou appelez le 07 71 81 50 90.'});
    }
  };
}
module.exports = createHandler();
module.exports.createHandler = createHandler;
