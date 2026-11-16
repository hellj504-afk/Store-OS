const FIELDS={lowStockManual:[['code','Item Code'],['desc','Description'],['uom','UOM (KG / KGS / NOS)'],['qty','Quantity']],inventory:[['sub','Sub Inventory'],['locator','Locator'],['code','Item Code'],['desc','Description'],['uom','UOM'],['opening','Opening'],['received','Received'],['issued','Issued'],['closing','Closing']],store:[['sub','Sub Inventory'],['locator','Locator'],['code','Item Code'],['desc','Description'],['uom','UOM'],['opening','Opening'],['received','Received'],['issued','Issued'],['closing','Closing']],voucher:[['code','Item Code'],['desc','Description'],['locator','Destination Locator'],['demand','Demand Qty'],['balance','Balance Qty']],ir:[['code','Item Code'],['desc','Description'],['locator','Destination Locator'],['fb','F.B No.'],['serial','Serial No.'],['reference','Reference'],['demand','Demand Qty'],['balance','Balance Qty']],bom:[['parent','Parent / FG Code'],['child','Child Item Code'],['desc','Description'],['qty','Qty'],['uom','UOM']],slow:[['code','Item Code'],['desc','Description'],['uom','UOM'],['stock','Stock'],['rate','Rate'],['value','Value'],['location','Location']]};
const KEYS=['inventory','store','voucher','ir','bom','slow','lowStockManual'];
let data=JSON.parse(localStorage.getItem('storeOS')||'{}');KEYS.forEach(k=>data[k]=data[k]||[]);
let firebaseApi=null,saving=false;const filters={inventory:'',store:'',voucher:'',ir:'',bom:'',slow:'',lowStockManual:''};
let lowStockSearchText='',lowStockFilter='all',currentLowStockRows=[];
if(typeof pdfjsLib!=='undefined'){pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'}
function num(value){if(value===null||value===undefined||value==='')return 0;const parsed=Number(String(value).replace(/,/g,'').replace(/[^0-9.+-]/g,''));return Number.isFinite(parsed)?parsed:0}
const money=n=>new Intl.NumberFormat('en-US',{notation:'compact',compactDisplay:'short',maximumFractionDigits:2}).format(Number(n)||0);
const dashboardMoney=n=>{
 const value=Number(n)||0;
 return new Intl.NumberFormat('en-US',{maximumFractionDigits:1}).format(value/1000000)+'M';
};
const rateOf=code=>{const i=data.slow.find(x=>String(x.code||'').trim()===String(code||'').trim());return i?Number(i.rate)||0:0};
const toast=m=>{const t=document.getElementById('toast');if(!t)return;t.textContent=m;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),3000)};
function buttonProgress(kind,text,pct){const el=document.getElementById(kind+'Progress');if(el)el.textContent=text?pct+'%':''}
function showProgress(kind,text){buttonProgress(kind,text,1)}
function setProgress(kind,text,pct){buttonProgress(kind,text,pct)}
function doneProgress(kind,text){buttonProgress(kind,text,100);setTimeout(()=>buttonProgress(kind,'',0),2500)}
function failProgress(kind,text){buttonProgress(kind,'Error',100);toast(text);setTimeout(()=>buttonProgress(kind,'',0),6000)}
function addSearchBars(){KEYS.forEach(k=>{const table=document.getElementById(k+'Table');if(!table||table.previousElementSibling&&table.previousElementSibling.classList.contains('search-bar'))return;const wrap=document.createElement('div');wrap.className='search-bar';wrap.innerHTML='<input class="input" id="'+k+'Search" placeholder="Instant search: item code, description, locator...">';table.parentNode.insertBefore(wrap,table);const input=wrap.querySelector('input');input.value=filters[k];input.addEventListener('input',()=>{filters[k]=input.value.toLowerCase();render()})})}
async function initFirebase(){
 try{
  const [{initializeApp},{getFirestore,doc,getDoc,setDoc}]=await Promise.all([import('https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js'),import('https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js')]);
  const app=initializeApp({apiKey:'AIzaSyCkK3jRQFI_JOr4PB2UUk8Y0XK3q-1Uzmk',authDomain:'store-management-150d6.firebaseapp.com',projectId:'store-management-150d6',storageBucket:'store-management-150d6.firebasestorage.app',messagingSenderId:'778307476882',appId:'1:778307476882:web:1a0e71b12b71fb6265354b',measurementId:'G-6JLZHFEX5E'});
  const db=getFirestore(app);const ref=s=>doc(db,'storeOS',s);
  firebaseApi={load:async s=>{const snap=await getDoc(ref(s));return snap.exists()?snap.data().items||[]:[]},save:async(s,items)=>{await setDoc(ref(s),{items,updatedAt:new Date().toISOString()})}};
  for(const k of KEYS){const remote=await firebaseApi.load(k);if(remote.length)data[k]=remote}
  render();toast('Firebase connected')
 }catch(e){console.error('Firebase connection error:',e);const reason=e&&e.code?e.code:(e&&e.message?e.message:'unknown error');toast('Firebase error: '+reason)}
}
async function save(){localStorage.setItem('storeOS',JSON.stringify(data));if(!firebaseApi||saving)return;saving=true;try{await Promise.all(KEYS.map(k=>firebaseApi.save(k,data[k])))}catch(e){console.error('Firebase save error:',e);toast('Firebase save error: '+(e.code||e.message||'unknown'))}finally{saving=false}}
function render(){
 addSearchBars();
 const invTotal=data.inventory.filter(r=>!String(r.code||"").trim().toUpperCase().startsWith("FG")).reduce((s,r)=>s+(Number(r.closing)||0)*rateOf(r.code),0);
 const storeTotal=data.store.filter(r=>!String(r.code||"").trim().toUpperCase().startsWith("FG")).reduce((s,r)=>s+(Number(r.closing)||0)*rateOf(r.code),0);
 const invTotalEl=document.getElementById('invTotal');const storeTotalEl=document.getElementById('storeTotal');const itemTotalEl=document.getElementById('itemTotal');
 if(invTotalEl)invTotalEl.textContent=dashboardMoney(invTotal);if(storeTotalEl)storeTotalEl.textContent=dashboardMoney(storeTotal);if(itemTotalEl)itemTotalEl.textContent=data.inventory.length+data.store.length;
 drawChart();
 const invRows=data.inventory.filter(r=>matches(r,['sub','locator','code','desc'],'inventory'));
 const storeRows=data.store.filter(r=>matches(r,['sub','locator','code','desc'],'store'));
 const voucherRows=data.voucher.filter(r=>matches(r,['code','desc','locator'],'voucher'));
 const irRows=data.ir.filter(r=>matches(r,['code','desc','locator','fb','serial','reference'],'ir'));
 const slowRows=data.slow.filter(r=>matches(r,['code','desc','location'],'slow'));
 table('inventoryTable',['Sub Inventory','Locator','Item Code','Description','UOM','Opening','Received','Issued','Closing','Rate','Cost'],invRows.map(r=>[r.sub,r.locator,r.code,r.desc,r.uom,r.opening,r.received,r.issued,r.closing,money(rateOf(r.code)),money((Number(r.closing)||0)*rateOf(r.code))]));
 table('storeTable',['Sub Inventory','Locator','Item Code','Description','UOM','Opening','Received','Issued','Closing','Rate','Cost'],storeRows.map(r=>[r.sub,r.locator,r.code,r.desc,r.uom,r.opening,r.received,r.issued,r.closing,money(rateOf(r.code)),money((Number(r.closing)||0)*rateOf(r.code))]));
 table('voucherTable',['Item Code','Description','Destination Locator','Demand Qty','Balance Qty'],voucherRows.map(r=>[r.code,r.desc,r.locator,r.demand,r.balance]));
 table('irTable',['Item Code','Description','Destination Locator','F.B No.','Serial No.','Reference','Demand Qty','Balance Qty'],irRows.map(r=>[r.code,r.desc,r.locator,r.fb,r.serial,r.reference,r.demand,r.balance]));
 renderBom();renderLowStock();table('slowTable',['Item Code','Description','UOM','Stock','Rate','Value','Location'],slowRows.map(r=>{const value=Number(r.value)>0?Number(r.value):(Number(r.stock)||0)*(Number(r.rate)||0);return[r.code,r.desc,r.uom,r.stock,money(r.rate),money(value),r.location]}));save();
}
function matches(row,fields,kind){const q=(filters[kind]||'').toLowerCase();if(!q)return true;return fields.some(f=>String(row[f]||'').toLowerCase().includes(q))}
function table(id,heads,rows){const el=document.getElementById(id);if(!el)return;el.innerHTML='<thead><tr>'+heads.map(h=>'<th>'+h+'</th>').join('')+'</tr></thead><tbody>'+(rows.length?rows.map(r=>'<tr>'+r.map(c=>'<td>'+(c??'')+'</td>').join('')+'</tr>').join(''):'<tr><td colspan="'+heads.length+'" style="color:#9aa7c7">No records</td></tr>')+'</tbody>'}
function escHtml(value){return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]))}
function getLowStockRows(){
 const rows=[];
 for(const source of ['inventory','store']){
  data[source].forEach((r,index)=>{
   const uom=String(r.uom||'').trim().toUpperCase().replace(/\.$/,'');
   const qty=num(r.closing);
   const limit=(uom==='KG'||uom==='KGS')?100:(uom==='NOS'?500:null);
   if(limit!==null&&qty<limit)rows.push({source,sourceLabel:source==='inventory'?'Floor Inventory':'Store',code:r.code||'',desc:r.desc||'',uom,qty,limit,status:'Below '+limit+' '+uom,key:source+'-'+index,manual:false});
  });
 }
 (data.lowStockManual||[]).forEach((r,index)=>rows.push({source:'manual',sourceLabel:'Manual',code:r.code||'',desc:r.desc||'',uom:String(r.uom||'').trim().toUpperCase(),qty:num(r.qty),limit:null,status:'Manual Entry',key:'manual-'+index,manual:true}));
 return rows;
}
function renderLowStock(){
 const el=document.getElementById('lowStockTable');if(!el)return;
 const q=lowStockSearchText.trim().toLowerCase();let rows=getLowStockRows();
 if(lowStockFilter==='KG')rows=rows.filter(r=>r.uom==='KG'||r.uom==='KGS');
 else if(lowStockFilter==='NOS')rows=rows.filter(r=>r.uom==='NOS');
 else if(['inventory','store','manual'].includes(lowStockFilter))rows=rows.filter(r=>r.source===lowStockFilter);
 if(q)rows=rows.filter(r=>[r.code,r.desc,r.uom,r.sourceLabel,r.qty,r.status].some(v=>String(v).toLowerCase().includes(q)));
 currentLowStockRows=rows;const heads=['Source','Item Code','Description','UOM','Closing / Qty','Status','Action'];
 el.innerHTML='<thead><tr>'+heads.map(h=>'<th>'+h+'</th>').join('')+'</tr></thead><tbody>'+
 (rows.length?rows.map(r=>'<tr><td>'+escHtml(r.sourceLabel)+'</td><td>'+escHtml(r.code)+'</td><td>'+escHtml(r.desc)+'</td><td>'+escHtml(r.uom)+'</td><td>'+escHtml(r.qty)+'</td><td class="'+(r.manual?'':'lowstock-status')+'">'+escHtml(r.status)+'</td><td>'+(r.manual?'<button class="lowstock-delete" data-lowstock-delete="'+r.key+'">Delete</button>':'—')+'</td></tr>').join(''):'<tr><td colspan="'+heads.length+'" style="color:#9aa7c7">No low stock items found</td></tr>')+'</tbody>';
}
function setupLowStockControls(){
 const search=document.getElementById('lowStockSearch'),filter=document.getElementById('lowStockFilter'),tableEl=document.getElementById('lowStockTable'),pdf=document.getElementById('lowStockPdf');
 if(search)search.addEventListener('input',()=>{lowStockSearchText=search.value;renderLowStock()});
 if(filter)filter.addEventListener('change',()=>{lowStockFilter=filter.value;renderLowStock()});
 if(tableEl)tableEl.addEventListener('click',async e=>{const btn=e.target.closest('[data-lowstock-delete]');if(!btn)return;const index=Number(btn.dataset.lowstockDelete.replace('manual-',''));if(!Number.isInteger(index)||index<0||index>=data.lowStockManual.length)return;if(!confirm('Delete this manual low stock item?'))return;data.lowStockManual.splice(index,1);await save();render();toast('Manual item deleted')});
 if(pdf)pdf.addEventListener('click',()=>{if(!currentLowStockRows.length){toast('No rows to export');return}if(!window.jspdf||!window.jspdf.jsPDF){toast('PDF library not loaded. Please check internet and refresh.');return}const doc=new window.jspdf.jsPDF({orientation:'landscape'});doc.setFontSize(16);doc.text('Store OS - Low Stock Items',14,14);doc.setFontSize(9);doc.text('Source: Floor Inventory, Store and manual entries',14,21);doc.autoTable({startY:27,head:[['Source','Item Code','Description','UOM','Closing / Qty','Status']],body:currentLowStockRows.map(r=>[r.sourceLabel,r.code,r.desc,r.uom,String(r.qty),r.status]),styles:{fontSize:8,cellPadding:2,overflow:'linebreak'},headStyles:{fillColor:[35,75,125]},columnStyles:{2:{cellWidth:100}}});doc.save('Store-OS-Low-Stock.pdf')});
}
setupLowStockControls();
const costToggle=document.getElementById('toggleCost');if(costToggle)costToggle.addEventListener('click',()=>{const area=document.getElementById('costArea');if(!area)return;area.hidden=!area.hidden;costToggle.textContent=area.hidden?'Show Cost':'Hide Cost';});
function renderBom(){const search=document.getElementById('bomSearch');const cost=document.getElementById('bomCost');if(!search||!cost)return;const q=String(filters.bom||search.value||'').toLowerCase();const rows=data.bom.filter(r=>{const parent=String(r.parent||'').toLowerCase();const child=String(r.child||'').toLowerCase();const desc=String(r.desc||'').toLowerCase();return !q||parent.includes(q)||child.includes(q)||desc.includes(q)});table('bomTable',['Parent / FG','Child Item','Description','Qty','UOM','Rate','Line Cost'],rows.map(r=>{const c=(Number(r.qty)||0)*rateOf(r.child);return[r.parent,r.child,r.desc,r.qty,r.uom,money(rateOf(r.child)),money(c)]}));cost.textContent=money(rows.reduce((s,r)=>s+(Number(r.qty)||0)*rateOf(r.child),0))}
function drawChart(){
 const c=document.getElementById('chart');if(!c||!c.getContext)return;const x=c.getContext('2d');if(!x)return;
 const invMap=new Map(),storeMap=new Map();
 data.inventory.forEach(r=>{const code=String(r.code||'').trim();if(code)invMap.set(code,(invMap.get(code)||0)+num(r.closing))});
 data.store.forEach(r=>{const code=String(r.code||'').trim();if(code)storeMap.set(code,(storeMap.get(code)||0)+num(r.closing))});
 const codes=[...new Set([...invMap.keys(),...storeMap.keys()])].sort();
 const inv=codes.map(k=>invMap.get(k)||0),sto=codes.map(k=>storeMap.get(k)||0);
 const w=Math.max(c.clientWidth,320),h=280,dpr=window.devicePixelRatio||1;c.width=w*dpr;c.height=h*dpr;x.setTransform(dpr,0,0,dpr,0,0);x.clearRect(0,0,w,h);
 const left=48,right=14,top=32,bottom=38,pw=w-left-right,ph=h-top-bottom,max=Math.max(1,...inv,...sto);
 x.font='11px Inter,sans-serif';x.textAlign='right';x.textBaseline='middle';
 for(let i=0;i<=4;i++){const y=top+ph*i/4;x.strokeStyle='rgba(148,163,184,.25)';x.lineWidth=1;x.beginPath();x.moveTo(left,y);x.lineTo(w-right,y);x.stroke();x.fillStyle='#64748b';x.fillText(Math.round(max*(1-i/4)).toLocaleString('en-US'),left-8,y)}
 const draw=(values,color)=>{if(!values.length)return;x.save();x.shadowColor=color;x.shadowBlur=14;x.strokeStyle=color;x.lineWidth=2.5;x.lineJoin='round';x.lineCap='round';x.beginPath();values.forEach((v,i)=>{const px=left+(values.length<2?pw/2:pw*i/(values.length-1)),py=top+ph-(v/max)*ph;i?x.lineTo(px,py):x.moveTo(px,py)});x.stroke();x.shadowBlur=0;values.forEach((v,i)=>{const px=left+(values.length<2?pw/2:pw*i/(values.length-1)),py=top+ph-(v/max)*ph;x.fillStyle=color;x.beginPath();x.arc(px,py,2.5,0,Math.PI*2);x.fill()});x.restore()};
 draw(inv,'#2563eb');draw(sto,'#06b6d4');
 x.textAlign='left';x.textBaseline='alphabetic';x.font='12px Inter,sans-serif';x.shadowBlur=10;x.shadowColor='#2563eb';x.fillStyle='#2563eb';x.fillText('Inventory',left,18);x.shadowColor='#06b6d4';x.fillStyle='#06b6d4';x.fillText('Store',left+88,18);x.shadowBlur=0;
 if(codes.length){x.fillStyle='#64748b';x.font='10px Inter,sans-serif';x.textAlign='center';x.fillText('All items ('+codes.length+')',left+pw/2,h-8)}
}
function makeColumnMap(header,aliases){
 const cols={};(header||[]).forEach((cell,i)=>{if(!cell)return;const t=cell.text.toLowerCase().replace(/[^a-z]/g,'');for(const[key,keys]of Object.entries(aliases)){if(!cols[key]&&keys.some(k=>t===k||t.includes(k)))cols[key]={index:i,x:cell.x}}});
 const entries=Object.entries(cols).sort((a,b)=>a[1].x-b[1].x);const ranges={};
 entries.forEach(([key,cell],i)=>{const next=entries[i+1];ranges[key]={start:cell.x-8,end:next?next[1].x-8:99999}});
 return ranges;
}
function columnValue(row,ranges,key){if(!ranges||!ranges[key])return '';let text='';(row||[]).forEach(cell=>{if(cell&&cell.x>=ranges[key].start&&cell.x<ranges[key].end)text+=' '+cell.text});return clean(text)}
function columnNumber(row,ranges,key){return num(columnValue(row,ranges,key))}
function rowText(row){return clean((row||[]).map(c=>c&&c.text?c.text:'').join(' '))}
function fullDescription(row,itemCode,kind){
 const text=rowText(row);const codeIndex=text.toLowerCase().indexOf(String(itemCode||'').toLowerCase());if(codeIndex<0)return '';
 let after=text.slice(codeIndex+String(itemCode).length);
 const uom=after.match(/\b(?:NOS|NOS\.|PCS|KGS|KG|MTR|MTRS|LTR|LTRS|SET|SETS|PAD|GLN)\b/i);
 if(uom&&uom.index>=0)after=after.slice(0,uom.index);
 return clean(after.replace(/^[-\s]+/,''));
}
function fixDescription(text){let d=clean(text);d=d.replace(/\s+/g,' ').trim();return d}
const CODE_RE=/\b(?:FG|RM|CM|SS|WIP|GI|SCR)\d{2,5}(?:-\d+)*-\d{2}-\d{3}\b/i;
const UOM_RE=/^\s*(?:NOS|NOS\.|PCS|KGS|KG|MTR|MTRS|LTR|LTRS|SET|SETS|PAD|GLN)\s*$/i;
async function parseFile(file,kind){
 if(!file)throw new Error('No file selected');
 if(!file.name.toLowerCase().endsWith('.pdf')){
  if(typeof XLSX==='undefined'||!XLSX)throw new Error('Excel reader library not loaded. Internet/ad-blocker check karein.');
  showProgress(kind,'Reading Excel...');setProgress(kind,'Reading Excel...',45);const wb=XLSX.read(await file.arrayBuffer());const sheetName=wb&&wb.SheetNames&&wb.SheetNames[0];const sheet=sheetName?wb.Sheets[sheetName]:null;if(!sheet)throw new Error('Excel file has no readable sheet');const raw=XLSX.utils.sheet_to_json(sheet,{defval:'',raw:false});setProgress(kind,'Extracting...',90);return raw.map(r=>normalizeExcel(kind,r)).filter(r=>r.code||r.child);
 }
 const rows=await extractPdfRows(file,kind);const out=[];
 const aliases={
  inventory:{sub:['subinventory'],locator:['locator'],code:['itemcode'],desc:['itemdescription','description'],uom:['uom'],opening:['opening'],received:['received'],issued:['issued'],closing:['closing']},
  store:{sub:['subinventory'],locator:['locator'],code:['itemcode'],desc:['itemdescription','description'],uom:['uom'],opening:['opening'],received:['received'],issued:['issued'],closing:['closing']},
  slow:{code:['itemcode'],desc:['itemdescription','description'],uom:['uom'],stock:['stock'],rate:['rate'],value:['value'],location:['location']},
  voucher:{code:['itemcode'],desc:['description','itemdescription'],locator:['destinationlocator'],demand:['demandqty'],balance:['balanceqty']},
  ir:{code:['itemcode'],desc:['description','itemdescription'],locator:['destinationlocator'],fb:['fbnum','fbno'],serial:['serialnum','serialno'],reference:['reference'],demand:['demandqty'],balance:['balanceqty']},
  bom:{parent:['parent','fgcode'],child:['childcode','itemcode'],desc:['description','itemdescription'],qty:['qty','quantity'],uom:['uom']}
 };
 let ranges=null;
 const pageGroups=new Map();
 rows.forEach(row=>{const pageNo=row&&row._page||1;if(!pageGroups.has(pageNo))pageGroups.set(pageNo,[]);pageGroups.get(pageNo).push(row)});
 let previousPageLast=null;
 for(const [pageNo,pageRows] of pageGroups){
  const records=[],continuations=[];
  for(const row of pageRows){
   const candidate=makeColumnMap(row,aliases[kind]);
   if(!ranges){if(Object.keys(candidate).length>=5){ranges=candidate;continue}}
   if(!ranges)continue;
   if(Object.keys(candidate).length>=3)continue;
   const codeText=columnValue(row,ranges,kind==='bom'?'child':'code').replace(/\s+/g,'');
   const code=codeText.match(CODE_RE);const itemCode=code?code[0]:'';
   if(!itemCode){
    const continuation=fixDescription(columnValue(row,ranges,'desc'));
    if(continuation)continuations.push({y:row._y,text:continuation});
    continue;
   }
   const desc=fixDescription(columnValue(row,ranges,'desc'));
   const record={_page:pageNo,_anchorY:row._y,_descParts:desc?[{y:row._y,text:desc}]:[]};
   if(kind==='inventory'||kind==='store'){
    const uom=columnValue(row,ranges,'uom');
    Object.assign(record,{sub:columnValue(row,ranges,'sub').replace(/^'/,''),locator:columnValue(row,ranges,'locator'),code:itemCode,desc:'',uom:uom||'NOS',opening:columnNumber(row,ranges,'opening'),received:columnNumber(row,ranges,'received'),issued:columnNumber(row,ranges,'issued'),closing:columnNumber(row,ranges,'closing')});
   }else if(kind==='slow'){
    const stock=columnNumber(row,ranges,'stock');const rate=columnNumber(row,ranges,'rate');const pdfValue=columnNumber(row,ranges,'value');
    Object.assign(record,{code:itemCode,desc:'',uom:columnValue(row,ranges,'uom'),stock,rate,value:pdfValue>0?pdfValue:stock*rate,location:columnValue(row,ranges,'location')});
   }else if(kind==='voucher'){
    Object.assign(record,{code:itemCode,desc:'',locator:columnValue(row,ranges,'locator'),demand:columnNumber(row,ranges,'demand'),balance:columnNumber(row,ranges,'balance')});
   }else if(kind==='ir'){
    Object.assign(record,{code:itemCode,desc:'',locator:columnValue(row,ranges,'locator'),fb:columnValue(row,ranges,'fb'),serial:columnValue(row,ranges,'serial'),reference:columnValue(row,ranges,'reference'),demand:columnNumber(row,ranges,'demand'),balance:columnNumber(row,ranges,'balance')});
   }else{
    Object.assign(record,{parent:columnValue(row,ranges,'parent'),child:itemCode,desc:'',qty:columnNumber(row,ranges,'qty'),uom:columnValue(row,ranges,'uom')});
   }
   records.push(record);
  }
  for(const part of continuations){
   if(!records.length){
    if(previousPageLast&&part.text.length<=12)previousPageLast.desc=fixDescription((previousPageLast.desc||'')+' '+part.text);
    continue;
   }
   // A wrapped description belongs to the closest item row ABOVE it,
   // not whichever row happens to be nearest (which may be the next item).
   const above=records.filter(record=>record._anchorY>=part.y)
     .sort((a,b)=>(a._anchorY-part.y)-(b._anchorY-part.y));
   if(above.length){
    above[0]._descParts.push(part);
   }else if(previousPageLast&&part.text.length<=12){
    previousPageLast.desc=fixDescription((previousPageLast.desc||'')+' '+part.text);
   }else{
    records[0]._descParts.push(part);
   }
  }
  records.forEach(record=>{
   record._descParts.sort((a,b)=>b.y-a.y);
   record.desc=fixDescription(record._descParts.map(part=>part.text).join(' '));
   delete record._page;delete record._anchorY;delete record._descParts;
   out.push(record);
  });
  if(records.length)previousPageLast=records[records.length-1];
 }
 if(!ranges)throw new Error('PDF header/columns not recognized. Please upload the standard Inventory/Store PDF.');
 const seen=new Set();return out.filter(r=>{const k=(r.code||r.child||'')+'|'+(r.locator||'')+'|'+(r.sub||'');if(seen.has(k))return false;seen.add(k);return true});
}
function normalizeExcel(kind,r){
 const get=(...names)=>{for(const n of names){for(const k in r){if(k.toLowerCase().replace(/[^a-z]/g,'').includes(n))return r[k]}}return ''};
 if(kind==='inventory'||kind==='store')return{sub:clean(get('subinventory','sub')),locator:clean(get('locator')),code:clean(get('itemcode','code')),desc:fixDescription(get('itemdescription','description')),uom:clean(get('uom')),opening:num(get('opening')),received:num(get('received')),issued:num(get('issued')),closing:num(get('closing'))};
 if(kind==='slow'){const stock=num(get('stock','quantity'));const rate=num(get('rate','cost'));const value=num(get('value'));return{code:clean(get('itemcode','code')),desc:fixDescription(get('itemdescription','description')),uom:clean(get('uom')),stock,rate,value:value>0?value:stock*rate,location:clean(get('location'))}}
 if(kind==='voucher')return{code:clean(get('itemcode','code')),desc:fixDescription(get('description','desc')),locator:clean(get('destinationlocator','locator')),demand:num(get('demandqty','demand')),balance:num(get('balanceqty','balance'))};
 if(kind==='ir')return{code:clean(get('itemcode','code')),desc:fixDescription(get('description','desc')),locator:clean(get('destinationlocator','locator')),fb:clean(get('fbnum','fbno','fb')),serial:clean(get('serialnum','serialno','serial')),reference:clean(get('reference')),demand:num(get('demandqty','demand')),balance:num(get('balanceqty','balance'))};
 return{parent:clean(get('parent','fgcode','fg')),child:clean(get('childcode','itemcode','code')),desc:fixDescription(get('description','desc')),qty:num(get('qty','quantity')),uom:clean(get('uom'))};
}
const fileMap={inventoryFile:'inventory',storeFile:'store',voucherFile:'voucher',irFile:'ir',bomFile:'bom',slowFile:'slow'};
Object.entries(fileMap).forEach(([id,kind])=>{const input=document.getElementById(id);if(!input)return;input.onchange=async e=>{const target=e&&e.target?e.target:null;const f=target&&target.files&&target.files[0];if(!f)return;showProgress(kind,'Starting...');try{const rows=await parseFile(f,kind);if(!rows.length){failProgress(kind,'No records detected in file');return}if(kind==='voucher'){rows.forEach(r=>{const inv=data.inventory.find(x=>x.code===r.code);if(inv)inv.closing=num(inv.closing)+r.demand;const st=data.store.find(x=>x.code===r.code);if(st)st.closing=num(st.closing)-r.demand})}setProgress(kind,'Saving...',97);data[kind]=data[kind].concat(rows);await save();render();doneProgress(kind,rows.length+' imported')}catch(err){console.error('Import error:',err);failProgress(kind,'Import failed: '+(err.message||err))}finally{if(target)target.value=''}}});
render();initFirebase();
