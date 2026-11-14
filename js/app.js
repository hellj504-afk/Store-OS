const FIELDS={inventory:[['sub','Sub Inventory'],['locator','Locator'],['code','Item Code'],['desc','Description'],['uom','UOM'],['opening','Opening'],['received','Received'],['issued','Issued'],['closing','Closing']],store:[['sub','Sub Inventory'],['locator','Locator'],['code','Item Code'],['desc','Description'],['uom','UOM'],['opening','Opening'],['received','Received'],['issued','Issued'],['closing','Closing']],voucher:[['code','Item Code'],['desc','Description'],['locator','Destination Locator'],['demand','Demand Qty'],['balance','Balance Qty']],ir:[['code','Item Code'],['desc','Description'],['locator','Destination Locator'],['fb','F.B No.'],['serial','Serial No.'],['reference','Reference'],['demand','Demand Qty'],['balance','Balance Qty']],bom:[['parent','Parent / FG Code'],['child','Child Item Code'],['desc','Description'],['qty','Qty'],['uom','UOM']],slow:[['code','Item Code'],['desc','Description'],['uom','UOM'],['stock','Stock'],['rate','Rate'],['value','Value'],['location','Location']]};
const KEYS=['inventory','store','voucher','ir','bom','slow'];
let data=JSON.parse(localStorage.getItem('storeOS')||'{}');KEYS.forEach(k=>data[k]=data[k]||[]);
let firebaseApi=null,saving=false;
if(typeof pdfjsLib!=='undefined'){pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'}
const money=n=>(Number(n)||0).toLocaleString(undefined,{maximumFractionDigits:2});
const rateOf=code=>{const i=data.slow.find(x=>String(x.code).trim()===String(code).trim());return i?Number(i.rate)||0:0};
const toast=m=>{const t=document.getElementById('toast');t.textContent=m;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),3000)};
const progress={wrap:document.getElementById('progressWrap'),bar:document.getElementById('progressBar'),text:document.getElementById('progressText'),percent:document.getElementById('progressPercent')};
function showProgress(text){progress.wrap.classList.add('show');progress.bar.className='progress-bar';progress.bar.style.width='0%';progress.percent.textContent='0%';progress.text.textContent=text}
function setProgress(text,pct){progress.text.textContent=text;progress.percent.textContent=Math.round(pct)+'%';progress.bar.style.width=pct+'%'}
function doneProgress(text){progress.text.textContent=text;progress.percent.textContent='100%';progress.bar.style.width='100%';progress.bar.classList.add('done');setTimeout(()=>progress.wrap.classList.remove('show'),2500)}
function failProgress(text){progress.text.textContent=text;progress.bar.style.width='100%';progress.bar.classList.add('error');setTimeout(()=>progress.wrap.classList.remove('show'),4000)}
async function initFirebase(){
 try{
  const [{initializeApp},{getFirestore,doc,getDoc,setDoc}]=await Promise.all([import('https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js'),import('https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js')]);
  const app=initializeApp({apiKey:'AIzaSyCkK3jRQFI_JOr4PB2UUk8Y0XK3q-1Uzmk',authDomain:'store-management-150d6.firebaseapp.com',projectId:'store-management-150d6',storageBucket:'store-management-150d6.firebasestorage.app',messagingSenderId:'778307476882',appId:'1:778307476882:web:1a0e71b12b71fb6265354b',measurementId:'G-6JLZHFEX5E'});
  const db=getFirestore(app);const ref=s=>doc(db,'storeOS',s);
  firebaseApi={load:async s=>{const snap=await getDoc(ref(s));return snap.exists()?snap.data().items||[]:[]},save:async(s,items)=>{await setDoc(ref(s),{items,updatedAt:new Date().toISOString()})}};
  for(const k of KEYS){const remote=await firebaseApi.load(k);if(remote.length)data[k]=remote}
  render();toast('Firebase connected')
 }catch(e){console.error(e);toast('Firebase unavailable — using local storage')}
}
async function save(){localStorage.setItem('storeOS',JSON.stringify(data));if(!firebaseApi||saving)return;saving=true;try{await Promise.all(KEYS.map(k=>firebaseApi.save(k,data[k])))}catch(e){toast('Firebase save failed')}finally{saving=false}}
function render(){
 const invTotal=data.inventory.reduce((s,r)=>s+(Number(r.closing)||0)*rateOf(r.code),0);
 const storeTotal=data.store.reduce((s,r)=>s+(Number(r.closing)||0)*rateOf(r.code),0);
 document.getElementById('invTotal').textContent=money(invTotal);
 document.getElementById('storeTotal').textContent=money(storeTotal);
 document.getElementById('itemTotal').textContent=data.inventory.length+data.store.length;
 drawChart(invTotal,storeTotal);
 table('inventoryTable',['Sub Inventory','Locator','Item Code','Description','UOM','Opening','Received','Issued','Closing','Rate','Cost'],data.inventory.map(r=>[r.sub,r.locator,r.code,r.desc,r.uom,r.opening,r.received,r.issued,r.closing,money(rateOf(r.code)),money((Number(r.closing)||0)*rateOf(r.code))]));
 table('storeTable',['Sub Inventory','Locator','Item Code','Description','UOM','Opening','Received','Issued','Closing','Rate','Cost'],data.store.map(r=>[r.sub,r.locator,r.code,r.desc,r.uom,r.opening,r.received,r.issued,r.closing,money(rateOf(r.code)),money((Number(r.closing)||0)*rateOf(r.code))]));
 table('voucherTable',['Item Code','Description','Destination Locator','Demand Qty','Balance Qty'],data.voucher.map(r=>[r.code,r.desc,r.locator,r.demand,r.balance]));
 table('irTable',['Item Code','Description','Destination Locator','F.B No.','Serial No.','Reference','Demand Qty','Balance Qty'],data.ir.map(r=>[r.code,r.desc,r.locator,r.fb,r.serial,r.reference,r.demand,r.balance]));
 renderBom();table('slowTable',['Item Code','Description','UOM','Stock','Rate','Value','Location'],data.slow.map(r=>[r.code,r.desc,r.uom,r.stock,money(r.rate),money(r.value),r.location]));save();
}
function table(id,heads,rows){const el=document.getElementById(id);el.innerHTML='<thead><tr>'+heads.map(h=>'<th>'+h+'</th>').join('')+'</tr></thead><tbody>'+(rows.length?rows.map(r=>'<tr>'+r.map(c=>'<td>'+(c??'')+'</td>').join('')+'</tr>').join(''):'<tr><td colspan="'+heads.length+'" style="color:#9aa7c7">No records</td></tr>')+'</tbody>'}
function renderBom(){const q=(document.getElementById('bomSearch').value||'').toLowerCase();const rows=data.bom.filter(r=>!q||String(r.parent).toLowerCase().includes(q)||String(r.child).toLowerCase().includes(q)||String(r.desc).toLowerCase().includes(q));table('bomTable',['Parent / FG','Child Item','Description','Qty','UOM','Rate','Line Cost'],rows.map(r=>{const c=(Number(r.qty)||0)*rateOf(r.child);return[r.parent,r.child,r.desc,r.qty,r.uom,money(rateOf(r.child)),money(c)]}));document.getElementById('bomCost').textContent=money(rows.reduce((s,r)=>s+(Number(r.qty)||0)*rateOf(r.child),0))}
function drawChart(a,b){const c=document.getElementById('chart'),x=c.getContext('2d');c.width=c.offsetWidth*2;c.height=440;x.scale(2,2);const w=c.offsetWidth,h=220,max=Math.max(a,b,1);x.clearRect(0,0,w,h);[[a,'#4f8cff','Inventory'],[b,'#22d3ee','Store']].forEach((d,i)=>{const bw=110,bx=80+i*220,bh=(d[0]/max)*150;x.fillStyle='rgba(255,255,255,.08)';x.fillRect(bx,40,bw,150);const g=x.createLinearGradient(0,40,0,190);g.addColorStop(0,d[1]);g.addColorStop(1,'rgba(255,255,255,.05)');x.fillStyle=g;x.fillRect(bx,190-bh,bw,bh);x.fillStyle='#fff';x.font='bold 15px Inter';x.fillText(money(d[0]),bx,30);x.fillStyle='#9aa7c7';x.font='12px Inter';x.fillText(d[2],bx,208)})}
document.querySelectorAll('[data-clear]').forEach(b=>b.onclick=async()=>{if(confirm('Clear all '+b.dataset.clear+' records?')){data[b.dataset.clear]=[];await save();render();toast('Cleared')}});
document.querySelectorAll('[data-add]').forEach(b=>b.onclick=()=>openModal(b.dataset.add));
function openModal(type){const m=document.getElementById('modal');document.getElementById('modalTitle').textContent='Add '+type.toUpperCase()+' Item';document.getElementById('modalFields').innerHTML=FIELDS[type].map(([k,l])=>'<input class="input" id="f_'+k+'" placeholder="'+l+'">').join('');m.classList.add('open');document.getElementById('modalSave').onclick=async()=>{const row={};FIELDS[type].forEach(([k])=>row[k]=document.getElementById('f_'+k).value);if(type==='slow'&&!row.rate)row.rate=0;if(type==='slow'&&!row.value)row.value=(Number(row.stock)||0)*(Number(row.rate)||0);data[type].push(row);await save();render();m.classList.remove('open');toast('Item added')}}
document.getElementById('modalCancel').onclick=()=>document.getElementById('modal').classList.remove('open');
document.getElementById('bomSearch').oninput=renderBom;
function num(v){if(v==null)return 0;const s=String(v).replace(/,/g,'').replace(/[^0-9.\-]/g,'').trim();const n=parseFloat(s);return isNaN(n)?0:n}
function clean(s){return String(s||'').replace(/\s+/g,' ').trim()}
async function extractPdfRows(file){
 if(typeof pdfjsLib==='undefined')throw new Error('PDF reader not loaded. Internet/ad-blocker check karein.');
 const buf=await file.arrayBuffer();const pdf=await pdfjsLib.getDocument({data:buf}).promise;const total=pdf.numPages;const pages=[];
 for(let p=1;p<=total;p++){setProgress('Reading '+file.name+' — page '+p+' of '+total,((p-1)/total)*90);const page=await pdf.getPage(p);const tc=await page.getTextContent();const items=tc.items.map(i=>({text:clean(i.str),x:Math.round(i.transform[4]),y:Math.round(i.transform[5])})).filter(i=>i.text);
  const rows=new Map();items.forEach(i=>{const y=Math.round(i.y/3)*3;if(!rows.has(y))rows.set(y,[]);rows.get(y).push(i)});
  const arranged=[...rows.entries()].sort((a,b)=>b[0]-a[0]).map(([,cells])=>cells.sort((a,b)=>a.x-b.x));pages.push(...arranged);await new Promise(r=>setTimeout(r,10))}
 setProgress('Extracting records...',92);return pages;
}
function findHeader(rows,names){for(const row of rows){const map={};row.forEach((cell,i)=>{const t=cell.text.toLowerCase().replace(/[^a-z]/g,'');for(const[key,keys]of Object.entries(names)){if(keys.some(k=>t===k||t.includes(k)))map[key]=i}});if(Object.keys(map).length>=5)return map}return null}
function cellAt(row,index){return index==null?'':clean((row[index]||{}).text)}
function numberAt(row,index){return num(cellAt(row,index))}
const CODE_RE=/\b(?:FG|RM|CM|SS|WIP|GI|SCR)\d{2,5}(?:-\d+)*-\d{2}-\d{3}\b/i;
function parseInventoryRow(row,h){
 const code=cellAt(row,h.code).match(CODE_RE);const itemCode=code?code[0]:cellAt(row,h.code);
 if(!itemCode||itemCode.toLowerCase().includes('itemcode'))return null;
 const nums=[];for(let i=h.opening;i<=h.closing;i++)nums.push(numberAt(row,i));
 return{sub:cellAt(row,h.sub).replace(/^'/,''),locator:cellAt(row,h.locator),code:itemCode,desc:cellAt(row,h.desc),uom:cellAt(row,h.uom),opening:nums[0]||0,received:nums[1]||0,issued:nums[2]||0,closing:nums[3] ?? (nums[0] || 0)};
}
async function parseFile(file,kind){
 if(!file.name.toLowerCase().endsWith('.pdf')){
  showProgress('Reading Excel file...');setProgress('Reading Excel file...',45);const wb=XLSX.read(await file.arrayBuffer());const raw=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{defval:'',raw:false});setProgress('Extracting records...',90);return raw.map(r=>normalizeExcel(kind,r)).filter(r=>r.code||r.child);
 }
 const rows=await extractPdfRows(file);const out=[];
 if(kind==='inventory'||kind==='store'){
  const h=findHeader(rows,{sub:['subinventory'],locator:['locator'],code:['itemcode'],desc:['itemdescription','description'],uom:['uom'],opening:['opening'],received:['received'],issued:['issued'],closing:['closing']});
  if(!h)return[];
  for(const row of rows){const r=parseInventoryRow(row,h);if(r)out.push(r)}
 }else{
  const aliases={slow:{code:['itemcode'],desc:['itemdescription'],uom:['uom'],stock:['stock'],rate:['rate'],value:['value'],location:['location']},voucher:{code:['itemcode'],desc:['description'],locator:['destinationlocator'],demand:['demandqty'],balance:['balanceqty']},ir:{code:['itemcode'],desc:['description'],locator:['destinationlocator'],fb:['fbnum','fbno'],serial:['serialnum','serialno'],reference:['reference'],demand:['demandqty'],balance:['balanceqty']},bom:{parent:['parent','fgcode'],child:['childcode','itemcode'],desc:['description'],qty:['qty','quantity'],uom:['uom']}};
  const h=findHeader(rows,aliases[kind]);if(!h)return[];
  for(const row of rows){
   const code=cellAt(row,h.code).match(CODE_RE);const itemCode=code?code[0]:cellAt(row,h.code);
   if(!itemCode||itemCode.toLowerCase().includes('itemcode'))continue;
   if(kind==='slow')out.push({code:itemCode,desc:cellAt(row,h.desc),uom:cellAt(row,h.uom),stock:numberAt(row,h.stock),rate:numberAt(row,h.rate),value:numberAt(row,h.value),location:cellAt(row,h.location)});
   else if(kind==='voucher')out.push({code:itemCode,desc:cellAt(row,h.desc),locator:cellAt(row,h.locator),demand:numberAt(row,h.demand),balance:numberAt(row,h.balance)});
   else if(kind==='ir')out.push({code:itemCode,desc:cellAt(row,h.desc),locator:cellAt(row,h.locator),fb:cellAt(row,h.fb),serial:cellAt(row,h.serial),reference:cellAt(row,h.reference),demand:numberAt(row,h.demand),balance:numberAt(row,h.balance)});
   else out.push({parent:cellAt(row,h.parent),child:itemCode,desc:cellAt(row,h.desc),qty:numberAt(row,h.qty),uom:cellAt(row,h.uom)});
  }
 }
 const seen=new Set();return out.filter(r=>{const k=(r.code||r.child)+'|'+(r.locator||'')+'|'+(r.sub||'');if(seen.has(k))return false;seen.add(k);return true});
}
function normalizeExcel(kind,r){
 const get=(...names)=>{for(const n of names){for(const k in r){if(k.toLowerCase().replace(/[^a-z]/g,'').includes(n))return r[k]}}return ''};
 if(kind==='inventory'||kind==='store')return{sub:clean(get('subinventory','sub')),locator:clean(get('locator')),code:clean(get('itemcode','code')),desc:clean(get('itemdescription','description')),uom:clean(get('uom')),opening:num(get('opening')),received:num(get('received')),issued:num(get('issued')),closing:num(get('closing'))};
 if(kind==='slow')return{code:clean(get('itemcode','code')),desc:clean(get('itemdescription','description')),uom:clean(get('uom')),stock:num(get('stock','quantity')),rate:num(get('rate','cost')),value:num(get('value')),location:clean(get('location'))};
 if(kind==='voucher')return{code:clean(get('itemcode','code')),desc:clean(get('description','desc')),locator:clean(get('destinationlocator','locator')),demand:num(get('demandqty','demand')),balance:num(get('balanceqty','balance'))};
 if(kind==='ir')return{code:clean(get('itemcode','code')),desc:clean(get('description','desc')),locator:clean(get('destinationlocator','locator')),fb:clean(get('fbnum','fbno','fb')),serial:clean(get('serialnum','serialno','serial')),reference:clean(get('reference')),demand:num(get('demandqty','demand')),balance:num(get('balanceqty','balance'))};
 return{parent:clean(get('parent','fgcode','fg')),child:clean(get('childcode','itemcode','code')),desc:clean(get('description','desc')),qty:num(get('qty','quantity')),uom:clean(get('uom'))};
}
const fileMap={inventoryFile:'inventory',storeFile:'store',voucherFile:'voucher',irFile:'ir',bomFile:'bom',slowFile:'slow'};
Object.entries(fileMap).forEach(([id,kind])=>{document.getElementById(id).onchange=async e=>{const f=e.target.files[0];if(!f)return;showProgress('Starting import: '+f.name);try{const rows=await parseFile(f,kind);if(!rows.length){failProgress('No records detected in file');return}if(kind==='voucher'){rows.forEach(r=>{const inv=data.inventory.find(x=>x.code===r.code);if(inv)inv.closing=num(inv.closing)+r.demand;const st=data.store.find(x=>x.code===r.code);if(st)st.closing=num(st.closing)-r.demand})}setProgress('Saving records...',97);data[kind]=data[kind].concat(rows);await save();render();doneProgress(rows.length+' records imported into '+kind.toUpperCase())}catch(err){failProgress('Import failed: '+err.message)}};e.target.value=''});
render();initFirebase();
