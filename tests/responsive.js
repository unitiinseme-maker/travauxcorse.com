'use strict';
const route=document.querySelector('#route'), preview=document.querySelector('#preview'), width=document.querySelector('#width'), output=document.querySelector('#results'), button=document.querySelector('#run');
const widths=[320,375,390,430,768,1024,1280,1440,1920];
function show(){preview.style.width=width.value+'px';preview.src=route.value;}
route.onchange=show;width.onchange=show;show();
button.onclick=async()=>{
 button.disabled=true;const results=[];
 for(const w of widths){
  const frame=document.createElement('iframe');frame.title='Test '+w;frame.style.cssText=`width:${w}px;height:900px;border:0;position:absolute;left:0;top:0;visibility:hidden`;document.body.appendChild(frame);
  await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('Page indisponible')),15000);frame.onload=()=>{clearTimeout(timeout);resolve();};frame.src=route.value;});
  await new Promise(resolve=>setTimeout(resolve,150));
  const doc=frame.contentDocument,win=frame.contentWindow;
  const overflow=[...doc.querySelectorAll('main *,header *,footer *')].filter(el=>{const b=el.getBoundingClientRect(),style=win.getComputedStyle(el);return b.width>0&&style.position!=='absolute'&&style.position!=='fixed'&&(b.right>doc.documentElement.clientWidth+1||b.left< -1);}).slice(0,10).map(el=>el.tagName+'.'+el.className);
  const menu=doc.querySelector('[data-tc-menu]'),nav=doc.querySelector('.tc-nav');
  let mobileMenu=null;
  if(w<768&&menu){menu.click();mobileMenu=menu.getAttribute('aria-expanded')==='true'&&win.getComputedStyle(nav).display!=='none';menu.click();mobileMenu=mobileMenu&&menu.getAttribute('aria-expanded')==='false'&&win.getComputedStyle(nav).display==='none';}
  results.push({width:w,overflow:doc.documentElement.scrollWidth>doc.documentElement.clientWidth,offscreen:overflow,desktopMenu:w>=768?win.getComputedStyle(menu).display==='none'&&win.getComputedStyle(nav).display!=='none':null,mobileMenu,h1:doc.querySelectorAll('h1').length});
  frame.remove();output.textContent=JSON.stringify(results,null,2);document.querySelector('#status').textContent=`${results.length}/9 largeurs contrôlées`;
 }
 button.disabled=false;
};
const allButton=document.createElement('button');allButton.type='button';allButton.className='secondary';allButton.textContent='Tester toutes les pages';button.after(allButton);
allButton.onclick=async()=>{allButton.disabled=true;const allResults={};try{for(const option of route.options){route.value=option.value;await button.onclick();allResults[option.textContent]=JSON.parse(output.textContent);}output.textContent=JSON.stringify(allResults,null,2);document.querySelector('#status').textContent='Terminé : '+Object.keys(allResults).length+' pages et '+Object.values(allResults).flat().length+' contrôles';}catch(error){document.querySelector('#status').textContent=error.message;}finally{allButton.disabled=false;}};
