(() => {
  if (/^\/(admin|artisan|client|api|tests)(\/|$)/.test(location.pathname) || window.tcLeadCaptureInstalled) return;
  window.tcLeadCaptureInstalled = true;
  const drafts = new Map();
  let choices;
  async function categories() {
    if (!choices) choices = fetch('/api/categories', {credentials:'omit'}).then(r => r.ok ? r.json() : []).catch(() => []);
    const items = await choices;
    return Array.isArray(items) ? items.filter(x => typeof x?.name === 'string').map(x => x.name) : [];
  }
  function render(mount) {
    if (mount.dataset.ready) return;
    mount.dataset.ready = 'true';
    const key = mount.dataset.leadCapture || 'page';
    const requestedOrigin = new URLSearchParams(location.search).get('depuis');
    const draft = drafts.get(key) || {requestId: crypto.randomUUID(), originPath: requestedOrigin && /^\/(?!\/)[a-zA-Z0-9/_-]*\/?$/.test(requestedOrigin) ? requestedOrigin : location.pathname};
    drafts.set(key, draft);
    const form = document.createElement('form'); form.className = 'lead-form'; form.dataset.leadForm = ''; form.noValidate = false;
    if (draft.received) { showSuccess(form); mount.append(form); return; }
    form.innerHTML = `<p class="lead-intro">Laissez vos coordonnées : TravauxCorse vous recontacte pour préciser vos travaux et rechercher les professionnels adaptés.</p><div class="lead-grid"><label>Nom et prénom<input name="name" autocomplete="name" maxlength="120" required></label><label>Téléphone<input name="phone" type="tel" inputmode="tel" autocomplete="tel" maxlength="25" required placeholder="06 ou 07…"></label><label class="lead-full">Commune du chantier<input name="commune" autocomplete="address-level2" maxlength="100" required placeholder="Ex. : Bastia, Ajaccio, Borgo…"></label></div><details class="lead-details"><summary>Préciser mes travaux (facultatif)</summary><label>Votre besoin<select name="trade"><option value="">À préciser ensemble</option></select></label><label>Quelques mots sur votre projet<textarea name="description" maxlength="2000" rows="3" placeholder="Ex. : remplacer une baignoire par une douche"></textarea></label><label>Email (facultatif)<input name="email" type="email" autocomplete="email" maxlength="254"></label></details><div class="lead-trap" aria-hidden="true"><label>Votre site web<input name="website" tabindex="-1" autocomplete="off"></label></div><label class="lead-consent"><input name="contactConsent" type="checkbox" value="oui" required><span>J’accepte que TravauxCorse utilise mes coordonnées pour me recontacter au sujet de mon projet. <a href="/confidentialite/">Confidentialité</a></span></label><button class="primary" type="submit">Être rappelé pour mon projet</button><p class="lead-status" role="status" aria-live="polite" tabindex="-1"></p><p class="lead-small">Gratuit · Sans engagement · Sans compte à créer</p>`;
    for (const name of ['name','phone','commune','description','email']) form.elements[name].value = draft[name] || '';
    form.elements.contactConsent.checked = !!draft.contactConsent;
    categories().then(names => {
      if (!form.isConnected) return;
      const select = form.elements.trade;
      for (const name of names) {const option = document.createElement('option'); option.value = name; option.textContent = name; select.append(option);}
      select.value = draft.trade || '';
    });
    const update = () => {
      for (const [name, value] of new FormData(form)) if (name !== 'website') draft[name] = value;
      draft.contactConsent = form.elements.contactConsent.checked ? 'oui' : '';
    };
    form.addEventListener('input', update); form.addEventListener('change', update);
    form.addEventListener('submit', async event => {
      event.preventDefault(); if (draft.sending || !form.reportValidity()) return;
      update();
      const button = form.querySelector('button[type="submit"]'), status = form.querySelector('.lead-status');
      if (!/^[+0-9() .-]+$/.test(draft.phone || '') || !/^\d{8,15}$/.test((draft.phone || '').replace(/\D/g,''))) {status.textContent = 'Indiquez un numéro de téléphone valide.'; form.elements.phone.focus(); return;}
      draft.sending = true; button.disabled = true; status.textContent = 'Enregistrement de votre demande…';
      try {
        const response = await fetch('/api/ingest-request?callback=1', {method:'POST', credentials:'same-origin', headers:{'Content-Type':'application/json'}, body:JSON.stringify({...draft, sending:undefined, website:form.elements.website.value}), signal:AbortSignal.timeout(25000)});
        const result = await response.json();
        if (!response.ok || !result.received) throw Error(result.error || 'L’enregistrement n’a pas été confirmé. Réessayez.');
        drafts.set(key, {received:true});
        document.querySelectorAll('[data-lead-capture]').forEach(node => {
          if ((node.dataset.leadCapture || 'page') === key) { const activeForm = node.querySelector('form'); if (activeForm) showSuccess(activeForm); }
        });
        if (typeof window.gtag === 'function' && !window['ga-disable-G-ZE60839KNB']) window.gtag('event','generate_lead',{lead_type:'callback',method:'website'});
      } catch (error) {status.textContent = error.name === 'TimeoutError' ? 'La réponse prend trop de temps. Réessayez : votre demande ne sera pas envoyée deux fois.' : error.message; status.focus();}
      finally {draft.sending = false; if (button.isConnected) button.disabled = false;}
    });
    mount.append(form);
  }
  function showSuccess(form) {
    form.innerHTML = '<div class="lead-success" role="status" tabindex="-1"><strong>Votre demande de rappel est bien enregistrée.</strong><p>TravauxCorse vous recontactera au numéro indiqué pour préciser votre projet. Aucun devis ni engagement n’est pris à cette étape.</p><a href="tel:+33771815090">Besoin de nous joindre ? 07 71 81 50 90</a></div>';
    form.querySelector('.lead-success').focus();
  }
  function enhance() {
    document.querySelectorAll('[data-lead-capture]').forEach(render);
    if (/^\/conseils\/[^/]+\/?$/.test(location.pathname)) {
      const aside = document.querySelector('.article-aside');
      if (aside && !aside.querySelector('[data-callback-link]')) {
        const link = document.createElement('a'); link.dataset.callbackLink = ''; link.href = '/etre-rappele/?depuis=' + encodeURIComponent(location.pathname); link.textContent = 'Je préfère être rappelé'; link.className = 'callback-secondary'; aside.append(link);
      }
    }
  }
  new MutationObserver(enhance).observe(document.body, {childList:true, subtree:true});
  enhance();
})();
