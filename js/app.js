const FIELDS={inventory:[['sub','Sub Inventory'],['code','Item Code'],['desc','Description'],['uom','UOM'],['opening','Opening'],['closing','Closing']],store:[['sub','Sub Inventory'],['code','Item Code'],['desc','Description'],['uom','UOM'],['opening','Opening'],['closing','Closing']],voucher:[['code','Item Code'],['desc','Description'],['locator','Destination Locator'],['demand','Demand Qty'],['balance','Balance Qty']],ir:[['code','Item Code'],['desc','Description'],['locator','Destination Locator'],['fb','F.B No.'],['serial','Serial No.'],['reference','Reference'],['demand','Demand Qty'],['balance','Balance Qty']],bom:[['parent','Parent / FG Code'],['child','Child Item Code'],['desc','Description'],['qty','Qty'],['uom','UOM']],slow:[['code','Item Code'],['desc','Description'],['uom','UOM'],['stock','Stock'],['rate','Rate'],['value','Value'],['location','Location']]};
const KEYS=['inventory','store','voucher','ir','bom','slow'];
let data=JSON.parse(localStorage.getItem('storeOS')||'{}');KEYS.forEach(k=>data[k]=data[k]||[]);
const save=()=>localStorage.setItem('storeOS',JSON.stringify(data));
const money=n=>(Number(n)||0).toLocaleString(undefined,{maximumFractionDigits:2});
const rateOf=code=>{const i=data.slow.find(x=>String(x.code).trim()===String(code).trim());return i?Number(i.rate)||0:0};
const toast=m=>{const t=document.getElementById('toast');t.textContent=m;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2600)};
function render(){
 const invTotal=data.inventory.reduce((s,r)=>s+(Number(r.closing)||0)*rateOf(r.code),0);
 const storeTotal=data.store.reduce((s,r)=>s+(Number(r.closing)||0)*rateOf(r.code),0);
 document.getElementById('invTotal').textContent=money(invTotal);
 document.getElementById('storeTotal').textContent=money(storeTotal);
 document.getElementById('itemTotal').textContent=data.inventory.length+data.store.length;
 drawChart(invTotal,storeTotal);
 table('inventoryTable',['Sub Inventory','Item Code','Description','UOM','Opening','Closing','Rate','Cost'],data.inventory.map(r=>[r.sub,r.code,r.desc,r.uom,r.opening,r.closing,money(rateOf(r.code)),money((Number(r.closing)||0)*rateOf(r.code))]));
 table('storeTable',['Sub Inventory','Item Code','Description','UOM','Opening','Closing','Rate','Cost'],data.store.map(r=>[r.sub,r.code,r.desc,r.uom,r.opening,r.closing,money(rateOf(r.code)),money((Number(r.closing)||0)*rateOf(r.code))]));
 table('voucherTable',['Item Code','Description','Destination Locator','Demand Qty','Balance Qty'],data.voucher.map(r=>[r.code,r.desc,r.locator,r.demand,r.balance]));
 table('irTable',['Item Code','Description','Destination Locator','F.B No.','Serial No.','Reference','Demand Qty','Balance Qty'],data.ir.map(r=>[r.code,r.desc,r.locator,r.fb,r.serial,r.reference,r.demand,r.balance]));
 renderBom();table('slowTable',['Item Code','Description','UOM','Stock','Rate','Value','Location'],data.slow.map(r=>[r.code,r.desc,r.uom,r.stock,money(r.rate),money(r.value),r.location]));save();
}
function table(id,heads,rows){const el=document.getElementById(id);el.innerHTML='<thead><tr>'+heads.map(h=>'<th>'+h+'</th>').join('')+'</tr></thead><tbody>'+(rows.length?rows.map(r=>'<tr>'+r.map(c=>'<td>'+(c??'')+'</td>').join('')+'</tr>').join(''):'<tr><td colspan="'+heads.length+'" style="color:#9aa7c7">No records</td></tr>')+'</tbody>'}
function renderBom(){const q=(document.getElementById('bomSearch').value||'').toLowerCase();const rows=data.bom.filter(r=>!q||String(r.parent).toLowerCase().includes(q)||String(r.child).toLowerCase().includes(q)||String(r.desc).toLowerCase().includes(q));table('bomTable',['Parent / FG','Child Item','Description','Qty','UOM','Rate','Line Cost'],rows.map(r=>{const c=(Number(r.qty)||0)*rateOf(r.child);return[r.parent,r.child,r.desc,r.qty,r.uom,money(rateOf(r.child)),money(c)]}));document.getElementById('bomCost').textContent=money(rows.reduce((s,r)=>s+(Number(r.qty)||0)*rateOf(r.child),0))}
function drawChart(a,b){const c=document.getElementById('chart'),x=c.getContext('2d');c.width=c.offsetWidth*2;c.height=440;x.scale(2,2);const w=c.offsetWidth,h=220,max=Math.max(a,b,1);x.clearRect(0,0,w,h);[[a,'#4f8cff','Inventory'],[b,'#22d3ee','Store']].forEach((d,i)=>{const bw=110,bx=80+i*220,bh=(d[0]/max)*150;x.fillStyle='rgba(255,255,255,.08)';x.fillRect(bx,40,bw,150);const g=x.createLinearGradient(0,40,0,190);g.addColorStop(0,d[1]);g.addColorStop(1,'rgba(255,255,255,.05)');x.fillStyle=g;x.fillRect(bx,190-bh,bw,bh);x.fillStyle='#fff';x.font='bold 15px Inter';x.fillText(money(d[0]),bx,30);x.fillStyle='#9aa7c7';x.font='12px Inter';x.fillText(d[2],bx,208)})}
document.querySelectorAll('.nav-btn').forEach(b=>b.onclick=()=>{document.querySelectorAll('.nav-btn').forEach(x=>x.classList.remove('active'));document.querySelectorAll('.view').forEach(x=>x.classList.remove('active'));b.classList.add('active');document.getElementById(b.dataset.view).classList.add('active')});
document.querySelectorAll('[data-clear]').forEach(b=>b.onclick=()=>{if(confirm('Clear all '+b.dataset.clear+' records?')){data[b.dataset.clear]=[];render();toast('Cleared')}});
document.querySelectorAll('[data-add]').forEach(b=>b.onclick=()=>openModal(b.dataset.add));
function openModal(type){const m=document.getElementById('modal');document.getElementById('modalTitle').textContent='Add '+type.toUpperCase()+' Item';document.getElementById('modalFields').innerHTML=FIELDS[type].map(([k,l])=>'<input class="input" id="f_'+k+'" placeholder="'+l+'">').join('');m.classList.add('open');document.getElementById('modalSave').onclick=()=>{const row={};FIELDS[type].forEach(([k])=>row[k]=document.getElementById('f_'+k).value);if(type==='slow'&&!row.rate)row.rate=0;if(type==='slow'&&!row.value)row.value=(Number(row.stock)||0)*(Number(row.rate)||0);data[type].push(row);save();render();m.classList.remove('open');toast('Item added')}}
document.getElementById('modalCancel').onclick=()=>document.getElementById('modal').classList.remove('open');
document.getElementById('bomSearch').oninput=renderBom;
function num(v){const n=String(v||'').replace(/,/g,'').trim();const x=parseFloat(n);return isNaN(x)?0:x}
async function parseFile(file,kind){
 if(file.name.toLowerCase().endsWith('.pdf')){
  const buf=await file.arrayBuffer();const pdf=await pdfjsLib.getDocument({data:buf}).promise;let text='';
  for(let p=1;p<=pdf.numPages;p++){const page=await pdf.getPage(p);const c=await page.getTextContent();text+=c.items.map(i=>i.str).join(' ')+'\n'}
  return parseText(text,kind);
 }
 const wb=XLSX.read(await file.arrayBuffer());const rows=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{defval:''});
 return rows.map(r=>normalize(kind,r));
}
function pick(row,names){for(const n of names){for(const k in row){if(k.toLowerCase().replace(/[^a-z]/g,'').includes(n))return row[k]}}return ''}
function normalize(kind,r){
 if(kind==='inventory'||kind==='store')return{sub:pick(r,['subinventory','sub']),code:pick(r,['itemcode','code']),desc:pick(r,['description','desc']),uom:pick(r,['uom']),opening:num(pick(r,['opening'])),closing:num(pick(r,['closing']))};
 if(kind==='voucher')return{code:pick(r,['itemcode','code']),desc:pick(r,['description','desc']),locator:pick(r,['destination','locator']),demand:num(pick(r,['demand'])),balance:num(pick(r,['balance']))};
 if(kind==='ir')return{code:pick(r,['itemcode','code']),desc:pick(r,['description','desc']),locator:pick(r,['destination','locator']),fb:pick(r,['fb']),serial:pick(r,['serial']),reference:pick(r,['reference']),demand:num(pick(r,['demand'])),balance:num(pick(r,['balance']))};
 if(kind==='bom')return{parent:pick(r,['parent','fg']),child:pick(r,['child','itemcode','code']),desc:pick(r,['description','desc']),qty:num(pick(r,['qty','quantity'])),uom:pick(r,['uom'])};
 return{code:pick(r,['itemcode','code']),desc:pick(r,['description','desc']),uom:pick(r,['uom']),stock:num(pick(r,['stock','quantity'])),rate:num(pick(r,['rate','cost'])),value:num(pick(r,['value'])),location:pick(r,['location'])};
}
function parseText(text,kind){
 const lines=text.split('\n').map(l=>l.trim()).filter(Boolean);const out=[];
 const codeRe=/\b(?:FG|RM|CM|SS|WIP|GI|SCR)\d{3,}-\d{3,}-\d{2}-\d{3}\b/i;
 for(const line of lines){const m=line.match(codeRe);if(!m)continue;const code=m[0];const after=line.slice(line.indexOf(code)+code.length).trim();const nums=after.match(/[\d,]+\.?\d*/g)||[];
 if(kind==='inventory'||kind==='store'){out.push({sub:'',code,desc:after.replace(/[\d,]+\.?\d*/g,'').trim(),uom:'',opening:num(nums[0]),closing:num(nums[1]??nums[0])})}
 else if(kind==='voucher'){out.push({code,desc:after.replace(/[\d,]+\.?\d*/g,'').trim(),locator:'',demand:num(nums[0]),balance:num(nums[1]??nums[0])})}
 else if(kind==='ir'){out.push({code,desc:after.replace(/[\d,]+\.?\d*/g,'').trim(),locator:'',fb:'',serial:'',reference:'',demand:num(nums[0]),balance:num(nums[1]??nums[0])})}
 else if(kind==='bom'){out.push({parent:'',child:code,desc:after.replace(/[\d,]+\.?\d*/g,'').trim(),qty:num(nums[0]),uom:''})}
 else{const rate=nums.length>=2?num(nums[nums.length-2]):0;out.push({code,desc:after.replace(/[\d,]+\.?\d*/g,'').trim(),uom:'',stock:num(nums[0]),rate,value:num(nums[nums.length-1]),location:''})}}
 return out;
}
const fileMap={inventoryFile:'inventory',storeFile:'store',voucherFile:'voucher',irFile:'ir',bomFile:'bom',slowFile:'slow'};
Object.entries(fileMap).forEach(([id,kind])=>{document.getElementById(id).onchange=async e=>{const f=e.target.files[0];if(!f)return;toast('Reading '+f.name+'...');try{const rows=await parseFile(f,kind);if(!rows.length)return toast('No rows detected');if(kind==='voucher'){rows.forEach(r=>{const inv=data.inventory.find(x=>x.code===r.code);if(inv)inv.closing=num(inv.closing)+r.demand;const st=data.store.find(x=>x.code===r.code);if(st)st.closing=num(st.closing)-r.demand})}data[kind]=data[kind].concat(rows);render();toast(rows.length+' records imported')}catch(err){toast('Import failed')}};e.target.value=''});
render();
