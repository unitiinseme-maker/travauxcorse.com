(()=>{
  const $=selector=>document.querySelector(selector);
  const status=$('#category-status'),login=$('#category-login'),privateArea=$('#category-private'),list=$('#category-list');
  let categories=[],csrf='',busy=false;
  const message=value=>{status.textContent=value;};
  async function json(response){const data=await response.json();if(!response.ok)throw Error(data.error||'Opération impossible.');return data;}
  function row(item,index){
    const article=document.createElement('article');article.className='category-admin-row';
    const number=document.createElement('span');number.className='category-position';number.textContent=String(index+1);article.append(number);
    const label=document.createElement('label');label.textContent='Nom du métier';const input=document.createElement('input');input.value=item.name;input.maxLength=100;input.required=true;input.addEventListener('input',()=>{item.name=input.value;message('Modifications non enregistrées.');});label.append(input);article.append(label);
    const active=document.createElement('label');active.className='category-active';const checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.checked=item.active;checkbox.addEventListener('change',()=>{item.active=checkbox.checked;message('Modifications non enregistrées.');});active.append(checkbox,document.createTextNode(' Publiée'));article.append(active);
    const actions=document.createElement('div');actions.className='category-row-actions';
    function button(text,handler,cls='secondary'){const element=document.createElement('button');element.type='button';element.className=cls;element.textContent=text;element.addEventListener('click',handler);actions.append(element);}
    button('Monter',()=>move(index,-1));button('Descendre',()=>move(index,1));button('Supprimer',()=>{if(!confirm('Supprimer définitivement cette catégorie ?'))return;categories.splice(index,1);render();message('Suppression non enregistrée.');},'danger-btn');article.append(actions);return article;
  }
  function render(){list.replaceChildren(...categories.map(row));}
  function move(index,direction){const other=index+direction;if(other<0||other>=categories.length)return;[categories[index],categories[other]]=[categories[other],categories[index]];render();message('Nouvel ordre non enregistré.');}
  async function load(){
    try{
      const session=await json(await fetch('/api/editorial',{cache:'no-store',credentials:'same-origin'}));
      if(!session.authenticated){login.hidden=false;privateArea.hidden=true;message('Connectez-vous avec votre mot de passe privé de publication.');return;}
      csrf=session.csrf;
      categories=await json(await fetch('/api/categories?admin=1',{cache:'no-store',credentials:'same-origin'}));
      login.hidden=true;privateArea.hidden=false;render();message(categories.length+' catégories enregistrées.');
    }catch(error){message(error.message);}
  }
  login.addEventListener('submit',async event=>{event.preventDefault();message('Connexion…');try{await json(await fetch('/api/editorial',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'login',password:$('#category-password').value})}));$('#category-password').value='';await load();}catch(error){message(error.message);}});
  $('#category-add').addEventListener('click',()=>{categories.push({id:'metier-'+crypto.randomUUID(),name:'',active:false});render();list.lastElementChild?.querySelector('input')?.focus();message('Nouvelle catégorie non enregistrée.');});
  $('#category-save').addEventListener('click',async()=>{
    if(busy)return;
    const names=categories.map(item=>item.name.trim());
    if(names.some(name=>!name)){message('Indiquez un nom pour chaque catégorie avant d’enregistrer.');return;}
    busy=true;$('#category-save').disabled=true;message('Enregistrement…');
    try{
      const result=await json(await fetch('/api/categories',{method:'POST',cache:'no-store',credentials:'same-origin',headers:{'Content-Type':'application/json','X-CSRF-Token':csrf},body:JSON.stringify({categories})}));
      categories=result.categories;render();message('Catégories enregistrées. Les catégories publiées sont maintenant visibles par tous.');
    }catch(error){message(error.message);}finally{busy=false;$('#category-save').disabled=false;}
  });
  load();
})();
