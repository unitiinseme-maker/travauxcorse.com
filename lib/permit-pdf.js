// Compact, server-side PDF. No network requests or changes to stored records.
const PDFDocument=require('pdfkit');
const {company}=require('./permit-contact');
const missing='Non disponible';
function text(v){
  if(v===null||v===undefined||v==='')return missing;
  let value=String(v);
  // Repair reversible UTF-8/Latin-1 display corruption without changing stored data.
  for(let i=0;i<2&&/[ÃÂ]/.test(value)&&[...value].every(c=>c.charCodeAt(0)<=255);i++){
    const bytes=Buffer.from(value,'latin1'),decoded=bytes.toString('utf8');
    if(decoded.includes('�')||!Buffer.from(decoded,'utf8').equals(bytes))break;
    value=decoded;
  }
  return value.replace(/[\u0000-\u0008\u000b-\u001f\u007f-\u009f]/g,'');
}
const unique=values=>[...new Set(values.filter(Boolean).map(String))];
const date=value=>/^\d{4}-\d{2}-\d{2}/.test(value||'')?value.slice(0,10).split('-').reverse().join('/'):text(value);
function row(p,f={}){
  const r=p.businessResearch||{},co=company(p.fields);
  const phones=unique([f.contactPhone,r.phone]),emails=unique([f.contactEmail,r.email]);
  // Keep uncertain/intermediary contacts visibly qualified, without copying research reports.
  const caveat=/intermédiaire|indirect|mairie|exploitant/i.test(r.note||'')?'Piste / intermédiaire possible : voir fiche.':'Coordonnées à confirmer dans la fiche.';
  return [
    [text(p.commune||p.communeCode)+' ('+text(p.dept)+')','Terrain : '+text(p.address)].join('\n'),
    [text(p.nature),[p.type,p.number].filter(Boolean).join(' ')||missing,date(p.date),[p.area!=null?p.area+' m²':null,p.homes!=null?p.homes+' logement(s)':null].filter(Boolean).join(' | ')||'Surface / logements : Non disponible'].join('\n'),
    unique([co?.name||missing,f.contactName&&'Contact : '+f.contactName]).join('\n'),
    ['Tél. : '+(phones.join(' / ')||missing),'Email : '+(emails.join(' / ')||missing),...(phones.length||emails.length?[caveat]:[])].join('\n'),
    ['Potentiel : '+text(p.potentialLabel),f.status||'À étudier',...(f.nextAction?['Action : '+f.nextAction]:[]),...(f.nextDate?[date(f.nextDate)]:[])].join('\n')
  ];
}
function wrap(doc,value,width){
  const out=[];
  for(const paragraph of text(value).split('\n')){
    let line='';
    for(const word of paragraph.split(/\s+/)){
      const candidate=line?line+' '+word:word;
      if(doc.widthOfString(candidate)<=width){line=candidate;continue;}
      if(line){out.push(line);line='';}
      for(const char of word){if(line&&doc.widthOfString(line+char)>width){out.push(line);line='';}line+=char;}
    }
    out.push(line);
  }
  return out;
}
function renderRows(rows,selection='Filtres appliqués'){
  return new Promise((resolve,reject)=>{
    const doc=new PDFDocument({size:'A4',layout:'landscape',margin:28,bufferPages:true,info:{Title:`TravauxCorse - ${rows.length} projets`,Author:'TravauxCorse',Subject:'Liste commerciale confidentielle'}});
    const chunks=[];doc.on('data',chunk=>chunks.push(chunk));doc.on('end',()=>resolve(Buffer.concat(chunks)));doc.on('error',reject);
    try{
      doc.registerFont('Body',require('node:path').join(__dirname,'fonts/LiberationSans-Regular.ttf'));
      doc.registerFont('Bold',require('node:path').join(__dirname,'fonts/LiberationSans-Bold.ttf'));
      const widths=[119,177,138,235,117],left=28,total=widths.reduce((a,b)=>a+b,0),bottom=doc.page.height-48,lineHeight=10.5,pad=6;
      let y;
      const header=()=>{
        doc.fillColor('#192d39').font('Bold').fontSize(17).text('TravauxCorse | Liste commerciale',left,26,{lineBreak:false});
        doc.font('Body').fontSize(9).text(`${rows.length} projets - Export du ${new Date().toLocaleDateString('fr-FR',{timeZone:'Europe/Paris'})} - Confidentiel`,left,51,{lineBreak:false});
        doc.fontSize(8).text(text(selection),left,68,{width:total,height:24,ellipsis:true});
        y=98;doc.rect(left,y,total,26).fill('#ffdfa8');
        let x=left;doc.fillColor('#192d39').font('Bold').fontSize(9);
        ['Commune / terrain','Projet / permis','Maître d’ouvrage / contact','Téléphone / email disponibles','Potentiel / suivi'].forEach((label,i)=>{doc.text(label,x+pad,y+8,{width:widths[i]-2*pad,lineBreak:false});x+=widths[i];});
        y+=26;doc.font('Body').fontSize(8.5);
      };
      header();
      rows.forEach((cells,index)=>{
        const lines=cells.map((cell,i)=>wrap(doc,cell,widths[i]-2*pad));let offset=0,max=Math.max(...lines.map(l=>l.length));
        if(y+Math.min(max*lineHeight+pad*2,bottom-124)>bottom){doc.addPage();header();}
        while(offset<max){
          const count=Math.min(max-offset,Math.floor((bottom-y-2*pad)/lineHeight));
          if(count<1){doc.addPage();header();continue;}
          const height=count*lineHeight+2*pad;
          doc.rect(left,y,total,height).fill(index%2?'#f7f4ee':'#ffffff');let x=left;
          lines.forEach((values,i)=>{
            doc.rect(x,y,widths[i],height).lineWidth(.4).strokeColor('#cbd1d4').stroke();
            doc.fillColor('#17232c');values.slice(offset,offset+count).forEach((value,j)=>doc.text(value,x+pad,y+pad+j*lineHeight,{lineBreak:false}));x+=widths[i];
          });
          offset+=count;y+=height;
          if(offset<max){doc.addPage();header();}
        }
      });
      const pages=doc.bufferedPageRange();
      for(let i=0;i<pages.count;i++){
        doc.switchToPage(i);doc.font('Body').fontSize(7).fillColor('#56616a');
        doc.text('UNITI INSEME LIMITED - Usage interne. Potentiel indicatif. Sources et détails dans la fiche du permis.',left,doc.page.height-30,{lineBreak:false});
        doc.text(`${i+1} / ${pages.count}`,doc.page.width-65,doc.page.height-30,{lineBreak:false});
      }
      doc.end();
    }catch(error){doc.destroy();reject(error);}
  });
}
module.exports=(projects,followups={},selection)=>renderRows(projects.map(p=>row(p,followups[p.id]||{})),selection);
module.exports.row=row;
module.exports.renderRows=renderRows;
