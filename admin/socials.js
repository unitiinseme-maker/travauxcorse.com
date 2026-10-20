(()=>{
  const $=selector=>document.querySelector(selector);
  const form=$('#social-form'),login=$('#social-login'),status=$('#social-status');
  let csrf='',dirty=false,busy=false;
  const message=text=>{status.textContent=text;};
  async function json(response){const value=await response.json();if(!response.ok){if(response.status===401){form.hidden=true;login.hidden=false;}throw Error(value.error||'Service indisponible.');}return value;}
  async function load(){
    try{
      const session=await json(await fetch('/api/editorial',{cache:'no-store',credentials:'same-origin'}));
      if(!session.authenticated){form.hidden=true;login.hidden=false;message('Connectez-vous avec votre mot de passe privé de publication.');return;}
      csrf=session.csrf;
      const links=await json(await fetch('/api/social-links',{cache:'no-store'}));
      for(const name of ['facebook','instagram'])form.elements[name].value=links[name]||'';
      login.hidden=true;form.hidden=false;dirty=false;message('Un champ vide masque l’icône correspondante sur le site.');
    }catch(error){message(error.message);}
  }
  login.addEventListener('submit',async event=>{
    event.preventDefault();if(busy)return;busy=true;login.querySelector('button').disabled=true;
    try{await json(await fetch('/api/editorial',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'login',password:$('#social-password').value})}));$('#social-password').value='';await load();}catch(error){message(error.message);}finally{busy=false;login.querySelector('button').disabled=false;}
  });
  form.addEventListener('input',()=>{dirty=true;message('Modifications non enregistrées.');});
  form.addEventListener('submit',async event=>{
    event.preventDefault();if(busy)return;busy=true;form.querySelector('button').disabled=true;message('Enregistrement…');
    try{
      const links=await json(await fetch('/api/social-links',{method:'POST',cache:'no-store',credentials:'same-origin',headers:{'Content-Type':'application/json','X-CSRF-Token':csrf},body:JSON.stringify({facebook:form.elements.facebook.value.trim(),instagram:form.elements.instagram.value.trim()})}));
      for(const name of ['facebook','instagram'])form.elements[name].value=links[name];
      dirty=false;document.dispatchEvent(new Event('tc-social-links-updated'));message('Liens enregistrés. Le footer est à jour pour les visiteurs après actualisation.');
    }catch(error){message(error.message);}finally{busy=false;form.querySelector('button').disabled=false;}
  });
  window.addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue='';}});
  load();
})();
