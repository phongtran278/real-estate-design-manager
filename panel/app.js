(function(){'use strict';
var $=function(id){return document.getElementById(id);};
var data=[],scan=null,plan=null,preview=null;
$('reload').onclick=function(){location.reload();};

var sheetConfigKey='redm:sheet:v05',lastSheetUrl='',lastSheetTab='DATA_CARDS',syncBusy=false;
function parseGoogleUrl(value){
 var m=String(value||'').trim().match(/^https:\/\/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)(?:\/|$)/);
 if(!m)throw Error('Invalid Google Sheets URL. Paste the full docs.google.com/spreadsheets/d/... link.');
 return m[1];
}
function validateRows(rows){
 if(!rows.length)throw Error('The tab has no data rows.');
 var cols=Object.keys(rows[0]);
 if(cols.indexOf('tower')<0||cols.indexOf('unit')<0)throw Error('Missing columns tower / unit in the first row.');
 if(cols.indexOf('floor')<0&&cols.indexOf('floor_range')<0)throw Error('Missing column floor or floor_range.');
}
function fetchSheet(url,tab,done){
 var id;try{id=parseGoogleUrl(url);}catch(e){done(e);return;}
 tab=String(tab||'').trim();
 if(!tab){done(Error('Enter the exact Sheet tab name.'));return;}
 var uri='https://docs.google.com/spreadsheets/d/'+encodeURIComponent(id)+'/gviz/tq?tqx=out%3Acsv&sheet='+encodeURIComponent(tab);
 // The CEP panel uses its Node runtime so browser cross-origin restrictions don't block read-only CSV responses.
 if(typeof require!=='function'){done(Error('CEP Node runtime unavailable. Reopen the panel and check extension configuration.'));return;}
 var https=require('https');var redirects=0;
 function retrieve(target){
  var request=https.get(target,{headers:{'User-Agent':'RealEstateDesignManager/0.5','Accept':'text/csv,text/plain,*/*'},timeout:15000},function(res){
   var statusCode=res.statusCode,location=res.headers.location;
   if(statusCode>=300&&statusCode<400&&location){
    res.resume();if(++redirects>4){done(Error('Too many redirects. Check Sheet permissions.'));return;}
    var next=require('url').resolve(target,location);if(!/^https:\/\/(?:docs\.google\.com|accounts\.google\.com)\/?/i.test(next)){done(Error('Unexpected redirect destination.'));return;}
    if(/accounts\.google\.com/.test(next)){done(Error('This Google Sheet requires Google sign-in. Link-only sync cannot access private Sheets.'));return;}
    retrieve(next);return;
   }
   if(statusCode!==200){res.resume();done(Error('Google Sheets returned HTTP '+statusCode+'. Check tab name and sharing permissions.'));return;}
   var chunks=[],size=0;
   res.on('data',function(chunk){size+=chunk.length;if(size>2*1024*1024){request.destroy(Error('Sheet response exceeds 2 MB.'));return;}chunks.push(chunk);});
   res.on('end',function(){
    try{var body=Buffer.concat(chunks).toString('utf8');
     if(/^\s*(?:<!doctype html|<html)/i.test(body))throw Error('Google returned a sign-in or error page. Check sharing permissions.');
     var rows=parseCSV(body);validateRows(rows);done(null,rows);
    }catch(e){done(e);}
   });
  });
  request.on('timeout',function(){request.destroy(Error('Google Sheets request timed out.'));});
  request.on('error',function(e){done(e);});
 }
 retrieve(uri);
}
function sheetSync(){
 if(syncBusy)return;var url=$('sheetUrl').value.trim(),tab=$('sheetTab').value.trim();syncBusy=true;
 $('connectSheet').disabled=true;$('syncSheet').disabled=true;$('sheetStatus').textContent='Connecting to Google Sheets...';
 fetchSheet(url,tab,function(err,rows){
  syncBusy=false;$('connectSheet').disabled=false;
  if(err){$('sheetStatus').textContent='Connection failed: '+err.message;status('Google Sheets: '+err.message);$('syncSheet').disabled=!lastSheetUrl;return;}
  data=rows;clearPreview();if(scan)renderFields();
  lastSheetUrl=url;lastSheetTab=tab;$('syncSheet').disabled=false;
  try{localStorage.setItem(sheetConfigKey,JSON.stringify({url:url,tab:tab}));}catch(e){}
  var message='Connected · '+rows.length+' rows from '+tab+' · read-only';
  $('sheetStatus').textContent=message;$('dataStatus').textContent=message;
  status('Synced '+rows.length+' rows. Review mapping and Preview before Apply.');
 });
}
$('connectSheet').onclick=sheetSync;$('syncSheet').onclick=sheetSync;
try{var saved=JSON.parse(localStorage.getItem(sheetConfigKey)||'null');if(saved&&saved.url){$('sheetUrl').value=saved.url;$('sheetTab').value=saved.tab||'DATA_CARDS';$('sheetStatus').textContent='Saved link loaded. Click Connect & Sync.';}}catch(e){}

var embedded=[
 ['TOWER 3','5-19','05','02','2PN ĐẶC BIỆT','120.2','110.6'],
 ['TOWER 3','5-19','05','04','3PN','126.1','115.5'],
 ['TOWER 4','6-19','19','01','2PN','85.9','76.6'],
 ['TOWER 4','6-19','19','02','2PN ĐẶC BIỆT','121.9','111.3'],
 ['TOWER 4','21-25-29-33','21','03','2PN ĐẶC BIỆT','120.2','111.5']
];
var columns=['tower','floor_range','floor','unit','unit_type','gross_area_m2','net_area_m2'];
function convert(a){return a.map(function(r){var o={};for(var i=0;i<columns.length;i++)o[columns[i]]=r[i];return o;});}
data=convert(embedded);
function status(x){$('status').textContent=x;}
function parseCSV(s){s=s.replace(/^\uFEFF/,'');var rows=[],r=[],cell='',quote=false;for(var i=0;i<s.length;i++){var c=s.charAt(i);if(c==='"'){if(quote&&s.charAt(i+1)==='"'){cell+='"';i++;}else quote=!quote;}else if(c===','&&!quote){r.push(cell);cell='';}else if((c==='\r'||c==='\n')&&!quote){if(c==='\r'&&s.charAt(i+1)==='\n')i++;r.push(cell);cell='';if(r.join('').trim())rows.push(r);r=[];}else cell+=c;}r.push(cell);if(r.join('').trim())rows.push(r);if(quote)throw Error('Unclosed quoted CSV cell');if(!rows.length)throw Error('Empty CSV');var headers=rows.shift().map(function(x){return x.trim().toLowerCase();});return rows.map(function(row){var o={};headers.forEach(function(k,i){o[k]=(row[i]||'').trim();});return o;});}
function code(r){return 'T'+String(r.tower||'').replace(/\D/g,'')+'-'+('0'+parseInt(r.floor,10)).slice(-2)+'-'+('0'+parseInt(r.unit,10)).slice(-2);}
function normalized(s){return String(s).replace(/\./g,'-').toUpperCase();}

function parseSheet(s){
 s=String(s||'').replace(/^\uFEFF/,'').trim();
 if(!s)throw Error('Paste a copied table from Google Sheets first.');
 // Clipboard from Google Sheets is tab-separated, including quoted multiline cells.
 var delimiter=s.indexOf('\t')>=0?'\t':',',rows=[],row=[],cell='',quoted=false;
 for(var i=0;i<s.length;i++){var ch=s.charAt(i);if(ch==='"'){if(quoted&&s.charAt(i+1)==='"'){cell+='"';i++;}else quoted=!quoted;}else if(ch===delimiter&&!quoted){row.push(cell);cell='';}else if((ch==='\r'||ch==='\n')&&!quoted){if(ch==='\r'&&s.charAt(i+1)==='\n')i++;row.push(cell);cell='';if(row.some(function(v){return String(v).trim()!=='';}))rows.push(row);row=[];}else cell+=ch;}
 row.push(cell);if(row.some(function(v){return String(v).trim()!=='';}))rows.push(row);
 if(quoted)throw Error('A quoted cell is not closed.');
 if(rows.length<2)throw Error('Copy header row and at least one data row.');
 var headers=rows.shift().map(function(v){return String(v).trim().toLowerCase();});
 if(headers.indexOf('tower')<0||headers.indexOf('unit')<0||headers.indexOf('net_area_m2')<0)throw Error('Expected columns: tower, unit, net_area_m2. Include the Google Sheet header row.');
 if(headers.indexOf('floor')<0&&headers.indexOf('floor_range')<0)throw Error('Expected floor or floor_range column.');
 var out=rows.map(function(r){var o={};headers.forEach(function(k,i){if(k)o[k]=String(r[i]||'').trim();});return o;});
 return out;
}
function matchRecord(c,rows){
 var parts=normalized(c).match(/^T(\d+)-(\d+)-(\d+)$/);if(!parts)return {error:'Invalid component code '+c};
 var floor=Number(parts[2]),unit=Number(parts[3]),tower=Number(parts[1]),found=[];
 rows.forEach(function(r){
 if(Number(String(r.tower||'').replace(/\D/g,''))!==tower||Number(r.unit)!==unit)return;
 if(r.unit_code){if(normalized(r.unit_code)===normalized(c))found.push(r);return;}
 if(r.floor){if(Number(r.floor)===floor)found.push(r);return;}
 var range=String(r.floor_range||r.floor||'').replace(/[–—]/g,'-');
 var a=range.split('-').map(Number);
 if(a.length===2&&a[0]<=floor&&floor<=a[1])found.push(r);
 else if(a.length>2&&a.indexOf(floor)>=0)found.push(r);
 });
 if(found.length!==1)return {error:found.length?'Ambiguous source rows for '+c:'No matching source row for '+c};
 return {record:found[0]};
}

function bridge(method,arg,callback){if(!window.__adobe_cep__||!window.__adobe_cep__.evalScript){status('Not running in CEP panel (Illustrator).');return;}var root=decodeURI(window.__adobe_cep__.getSystemPath('extension')).replace(/^file:\/{1,3}/,'');
var host=root.replace(/\\/g,'/')+'/host/bridge.jsx';
// Each call reloads source from disk. No Illustrator process restart for JSX edits.
var call='$.evalFile(new File('+JSON.stringify(host)+'));REDM.'+method+'('+JSON.stringify(arg)+')';
window.__adobe_cep__.evalScript(call,function(v){try{callback(JSON.parse(v));}catch(e){status('Bridge error: '+String(v).slice(0,300));}});}
function clearPreview(){preview=null;plan=null;$('apply').disabled=true;$('report').textContent='No preview yet.';}
$('csv').addEventListener('change',function(e){var f=e.target.files[0];if(!f)return;var reader=new FileReader();reader.onload=function(){try{data=parseCSV(reader.result);$('dataStatus').textContent=data.length+' CSV records loaded: '+f.name;clearPreview();}catch(err){status(err.message);}};reader.readAsText(f,'UTF-8');});
$('dataStatus').textContent='5 offline demo records loaded. Use CSV to replace.';
$('loadPaste').onclick=function(){
 try{var parsed=parseSheet($('sheetPaste').value);data=parsed;clearPreview();if(scan)renderFields();
 $('dataStatus').textContent=parsed.length+' rows pasted from Google Sheets (local clipboard only).';
 status('Paste imported. Review fields and Preview before Apply.');
 }catch(e){status('Paste: '+e.message);}
};
$('resetDemo').onclick=function(){data=convert(embedded);clearPreview();if(scan)renderFields();$('dataStatus').textContent='5 offline demo records loaded.';status('Demo data restored.');};

$('scan').onclick=function(){clearPreview();status('Scanning Illustrator...');bridge('scan',$('scope').value,function(r){if(!r.ok){status(r.error);return;}scan=r;$('scanStatus').textContent=r.components.length+' components found; '+r.issues.length+' ID issues. '+r.document;renderFields();status('Scan complete.');});};
function renderFields(){var area=$('fields');area.innerHTML='';if(!scan||!scan.components.length){area.textContent='No named components found. Name card GROUPS as T3-05-02.';return;}var names={},opts={};scan.components.forEach(function(c){c.fields.forEach(function(x){names[x]=1;});});data.forEach(function(d){Object.keys(d).forEach(function(x){opts[x]=1;});});Object.keys(names).sort().forEach(function(n){var div=document.createElement('div');div.className='field';var cb=document.createElement('input');cb.type='checkbox';cb.className='useField';cb.dataset.name=n;var label=document.createElement('label');label.textContent=n;var select=document.createElement('select');select.className='sourceField';select.dataset.name=n;var blank=document.createElement('option');blank.value='';blank.textContent='Select column';select.appendChild(blank);Object.keys(opts).sort().forEach(function(o){var op=document.createElement('option');op.value=o;op.textContent=o;select.appendChild(op);});var defaults={NET_AREA:'net_area_m2',GROSS_AREA:'gross_area_m2',UNIT_TYPE:'unit_type'};if(defaults[n]&&opts[defaults[n]]){select.value=defaults[n];cb.checked=true;}cb.onchange=clearPreview;select.onchange=clearPreview;div.appendChild(cb);div.appendChild(label);div.appendChild(select);area.appendChild(div);});}
$('preview').onclick=function(){clearPreview();if(!scan||!scan.components.length){status('Scan components first.');return;}var mapping={},issues=(scan.issues||[]).slice();Array.prototype.forEach.call(document.querySelectorAll('.useField'),function(cb){if(cb.checked){var sel=document.querySelector('.sourceField[data-name="'+cb.dataset.name+'"]');if(!sel.value)issues.push('Unmapped field: '+cb.dataset.name);else mapping[cb.dataset.name]=sel.value;}});if(!Object.keys(mapping).length){status('Select at least one field.');return;}var items=scan.components.map(function(c){var result=matchRecord(c.id,data),record=result.record,values={};if(result.error){issues.push(result.error);}else Object.keys(mapping).forEach(function(field){values[field]=record[mapping[field]]||'';});if(c.duplicates.length)issues.push('Duplicate fields inside '+c.id+': '+c.duplicates.join(','));return {id:normalized(c.id),artboard:c.artboard,values:values};});if(issues.length){$('report').textContent='BLOCKED BEFORE PREVIEW:\n'+issues.join('\n');status('Fix source/IDs then scan again.');return;}plan={items:items,mapping:mapping};bridge('validate',plan,function(r){if(!r.ok){status(r.error);return;}preview=r;var lines=['BEFORE → AFTER | '+r.changes.length+' fields'];r.changes.forEach(function(c){lines.push(c.id+' / '+c.field+' : '+c.old+' → '+c.next);});if(r.issues.length)lines.unshift('BLOCKED: '+r.issues.join(' | '));$('report').textContent=lines.join('\n');$('apply').disabled=!!r.issues.length||!r.changes.length;if(!r.issues.length){plan.expected=r.changes;status('Preview ready. Check values before Apply.');}else status('Preview blocked: '+r.issues.length+' validation issues.');});};
$('apply').onclick=function(){if(!plan||!preview||$('apply').disabled)return;if(!confirm('Update '+preview.changes.length+' text fields in Illustrator?\nBack up .ai before applying.'))return;$('apply').disabled=true;bridge('apply',plan,function(r){if(!r.ok){status(r.error);return;}status('Updated '+r.updated+' fields. Save your .ai after visual inspection.');$('report').textContent+='\n\nAPPLIED '+r.updated+' field(s). Scan again to refresh.';});};
})();