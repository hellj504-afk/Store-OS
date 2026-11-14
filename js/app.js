const FIELDS={inventory:[['sub','Sub Inventory'],['locator','Locator'],['code','Item Code'],['desc','Description'],['uom','UOM'],['opening','Opening'],['received','Received'],['issued','Issued'],['closing','Closing']],store:[['sub','Sub Inventory'],['locator','Locator'],['code','Item Code'],['desc','Description'],['uom','UOM'],['opening','Opening'],['received','Received'],['issued','Issued'],['closing','Closing']],voucher:[['code','Item Code'],['desc','Description'],['locator','Destination Locator'],['demand','Demand Qty'],['balance','Balance Qty']],ir:[['code','Item Code'],['desc','Description'],['locator','Destination Locator'],['fb','F.B No.'],['serial','Serial No.'],['reference','Reference'],['demand','Demand Qty'],['balance','Balance Qty']],bom:[['parent','Parent / FG Code'],['child','Child Item Code'],['desc','Description'],['qty','Qty'],['uom','UOM']],slow:[['code','Item Code'],['desc','Description'],['uom','UOM'],['stock','Stock'],['rate','Rate'],['value','Value'],['location','Location']]};
const KEYS=['inventory','store','voucher','ir','bom','slow'];
let data=JSON.parse(localStorage.getItem('storeOS')||'{}');KEYS.forEach(k=>data[k]=data[k]||[]);
let firebaseApi=null,saving=false;
if(typeof pdfjsLib!=='undefined'){pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'}
const money=n=>(Number(n)||0).toLocaleString(undefined,{maximumFractionDigits:2});
const rateOf=code=>{const i=data.slow.find(x=>String(x.code||'').trim()===String(code||'').trim());return i?Number(i.rate)||0:0};
const toast=m=>{const t=document.getElementById('toast');if(!t)return;t.textContent=m;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),3000)};
function buttonProgress(kind,text,pct){const el=document.getElementById(kind+'Progress');if(el)el.textContent=text?pct+'%':''}
function showProgress(kind,text){buttonProgress(kind,text,1)}
function setProgress(kind,text,pct){buttonProgress(kind,text,pct)}
function doneProgress(kind,text){buttonProgress(kind,text,100);setTimeout(()=>buttonProgress(kind,'',0),2500)}
function failProgress(kind,text){buttonProgress(kind,'Error',100);toast(text);setTimeout(()=>buttonProgress(kind,'',0),6000)}
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
 const invTotal=data.inventory.reduce((s,r)=>s+(Number(r.closing)||0)*rateOf(r.code),0);
 const storeTotal=data.store.reduce((s,r)=>s+(Number(r.closing)||0)*rateOf(r.code),0);
 const invTotalEl=document.getElementById('invTotal');const storeTotalEl=document.getElementById('storeTotal');const itemTotalEl=document.getElementById('itemTotal');
 if(invTotalEl)invTotalEl.textContent=money(invTotal);if(storeTotalEl)storeTotalEl.textContent=money(storeTotal);if(itemTotalEl)itemTotalEl.textContent=data.inventory.length+data.store.length;
 drawChart(invTotal,storeTotal);
 table('inventoryTable',['Sub Inventory','Locator','Item Code','Description','UOM','Opening','Received','Issued','Closing','Rate','Cost'],data.inventory.map(r=>[r.sub,r.locator,r.code,r.desc,r.uom,r.opening,r.received,r.issued,r.closing,money(rateOf(r.code)),money((Number(r.closing)||0)*rateOf(r.code))]));
 table('storeTable',['Sub Inventory','Locator','Item Code','Description','UOM','Opening','Received','Issued','Closing','Rate','Cost'],data.store.map(r=>[r.sub,r.locator,r.code,r.desc,r.uom,r.opening,r.received,r.issued,r.closing,money(rateOf(r.code)),money((Number(r.closing)||0)*rateOf(r.code))]));
 table('voucherTable',['Item Code','Description','Destination Locator','Demand Qty','Balance Qty'],data.voucher.map(r=>[r.code,r.desc,r.locator,r.demand,r.balance]));
 table('irTable',['Item Code','Description','Destination Locator','F.B No.','Serial No.','Reference','Demand Qty','Balance Qty'],data.ir.map(r=>[r.code,r.desc,r.locator,r.fb,r.serial,r.reference,r.demand,r.balance]));
 renderBom();table('slowTable',['Item Code','Description','UOM','Stock','Rate','Value','Location'],data.slow.map(r=>[r.code,r.desc,r.uom,r.stock,money(r.rate),money(r.value),r.location]));save();
}
function table(id,heads,rows){const el=document.getElementById(id);if(!el)return;el.innerHTML='<thead><tr>'+heads.map(h=>'<th>'+h+'</th>').join('')+'</tr></thead><tbody>'+(rows.length?rows.map(r=>'<tr>'+r.map(c=>'<td>'+(c??'')+'</td>').join('')+'</tr>').join(''):'<tr><td colspan="'+heads.length+'" style="color:#9aa7c7">No records</td></tr>')+'</tbody>'}
function renderBom(){const search=document.getElementById('bomSearch');const cost=document.getElementById('bomCost');if(!search||!cost)return;const q=String(search.value||'').toLowerCase();const rows=data.bom.filter(r=>{const parent=String(r.parent||'').toLowerCase();const child=String(r.child||'').toLowerCase();const desc=String(r.desc||'').toLowerCase();return !q||parent.includes(q)||child.includes(q)||desc.includes(q)});table('bomTable',['Parent / FG','Child Item','Description','Qty','UOM','Rate','Line Cost'],rows.map(r=>{const c=(Number(r.qty)||0)*rateOf(r.child);return[r.parent,r.child,r.desc,r.qty,r.uom,money(rateOf(r.child)),money(c)]}));cost.textContent=money(rows.reduce((s,r)=>s+(Number(r.qty)||0)*rateOf(r.child),0))}
function drawChart(a,b){const c=document.getElementById('chart');if(!c||!c.getContext)return;const x=c.getContext('2d');if(!x)return;c.width=c.offsetWidth*2;c.height=440;x.scale(2,2);const w=c.offsetWidth,h=220,max=Math.max(a,b,1);x.clearRect(0,0,w,h);[[a,'#4f8cff','Inventory'],[b,'#22d3ee','Store']].forEach((d,i)=>{const bw=110,bx=80+i*220,bh=(d[0]/max)*150;x.fillStyle='rgba(255,255,255,.08)';x.fillRect(bx,40,bw,150);const g=x.createLinearGradient(0,40,0,190);g.addColorStop(0,d[1]);g.addColorStop(1,'rgba(255,255,255,.05)');x.fillStyle=g;x.fillRect(bx,190-bh,bw,bh);x.fillStyle='#fff';x.font='bold 15px Inter';x.fillText(money(d[0]),bx,30);x.fillStyle='#9aa7c7';x.font='12px Inter';x.fillText(d[2],bx,208)})}
document.querySelectorAll('[data-clear]').forEach(b=>b.onclick=async()=>{if(confirm('Clear all '+b.dataset.clear+' records?')){data[b.dataset.clear]=[];await save();render();toast('Cleared')}});
document.querySelectorAll('[data-add]').forEach(b=>b.onclick=()=>openModal(b.dataset.add));
function openModal(type){const m=document.getElementById('modal');if(!m)return;document.getElementById('modalTitle').textContent='Add '+type.toUpperCase()+' Item';document.getElementById('modalFields').innerHTML=FIELDS[type].map(([k,l])=>'<input class="input" id="f_'+k+'" placeholder="'+l+'">').join('');m.classList.add('open');document.getElementById('modalSave').onclick=async()=>{const row={};FIELDS[type].forEach(([k])=>{const input=document.getElementById('f_'+k);row[k]=input?input.value:''});if(type==='slow'&&!row.rate)row.rate=0;if(type==='slow'&&!row.value)row.value=(Number(row.stock)||0)*(Number(row.rate)||0);data[type].push(row);await save();render();m.classList.remove('open');toast('Item added')}}
const modalCancel=document.getElementById('modalCancel');if(modalCancel)modalCancel.onclick=()=>document.getElementById('modal').classList.remove('open');
const bomSearch=document.getElementById('bomSearch');if(bomSearch)bomSearch.oninput=renderBom;
function num(v){if(v==null)return 0;const s=String(v).replace(/,/g,'').replace(/[^0-9.\-]/g,'').trim();const n=parseFloat(s);return isNaN(n)?0:n}
function clean(s){return String(s||'').replace(/\s+/g,' ').trim()}
function isHeaderNoise(text){const t=text.toLowerCase();return t.includes('pak elektron')||t.includes('slow moving inventory status')||t.includes('subinventory / locator wise')||t.includes('unit 2 itr')||t.includes('from locator')||t.includes('to locator')||t.includes('from date')||t.includes('to date')||t.includes('subinventory:')||t.includes('printed by')||t.includes('page ')||t.includes('inv. group')||t.includes('aging:')}
async function extractPdfRows(file,kind){
 if(typeof pdfjsLib==='undefined'||!pdfjsLib)throw new Error('PDF reader library not loaded. Internet/ad-blocker check karein.');
 const buf=await file.arrayBuffer();let pdf;
 try{pdf=await pdfjsLib.getDocument({data:new Uint8Array(buf)}).promise}catch(e){throw new Error('PDF could not be opened: '+(e.message||e))}
 if(!pdf||!pdf.numPages)throw new Error('PDF has no readable pages');
 const total=pdf.numPages;const pages=[];
 for(let p=1;p<=total;p++){
  setProgress(kind,'Reading page '+p+' of '+total,Math.round(((p-1)/total)*90));
  let page,tc;
  try{page=await pdf.getPage(p);tc=await page.getTextContent()}catch(e){throw new Error('PDF page '+p+' could not be read: '+(e.message||e))}
  const rawItems=tc&&Array.isArray(tc.items)?tc.items:[];
  const items=rawItems.filter(i=>i&&typeof i.str==='string'&&i.str.trim()&&i.transform).map(i=>({text:clean(i.str),x:Math.round(i.transform?.[4]||0),y:Math.round(i.transform?.[5]||0)})).filter(i=>i.text&&!isHeaderNoise(i.text));
  const rows=new Map();items.forEach(i=>{const y=Math.round(i.y/3)*3;if(!rows.has(y))rows.set(y,[]);rows.get(y).push(i)});
  const arranged=[...rows.entries()].sort((a,b)=>b[0]-a[0]).map(([,cells])=>cells.sort((a,b)=>a.x-b.x));pages.push(...arranged);await new Promise(r=>setTimeout(r,10))
 }
 setProgress(kind,'Extracting records...',92);return pages;
}
function makeColumnMap(header,aliases){
 const cols={};(header||[]).forEach((cell,i)=>{if(!cell)return;const t=cell.text.toLowerCase().replace(/[^a-z]/g,'');for(const[key,keys]of Object.entries(aliases)){if(!cols[key]&&keys.some(k=>t===k||t.includes(k)))cols[key]={index:i,x:cell.x}}});
 const entries=Object.entries(cols).sort((a,b)=>a[1].x-b[1].x);const ranges={};
 entries.forEach(([key,cell],i)=>{const next=entries[i+1];ranges[key]={start:cell.x-8,end:next?next[1].x-8:99999}});
 return ranges;
}
function columnValue(row,ranges,key){const range=ranges[key];if(!range)return '';let text='';(row||[]).forEach(cell=>{if(cell&&cell.x>=range.start&&cell.x<range.end)text+=' '+cell.text});return clean(text)}
function columnNumber(row,ranges,key){return num(columnValue(row,ranges,key))}
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
  slow:{code:['itemcode'],desc:['itemdescription'],uom:['uom'],stock:['stock'],rate:['rate'],value:['value'],location:['location']},
  voucher:{code:['itemcode'],desc:['description'],locator:['destinationlocator'],demand:['demandqty'],balance:['balanceqty']},
  ir:{code:['itemcode'],desc:['description'],locator:['destinationlocator'],fb:['fbnum','fbno'],serial:['serialnum','serialno'],reference:['reference'],demand:['demandqty'],balance:['balanceqty']},
  bom:{parent:['parent','fgcode'],child:['childcode','itemcode'],desc:['description'],qty:['qty','quantity'],uom:['uom']}
 };
 let ranges=null;
 for(const row of rows){
  if(!ranges){const candidate=makeColumnMap(row,aliases[kind]);if(Object.keys(candidate).length>=5){ranges=candidate;continue}}
  const codeText=columnValue(row,ranges,'code');const code=codeText.match(CODE_RE);const itemCode=code?code[0]:codeText;
  if(!itemCode||itemCode.toLowerCase().includes('itemcode'))continue;
  if(kind==='inventory'||kind==='store'){
   let desc=columnValue(row,ranges,'desc');const uom=columnValue(row,ranges,'uom');
   if(!uom&&UOM_RE.test(desc)){const m=desc.match(UOM_RE);desc=clean(desc.replace(m[0],''))}
   out.push({sub:columnValue(row,ranges,'sub').replace(/^'/,''),locator:columnValue(row,ranges,'locator'),code:itemCode,desc,uom:uom||'NOS',opening:columnNumber(row,ranges,'opening'),received:columnNumber(row,ranges,'received'),issued:columnNumber(row,ranges,'issued'),closing:columnNumber(row,ranges,'closing')})
  }else if(kind==='slow'){out.push({code:itemCode,desc:columnValue(row,ranges,'desc'),uom:columnValue(row,ranges,'uom'),stock:columnNumber(row,ranges,'stock'),rate:columnNumber(row,ranges,'rate'),value:columnNumber(row,ranges,'value'),location:columnValue(row,ranges,'location')})}
  else if(kind==='voucher'){out.push({code:itemCode,desc:columnValue(row,ranges,'desc'),locator:columnValue(row,ranges,'locator'),demand:columnNumber(row,ranges,'demand'),balance:columnNumber(row,ranges,'balance')})}
  else if(kind==='ir'){out.push({code:itemCode,desc:columnValue(row,ranges,'desc'),locator:columnValue(row,ranges,'locator'),fb:columnValue(row,ranges,'fb'),serial:columnValue(row,ranges,'serial'),reference:columnValue(row,ranges,'reference'),demand:columnNumber(row,ranges,'demand'),balance:columnNumber(row,ranges,'balance')})}
  else{out.push({parent:columnValue(row,ranges,'parent'),child:itemCode,desc:columnValue(row,ranges,'desc'),qty:columnNumber(row,ranges,'qty'),uom:columnValue(row,ranges,'uom')})}
 }
 const seen=new Set();return out.filter(r=>{const k=(r.code||r.child||'')+'|'+(r.locator||'')+'|'+(r.sub||'');if(seen.has(k))return false;seen.add(k);return true});
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
Object.entries(fileMap).forEach(([id,kind])=>{const input=document.getElementById(id);if(!input)return;input.onchange=async e=>{const target=e&&e.target?e.target:null;const f=target&&target.files&&target.files[0];if(!f)return;showProgress(kind,'Starting...');try{const rows=await parseFile(f,kind);if(!rows.length){failProgress(kind,'No records detected in file');return}if(kind==='voucher'){rows.forEach(r=>{const inv=data.inventory.find(x=>x.code===r.code);if(inv)inv.closing=num(inv.closing)+r.demand;const st=data.store.find(x=>x.code===r.code);if(st)st.closing=num(st.closing)-r.demand})}setProgress(kind,'Saving...',97);data[kind]=data[kind].concat(rows);await save();render();doneProgress(kind,rows.length+' imported')}catch(err){console.error('Import error:',err);failProgress(kind,'Import failed: '+(err.message||err))}finally{if(target)target.value=''}}});
render();initFirebase();
