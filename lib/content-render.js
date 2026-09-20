const {createHash} = require('node:crypto');
const layout = require('./content-layout.json');
const e = value => String(value || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const section = doc => doc.kind === 'guide' ? 'conseils' : 'realisations';
const pathFor = doc => `${section(doc)}/${doc.slug}/index.html`;
const urlFor = doc => `/${section(doc)}/${doc.slug}/`;
function media(image) {
  const match = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(image.data);
  if (!match) throw Error('Image non valide.');
  const bytes = Buffer.from(match[2], 'base64');
  const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
  return {path:`media/editorial/${createHash('sha256').update(bytes).digest('hex')}.${ext}`, bytes};
}
function bodyHtml(text) {
  return text.split(/\n\s*\n/).map(block => {
    if (block.startsWith('## ')) return `<h2>${e(block.slice(3))}</h2>`;
    if (block.split('\n').every(line => line.startsWith('- '))) return `<ul>${block.split('\n').map(line => `<li>${e(line.slice(2))}</li>`).join('')}</ul>`;
    return `<p>${e(block).replace(/\n/g,'<br>')}</p>`;
  }).join('');
}
function page(doc) {
  const url = 'https://travauxcorse.com' + urlFor(doc);
  const images = doc.images.map(img => `<figure><img src="/${media(img).path}" alt="${e(img.caption || doc.title)}" loading="lazy"><figcaption>${e(img.caption)}</figcaption></figure>`).join('');
  const header = layout.header.replace(/ aria-current="page"/g,'').replace(`href="/${section(doc)}/"`, `href="/${section(doc)}/" aria-current="page"`);
  const json = JSON.stringify({'@context':'https://schema.org','@type':doc.kind === 'guide' ? 'Article' : 'CreativeWork',headline:doc.title,description:doc.summary,url}).replace(/</g,'\\u003c');
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${e(doc.title)} | TravauxCorse</title><meta name="description" content="${e(doc.summary)}"><link rel="canonical" href="${url}"><link rel="stylesheet" href="/styles.css"><link rel="icon" href="/favicon.svg" type="image/svg+xml"><meta property="og:type" content="article"><meta property="og:title" content="${e(doc.title)}"><meta property="og:description" content="${e(doc.summary)}"><meta property="og:url" content="${url}"><meta property="og:image" content="https://travauxcorse.com/social-card.png"><meta name="twitter:card" content="summary_large_image"><script type="application/ld+json">${json}</script></head><body class="editorial-page"><a class="skip-link" href="#main-content">Aller au contenu</a>${header}<main id="main-content"><section class="editorial-hero"><div class="crumbs"><a href="/">Accueil</a> / <a href="/${section(doc)}/">${doc.kind === 'guide' ? 'Conseils & guides' : 'Réalisations'}</a></div><h1>${e(doc.title)}</h1><p>${e(doc.summary)}</p>${doc.commune ? `<p>${e(doc.commune)}${doc.trades ? ' · '+e(doc.trades) : ''}</p>` : ''}</section><div class="article-layout"><article class="article-body">${bodyHtml(doc.body)}<div class="content-gallery">${images}</div></article><aside class="article-aside"><strong>Un projet en Corse ?</strong><p>Décrivez vos travaux et les métiers nécessaires.</p><a href="/deposer-une-demande/">Déposer mon projet</a></aside></div></main>${layout.footer}<script src="/navigation.js" defer></script></body></html>`;
}
function cards(docs) {
  if (!docs.length) return '<div class="reference-empty"><h2>Les premières réalisations seront publiées ici.</h2><p>Découvrez prochainement nos chantiers réels, leurs contraintes et les solutions apportées.</p></div>';
  return `<div class="guide-grid">${docs.map(doc=>`<article class="guide-card" ${doc.kind === 'realisation' ? `data-project-trades="${e(doc.trades || '')}"` : ''}>${doc.images[0] ? `<img class="content-cover" src="/${media(doc.images[0]).path}" alt="${e(doc.images[0].caption || doc.title)}" loading="lazy">` : ''}<small>${e(doc.commune || (doc.kind === 'guide' ? 'Conseils & guides' : 'Réalisation'))}</small><h2>${e(doc.title)}</h2><p>${e(doc.summary)}</p><a href="${urlFor(doc)}">${doc.kind === 'guide' ? 'Lire le guide' : 'Voir la réalisation'} →</a></article>`).join('')}</div>`;
}
module.exports = {e, section, pathFor, urlFor, media, page, cards};
