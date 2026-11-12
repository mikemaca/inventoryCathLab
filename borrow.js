'use strict';
function parseLabel(text) {
  const field = pattern => (text.match(pattern)?.[1] || '').trim();
  return {
    description: field(/(?:DESCRIPTION|DESC)\s*[:#]?\s*([^\n]+)/i),
    gtin: field(/\bGTIN\s*[:#]?\s*(\d{8,14})\b/i) || field(/\(01\)\s*(\d{14})/),
    ref: field(/\bREF(?:ERENCE)?\b\s*[:#]?\s*([A-Z0-9][A-Z0-9./_-]*)/i),
    lot: field(/\bLOT\b\s*[:#]?\s*([A-Z0-9][A-Z0-9./_-]*)/i) || field(/\(10\)\s*([^\s(]+)/),
    expiry: field(/(?:EXPIRY|EXPIRATION|EXP|USE BY)\s*[:#]?\s*([^\n]+)/i) || field(/\(17\)\s*(\d{6})/)
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
     worker=await Tesseract.createWorker('eng');
     const {data}=await worker.recognize(file);$('raw').textContent=data.text;
     const values=parseLabel(data.text);Object.entries(values).forEach(([k,v])=>$(k).value=v);
     $('status').textContent='Reading complete. Check all fields and fill any missing details. Expiry is preserved as printed (GS1 dates use YYMMDD).';
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

