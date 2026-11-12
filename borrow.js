'use strict';
function parseLabel(text) {
  text = text.replace(/\r/g,'').replace(/[\u2010-\u2015]/g,'-');
  const field = pattern => (text.match(pattern)?.[1] || '').trim();
  const labels = /\b(?:GTIN|UDI|REF(?:ERENCE)?|CAT(?:ALOG(?:UE)?)?(?:\s*(?:NO|NUMBER))?|LOT|BATCH|EXP(?:IRY|IRATION)?(?:\s*DATE)?|USE[ -]BY|DESCRIPTION|DESC)\b\s*[.:#]?/gi;
  const matches = [...text.matchAll(labels)];
  const values = {};
  matches.forEach((match,i)=>{
    const value=text.slice(match.index+match[0].length,matches[i+1]?.index ?? text.length).trim();
    values[match[0].replace(/[.:#]/g,'').trim().toUpperCase()]=value;
  });
  const get = pattern => Object.entries(values).find(([k])=>pattern.test(k))?.[1] || '';
  const token = value => value.match(/^[\s\[\]]*([A-Z0-9][A-Z0-9./_-]*)/i)?.[1] || '';
  const gtin = (get(/^(GTIN|UDI)$/).split('\n')[0].match(/\b(?:\d[ -]?){8,14}\b/)?.[0] || '').replace(/[ -]/g,'');
  const datePattern = /\b(?:\d{4}[-/.]\d{2}(?:[-/.]\d{2})?|\d{2}[-/.]\d{2}[-/.]\d{4}|\d{2}[- /][A-Z]{3}[- /]\d{4}|\d{6})\b/i;
  let description = get(/^(DESCRIPTION|DESC)$/).split('\n')[0];
  if(!description) {
    // A product-name line is often printed without a DESCRIPTION heading.
    const candidates=text.split('\n').map(s=>s.trim()).filter(s=>/\b(catheter|balloon|guide\s?wire|wire|sheath|stent|introducer|valve|syringe|needle|dilator|manifold|transducer|extension|tubing|device)\b/i.test(s) && !/\b(sterile|warning|caution|reuse|manufacturer|www|expiry|lot|ref)\b/i.test(s));
    description=candidates.sort((a,b)=>b.length-a.length)[0] || '';
  }
  return {
    description,
    gtin: field(/\(\s*01\s*\)\s*(\d{14})/) || (/^(?:\d{8}|\d{12,14})$/.test(gtin)?gtin:''),
    ref: token(get(/^(REF|REFERENCE|CAT)/)),
    lot: field(/\(\s*10\s*\)\s*([^\s(]+)/) || token(get(/^(LOT|BATCH)$/)),
    expiry: get(/^(EXP|USE)/).match(datePattern)?.[0] || field(/\(\s*17\s*\)\s*(\d{6})/)
  };
}
if (typeof module !== 'undefined') module.exports = { parseLabel };
if (typeof document !== 'undefined') {
 const $ = id => document.getElementById(id);
 const keys = ['description','gtin','ref','lot','expiry','quantity'];
 const items = []; let photoURL; let editing = -1;
 function clear() { $('item-form').reset(); $('raw').textContent=''; $('preview').hidden=true; if(photoURL) URL.revokeObjectURL(photoURL); photoURL=null; $('camera').value=''; $('upload').value=''; editing=-1; }
 function render(target, editable) {
   target.replaceChildren();
   items.forEach((item,i) => {
     const card=document.createElement('article');
     const text=document.createElement('p'); text.textContent=`${i+1}. ${item.description}\nGTIN: ${item.gtin || 'Not available'} | REF: ${item.ref || 'Not available'}\nLOT: ${item.lot || 'Not available'} | Expiry: ${item.expiry || 'Not available'} | Quantity: ${item.quantity}`;text.style.whiteSpace='pre-wrap';card.append(text);
     if(editable) for(const action of ['Edit','Remove']) { const button=document.createElement('button');button.textContent=action;button.onclick=()=>{if(action==='Edit'){keys.forEach(k=>$(k).value=item[k]);editing=i;$('verified').checked=false;$('editor').scrollIntoView();}else{items.splice(i,1);clear();refresh();}};card.append(button); }
     target.append(card);
   });
 }
 function refresh(){render($('items'),true);$('count').textContent=`Items (${items.length})`;$('review').disabled=!items.length;}
 async function readPhoto(event){
   const file=event.target.files[0];if(!file)return;
   if(!file.type.startsWith('image/')||file.size>20*1024*1024){$('status').textContent='Choose an image smaller than 20 MB.';return;}
   clear();photoURL=URL.createObjectURL(file);$('preview').src=photoURL;$('preview').hidden=false;$('editor').disabled=true;$('items').inert=true;$('review').disabled=true;
   let worker;
   try{
     $('status').textContent='Reading label…';
     worker=await Tesseract.createWorker('eng',1,{logger:m=>{if(m.status==='recognizing text')$('status').textContent=`Reading label… ${Math.round(m.progress*100)}%`;}});
     await worker.setParameters({tessedit_pageseg_mode:'11'});
     const {data}=await worker.recognize(file);$('raw').textContent=data.text;
     const values=parseLabel(data.text);
     if(Object.values(values).filter(Boolean).length<5){
       $('status').textContent='Checking the label again for missing fields…';
       await worker.setParameters({tessedit_pageseg_mode:'3'});
       const second=await worker.recognize(file);
       const extra=parseLabel(second.data.text);
       Object.keys(values).forEach(k=>{if(!values[k])values[k]=extra[k];});
       $('raw').textContent+='\n--- Second reading ---\n'+second.data.text;
     }
     Object.entries(values).forEach(([k,v])=>$(k).value=v);
     const missing=Object.keys(values).filter(k=>!values[k]);
     $('status').textContent=`Automatically filled ${5-missing.length} of 5 fields. `+(missing.length?`Could not confidently identify: ${missing.join(', ')}. `:'')+'Check the filled details against the photo before adding the item.';
   }catch(error){$('status').textContent='Could not read this photo. Try a clear JPEG/PNG or enter the fields manually.';}
   finally{if(worker)await worker.terminate().catch(()=>{});$('editor').disabled=false;$('items').inert=false;refresh();}
 }
 ['camera','upload'].forEach(id=>$(id).addEventListener('change',readPhoto));
 $('clear').onclick=clear;
 $('item-form').onsubmit=e=>{e.preventDefault();const item=Object.fromEntries(keys.map(k=>[k,$(k).value.trim()]));if(!item.description){$('description').focus();return;}if(editing>=0)items[editing]=item;else items.push(item);clear();refresh();};
 $('review').onclick=()=>{if(keys.slice(0,5).some(k=>$(k).value.trim())){ $('status').textContent='Add or clear the current item before reviewing.';return;}$('entry').hidden=true;$('summary').hidden=false;render($('summary-items'),false);updateText();};
 $('back').onclick=()=>{$('summary').hidden=true;$('entry').hidden=false;};
 function updateText(){const text=`Cath Lab borrowing request\nContact: ${$('contact-name').value.trim()}\nEmail: ${$('email').value.trim()}\nPhone: ${$('phone').value.trim()}\n\n`+items.map((item,i)=>`${i+1}. `+keys.map(k=>`${k.toUpperCase()}: ${item[k]||'Not available'}`).join('\n')).join('\n\n');$('request-text').value=text;return text;}
 $('contact-form').addEventListener('input',()=>{$('email').setCustomValidity('');updateText();});
 function validate(){if(!$('email').value.trim()&&!$('phone').value.trim())$('email').setCustomValidity('Enter an email address or phone number.');return $('contact-form').reportValidity();}
 $('contact-form').onsubmit=e=>{e.preventDefault();if(!validate())return;const body=updateText();const url='mailto:mike_ma_ca@hotmail.com?subject='+encodeURIComponent('Cath Lab borrowing request')+'&body='+encodeURIComponent(body);if(url.length>1800){$('send-status').textContent='This request is too long for reliable email links. Download or copy the request and email it to mike_ma_ca@hotmail.com.';return;}window.location.href=url;$('send-status').textContent='Email prepared. Complete sending in your email app. Delivery has not been confirmed.';};
 $('download').onclick=()=>{if(!validate())return;const url=URL.createObjectURL(new Blob([updateText()],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='cath-lab-borrowing-request.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
}

