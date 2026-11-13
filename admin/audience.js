(() => {
  const $ = id => document.getElementById(id);
  const login = $('audience-login'), panel = $('audience-panel'), status = $('audience-status');
  const format = new Intl.NumberFormat('fr-FR');
  let data, busy = false;
  async function json(response) {
    const result = await response.json();
    if (!response.ok) {
      if (response.status === 401) {panel.hidden = true; login.hidden = false; data = null;}
      throw Error(result.error || 'Statistiques indisponibles.');
    }
    return result;
  }
  function rows(id, values, columns) {
    const body = $(id); body.replaceChildren();
    for (const value of values) {
      const tr = document.createElement('tr');
      for (const column of columns) {const td = document.createElement('td'); td.textContent = column(value); tr.append(td);}
      body.append(tr);
    }
    if (!values.length) {
      const tr = document.createElement('tr'), td = document.createElement('td');
      td.colSpan = columns.length; td.textContent = 'Aucune donnée reçue pour cette période.'; tr.append(td); body.append(tr);
    }
  }
  async function load() {
    if (busy) return;
    busy = true; $('audience-period').disabled = true; $('audience-refresh').disabled = true; $('audience-export').disabled = true;
    status.textContent = 'Récupération des statistiques…';
    try {
      data = await json(await fetch(`/api/audience?days=${$('audience-period').value}`, {credentials: 'same-origin', cache: 'no-store'}));
      login.hidden = true; panel.hidden = false;
      $('audience-views').textContent = format.format(data.pageViews);
      $('audience-visits').textContent = format.format(data.visits);
      $('audience-callbacks').textContent = data.callbackRequests === null || data.callbackRequests === undefined ? 'Indisponible' : format.format(data.callbackRequests);
      const date = s => new Date(`${s}T00:00:00Z`).toLocaleDateString('fr-FR', {timeZone: 'UTC'});
      $('audience-range').textContent = `Du ${date(data.start)} au ${date(data.end)} inclus.`;
      rows('audience-daily', [...data.daily].reverse(), [r => date(r.date), r => format.format(r.pageViews), r => format.format(r.visits)]);
      rows('audience-pages', data.pages, [r => r.path || '/', r => format.format(r.pageViews)]);
      rows('audience-sources', data.sources, [r => r.host || 'Origine non transmise', r => format.format(r.pageViews)]);
      status.textContent = `Dernière récupération : ${new Date(data.updatedAt).toLocaleString('fr-FR')}. Cache de 5 minutes maximum.`;
      $('audience-export').disabled = false;
    } catch (error) {data = null; status.textContent = error.message;}
    finally {busy = false; $('audience-period').disabled = false; $('audience-refresh').disabled = false;}
  }
  login.addEventListener('submit', async event => {
    event.preventDefault(); if (busy) return;
    const button = login.querySelector('button'); button.disabled = true;
    try {
      await json(await fetch('/api/editorial', {method: 'POST', credentials: 'same-origin', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({action: 'login', password: $('audience-password').value})}));
      $('audience-password').value = ''; await load();
    } catch (error) {status.textContent = error.message;}
    finally {button.disabled = false;}
  });
  $('audience-refresh').addEventListener('click', load);
  $('audience-period').addEventListener('change', load);
  $('audience-export').addEventListener('click', () => {
    if (!data) return;
    const quote = value => `"${String(value).replace(/^[=+@\-\t\r]/, "'$&").replaceAll('"', '""')}"`;
    const records = [['Période', data.start, data.end], ['Mesure', 'Valeur'], ['Pages vues', data.pageViews], ['Visites Cloudflare', data.visits], ['Demandes de rappel enregistrées', data.callbackRequests ?? 'Indisponible'], [], ['Date UTC', 'Pages vues', 'Visites Cloudflare'], ...data.daily.map(r => [r.date, r.pageViews, r.visits]), [], ['Page', 'Pages vues'], ...data.pages.map(r => [r.path || '/', r.pageViews]), [], ['Origine', 'Pages vues'], ...data.sources.map(r => [r.host || 'Origine non transmise', r.pageViews])];
    const url = URL.createObjectURL(new Blob(['\ufeff' + records.map(row => row.map(quote).join(';')).join('\r\n')], {type: 'text/csv;charset=utf-8'}));
    const a = document.createElement('a'); a.href = url; a.download = `TravauxCorse-statistiques-${data.start}-${data.end}.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  setInterval(() => {if (!document.hidden && !panel.hidden) load();}, 300000);
  load();
})();
