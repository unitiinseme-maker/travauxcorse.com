'use strict';
// A real HTML directory: links remain available with JavaScript enabled or disabled.
const fs=require('node:fs'),path=require('node:path');
const {SITE_ORIGIN}=require('../lib/site-config');
const {e}=require('../lib/content-render');
function buildGuideDirectory(root=path.resolve(__dirname,'..')){
  const folder=path.join(root,'conseils'),route='/conseils/tous-les-guides/';
  const labels=[['electricien-','Électricité'],['plombier-','Plomberie'],['climatisation-','Climatisation'],['vmc-','Ventilation'],['menuiseries-exterieures-','Menuiseries extérieures'],['menuiseries-interieures-','Menuiseries intérieures'],['plaquiste-','Plâtrerie'],['isolation-','Isolation'],['macon-','Maçonnerie'],['carreleur-','Carrelage'],['peintre-','Peinture'],['couvreur-','Toiture'],['facadier-','Façades'],['travaux-','Guides par commune']];
  const groups=new Map(labels.map(([,name])=>[name,[]]));groups.set('Préparer son projet',[]);
  const decode=s=>s.replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>');
  for(const item of fs.readdirSync(folder,{withFileTypes:true})){
    if(!item.isDirectory()||item.name==='tous-les-guides')continue;
    const file=path.join(folder,item.name,'index.html');if(!fs.existsSync(file))continue;
    const html=fs.readFileSync(file,'utf8');if(/<meta[^>]*name="robots"[^>]*noindex/i.test(html))continue;
    const title=decode(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1].replace(/<[^>]*>/g,'')||item.name);
    const group=labels.find(([prefix])=>item.name.startsWith(prefix))?.[1]||'Préparer son projet';
    groups.get(group).push({title,url:SITE_ORIGIN+'/conseils/'+item.name+'/'});
  }
  const active=[...groups].filter(([,items])=>items.length);for(const [,items]of active)items.sort((a,b)=>a.title.localeCompare(b.title,'fr'));
  const pages=active.flatMap(([,items])=>items),layout=JSON.parse(fs.readFileSync(path.join(root,'lib/content-layout.json'),'utf8'));
  const title='Tous les guides travaux par métier et commune | TravauxCorse',description='Retrouvez les guides TravauxCorse par métier et commune : électricité, plomberie, rénovation, isolation, toiture et façades. Préparez votre projet en Corse.';
  const json=JSON.stringify({'@context':'https://schema.org','@type':'CollectionPage',name:title,description,url:SITE_ORIGIN+route,inLanguage:'fr-FR',mainEntity:{'@type':'ItemList',numberOfItems:pages.length,itemListElement:pages.map((p,i)=>({'@type':'ListItem',position:i+1,name:p.title,url:p.url}))}}).replace(/</g,'\\u003c');
  const sections=active.map(([name,items],i)=>`<section id="metier-${i}"><h2>${e(name)}</h2><ul>${items.map(p=>`<li><a href="${new URL(p.url).pathname}">${e(p.title)}</a></li>`).join('')}</ul></section>`).join('');
  const html=`<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><meta name="description" content="${description}"><link rel="canonical" href="${SITE_ORIGIN+route}"><link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="/styles.css"><meta property="og:type" content="website"><meta property="og:title" content="${title}"><meta property="og:description" content="${description}"><meta property="og:url" content="${SITE_ORIGIN+route}"><script type="application/ld+json">${json}</script></head><body class="editorial-page"><a class="skip-link" href="#main-content">Aller au contenu</a>${layout.header.replace(/ aria-current="page"/g,'').replace('href="/conseils/"','href="/conseils/" aria-current="page"')}<main id="main-content"><section class="editorial-hero"><div class="crumbs"><a href="/">Accueil</a> / <a href="/conseils/">Conseils & guides</a> / Tous les guides</div><h1>Tous les guides travaux par métier et commune</h1><p>Choisissez le métier et la commune du chantier pour préparer vos questions, les points à vérifier et votre demande de travaux en Corse.</p></section><div class="article-layout"><article class="article-body"><nav aria-label="Choisir un métier"><ul>${active.map(([name],i)=>`<li><a href="#metier-${i}">${e(name)}</a></li>`).join('')}</ul></nav>${sections}</article><aside class="article-aside"><strong>Votre projet en Corse</strong><p>TravauxCorse recherche les professionnels adaptés à vos besoins. Les disponibilités et les prestations restent à confirmer pour chaque demande.</p><a href="/deposer-une-demande/">Déposer mon projet</a></aside></div></main>${layout.footer}<script src="/navigation.js" defer></script></body></html>`;
  fs.mkdirSync(path.join(folder,'tous-les-guides'),{recursive:true});fs.writeFileSync(path.join(folder,'tous-les-guides','index.html'),html);
  return pages.length;
}
module.exports={buildGuideDirectory};
if(require.main===module)console.log('Directory generated: '+buildGuideDirectory()+' guides.');
