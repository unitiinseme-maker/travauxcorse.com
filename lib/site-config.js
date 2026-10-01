// Official public address. Keep the existing deployment available during DNS setup.
const SITE_ORIGIN = 'https://www.travauxcorse.com';
const LEGACY_ORIGIN = 'https://travauxcorse-com.vercel.app';
function allowedAdminOrigin(req) {
  const origin = req.headers.origin;
  const configured = (process.env.CMS_ALLOWED_ORIGIN || '').split(',').map(value => value.trim()).filter(Boolean);
  const allowed = [SITE_ORIGIN, 'https://travauxcorse.com', LEGACY_ORIGIN, ...configured];
  if (typeof origin !== 'string' || !allowed.includes(origin)) return false;
  // Never accept a request from another origin when the target host is available.
  return !req.headers.host || origin === `https://${req.headers.host}`;
}
module.exports = {SITE_ORIGIN, LEGACY_ORIGIN, allowedAdminOrigin};
