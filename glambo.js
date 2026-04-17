const K={svc:'gb2_svc',inv:'gb2_inv',exp:'gb2_exp',cus:'gb2_cus',pw:'gb2_pw'};
const load=k=>{try{return JSON.parse(localStorage.getItem(k)||'[]')}catch{return[]}};
const save=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
const today=()=>new Date().toISOString().split('T')[0];
const fmtD=s=>{if(!s)return '—';const[y,m,d]=s.split('-');return d+'/'+m+'/'+y};
const kes=n=>'KES '+Number(n||0).toLocaleString('en-KE');
const genId=a=>a.length?Math.max(...a.map(x=>+x.id||0))+1:1;
const isLocked=d=>d<today();

let currentRole='owner';
let unlockCb=null;

// ── HASH ──
function hashPw(pw){let h=0;for(let i=0;i<pw.length;i++){h=((h<<5)-h)+pw.charCodeAt(i);h|=0;}return 'g2_'+Math.abs(h).toString(36)+'_'+pw.length;}
const getPwH=()=>localStorage.getItem(K.pw)||'';
const setPwH=pw=>localStorage.setItem(K.pw,hashPw(pw));
const checkPw=pw=>hashPw(pw)===getPwH();
const hasPw=()=>!!getPwH();

// ── SETUP ──
let setupStep=1;
function initSetup(){
  if(!hasPw()){setupStep=1;document.getElementById('setup-screen').style.display='flex';}
  else{
    setupStep=2;
    document.getElementById('setup-sub').innerHTML='Enter your Owner password to open Glambo BMS.';
    document.getElementById('pw-lbl').textContent='Owner Password';
    document.getElementById('pw-c-wrap').style.display='none';
    document.getElementById('setup-btn').textContent='Sign In';
    document.getElementById('setup-screen').style.display='flex';
    setTimeout(()=>document.getElementById('pw-in').focus(),100);
  }
}
function setupGo(){
  const pw=document.getElementById('pw-in').value.trim();
  const err=document.getElementById('setup-err');
  err.textContent='';
  if(setupStep===1){
    const c=document.getElementById('pw-c').value.trim();
    if(pw.length<4){err.textContent='Password must be at least 4 characters.';return;}
    if(pw!==c){err.textContent='Passwords do not match.';return;}
    setPwH(pw);
    document.getElementById('setup-screen').style.display='none';
    initApp();
  } else {
    if(!checkPw(pw)){err.textContent='Wrong password. Try again.';document.getElementById('pw-in').value='';return;}
    document.getElementById('setup-screen').style.display='none';
    initApp();
  }
}
function toggleEye(id,btn){const el=document.getElementById(id);el.type=el.type==='password'?'text':'password';btn.textContent=el.type==='password'?'👁':'🙈';}

// ── ROLE ──
function switchRole(){
  if(currentRole==='owner'){
    currentRole='staff';
    const p=document.getElementById('role-pill');
    p.textContent='&#128119; Staff';p.className='role-staff';
    toast('Staff mode — unlock actions require Owner');
  } else {
    openUnlock('Switch to Owner','Enter Owner password.',()=>{
      currentRole='owner';
      const p=document.getElementById('role-pill');
      p.textContent='&#128100; Owner';p.className='role-owner';
      toast('Owner mode restored','ok');
    });
  }
}

// ── UNLOCK MODAL ──
function openUnlock(title,desc,cb){
  document.getElementById('unlock-title').textContent='🔑 '+title;
  document.getElementById('unlock-desc').textContent=desc;
  document.getElementById('unlock-pw').value='';
  document.getElementById('unlock-err').textContent='';
  unlockCb=cb;
  document.getElementById('unlock-modal').classList.add('open');
  setTimeout(()=>document.getElementById('unlock-pw').focus(),80);
}
function doUnlock(){
  const pw=document.getElementById('unlock-pw').value;
  if(!checkPw(pw)){document.getElementById('unlock-err').textContent='Incorrect password.';document.getElementById('unlock-pw').value='';return;}
  closeM('unlock-modal');
  if(unlockCb){unlockCb();unlockCb=null;}
}
function closeM(id){document.getElementById(id).classList.remove('open');}

// ── CHANGE PW ──
function openChangePw(){
  ['cp-cur','cp-new','cp-c2'].forEach(i=>document.getElementById(i).value='');
  document.getElementById('chpw-err').textContent='';
  document.getElementById('chpw-modal').classList.add('open');
}
function doChangePw(){
  const cur=document.getElementById('cp-cur').value;
  const nw=document.getElementById('cp-new').value;
  const c2=document.getElementById('cp-c2').value;
  const err=document.getElementById('chpw-err');
  err.textContent='';
  if(!checkPw(cur)){err.textContent='Current password is wrong.';return;}
  if(nw.length<4){err.textContent='New password must be at least 4 characters.';return;}
  if(nw!==c2){err.textContent='New passwords do not match.';return;}
  setPwH(nw);closeM('chpw-modal');toast('Password updated','ok');
}

// ── TOAST ──
function toast(msg,type=''){
  const t=document.getElementById('toast');
  t.textContent=msg;t.className='show'+(type?' '+type:'');
  setTimeout(()=>t.className='',2800);
}

// ── NAV ──
function goPage(id,btn){
  document.querySelectorAll('.pg').forEach(p=>p.classList.remove('on'));
  document.querySelectorAll('.nb').forEach(b=>b.classList.remove('on'));
  document.getElementById('pg-'+id).classList.add('on');
  if(btn)btn.classList.add('on');
  ({servicelog:renderSL,inventory:renderInv,expenses:renderExp,customers:renderCust,reports:renderRep}[id]||function(){})();
}

// ── SERVICE LOG ──
function slPreview(){
  const q=+document.getElementById('sl-qty').value||0;
  const p=+document.getElementById('sl-price').value||0;
  document.getElementById('sl-preview').textContent=kes(q*p);
}
function addService(){
  const d=document.getElementById('sl-date').value;
  const t=document.getElementById('sl-type').value;
  const desc=document.getElementById('sl-desc').value.trim();
  const qty=+document.getElementById('sl-qty').value||1;
  const price=+document.getElementById('sl-price').value||0;
  const cust=document.getElementById('sl-cust').value.trim()||'Walk-in';
  const pay=document.getElementById('sl-pay').value;
  const staff=document.getElementById('sl-staff').value;
  if(!d||!t||!price){toast('Date, Service Type and Price are required','err');return;}
  if(d<today()){toast('Cannot add entries to past dates','err');return;}
  const arr=load(K.svc);
  arr.push({id:genId(arr),date:d,type:t,desc,qty,price,total:qty*price,customer:cust,payment:pay,staff});
  save(K.svc,arr);
  ['sl-desc','sl-price','sl-cust'].forEach(i=>document.getElementById(i).value='');
  document.getElementById('sl-qty').value='1';
  document.getElementById('sl-preview').textContent='KES 0';
  toast('Entry saved','ok');renderSL();
}
const SVC_BC={'eCitizen Application':'b-blue','iTax Service':'b-purple','Printing':'b-teal','Photocopying':'b-gray','Graphic Design':'b-orange','Scanning':'b-green','Lamination':'b-green','Binding':'b-gray','SHA Registration':'b-blue','Business Registration':'b-orange','NTSA Application':'b-blue','Online Registration (Other)':'b-blue'};
function renderSL(){
  const arr=load(K.svc);
  const from=document.getElementById('sl-from')?.value||'';
  const to=document.getElementById('sl-to')?.value||'9999';
  const q=(document.getElementById('sl-q')?.value||'').toLowerCase();
  const t=today();
  const list=arr.filter(r=>{
    if(from&&r.date<from)return false;
    if(to&&r.date>to)return false;
    if(q&&!`${r.type}${r.desc}${r.customer}${r.staff}`.toLowerCase().includes(q))return false;
    return true;
  }).sort((a,b)=>b.date.localeCompare(a.date)||b.id-a.id);
  let total=0;
  const tbody=document.getElementById('sl-tbody');
  tbody.innerHTML=list.map(r=>{
    total+=r.total;
    const locked=isLocked(r.date);
    const bc=SVC_BC[r.type]||'b-gray';
    const action=locked
      ?`<button class="btn btn-unlock btn-sm" onclick="reqUnlock('svc',${r.id})">&#128273; Unlock</button>`
      :`<button class="btn btn-danger btn-sm" onclick="delSvc(${r.id})">Delete</button>`;
    return `<tr>
      <td><span style="font-family:'JetBrains Mono',monospace;font-size:12px">${fmtD(r.date)}</span>${locked?'<br><span class="badge b-locked">&#128274; locked</span>':''}</td>
      <td><span class="badge ${bc}" style="font-size:10px">${r.type}</span></td>
      <td>${r.desc||'—'}</td>
      <td style="text-align:center">${r.qty}</td>
      <td>${kes(r.price)}</td>
      <td class="fw7 c-green">${kes(r.total)}</td>
      <td>${r.customer}</td>
      <td><span class="badge b-gray" style="font-size:10px">${r.payment}</span></td>
      <td>${r.staff}</td>
      <td>${action}</td>
    </tr>`;
  }).join('')||`<tr><td colspan="10"><div class="empty"><div class="empty-icon">&#128203;</div>No entries found</div></td></tr>`;
  document.getElementById('sl-ftotal').textContent=kes(total);
  const custs=[...new Set(load(K.cus).map(c=>c.name))];
  document.getElementById('cust-dl').innerHTML=custs.map(c=>`<option value="${c}">`).join('');
}
function reqUnlock(mod,id){
  if(currentRole!=='owner'){toast('Only the Owner can unlock locked entries','err');return;}
  openUnlock('Unlock Locked Entry','Enter Owner password to delete this locked entry.',()=>{
    if(mod==='svc')delSvcForce(id);
    else if(mod==='exp')delExpForce(id);
  });
}
function delSvc(id){if(!confirm('Delete this entry?'))return;save(K.svc,load(K.svc).filter(r=>r.id!==id));renderSL();toast('Entry deleted');}
function delSvcForce(id){save(K.svc,load(K.svc).filter(r=>r.id!==id));renderSL();toast('Locked entry deleted after verification','ok');}

// ── INVENTORY ──
function addInv(){
  const name=document.getElementById('inv-name').value.trim();
  const cat=document.getElementById('inv-cat').value;
  const qty=+document.getElementById('inv-qty').value||0;
  const min=+document.getElementById('inv-min').value||0;
  const cost=+document.getElementById('inv-cost').value||0;
  const supp=document.getElementById('inv-supp').value.trim();
  if(!name||!cost){toast('Item name and unit cost required','err');return;}
  const arr=load(K.inv);
  const ex=arr.find(i=>i.name.toLowerCase()===name.toLowerCase());
  if(ex){ex.qty+=qty;ex.restocked=today();save(K.inv,arr);toast('Stock quantity updated','ok');}
  else{arr.push({id:genId(arr),name,cat,qty,min,cost,supp,restocked:today()});save(K.inv,arr);toast('Item added','ok');}
  ['inv-name','inv-qty','inv-min','inv-cost','inv-supp'].forEach(i=>document.getElementById(i).value='');
  renderInv();
}
function renderInv(){
  const arr=load(K.inv);
  let tv=0;
  const low=arr.filter(i=>i.qty<=i.min);
  document.getElementById('inv-alerts').innerHTML=low.length
    ?low.map(i=>`<div class="low-item"><div><strong style="color:var(--red)">${i.name}</strong><span class="text-muted"> — ${i.qty} left (min: ${i.min})</span></div><span class="badge b-red">Reorder Now</span></div>`).join('')
    :`<div class="alert a-success" style="margin-bottom:12px"><span>&#9989;</span><span>All stock levels are healthy.</span></div>`;
  document.getElementById('inv-tbody').innerHTML=arr.map(i=>{
    const val=i.qty*i.cost;tv+=val;const lo=i.qty<=i.min;
    return `<tr style="${lo?'background:#fff5f4':''}">
      <td class="fw7">${i.name}</td>
      <td><span class="badge b-gray" style="font-size:10px">${i.cat}</span></td>
      <td style="text-align:center;font-weight:700;color:${lo?'var(--red)':'var(--ink)'}">${i.qty}</td>
      <td style="text-align:center;color:var(--g4)">${i.min}</td>
      <td>${kes(i.cost)}</td><td class="fw7">${kes(val)}</td>
      <td>${i.supp||'—'}</td><td style="font-size:12px">${fmtD(i.restocked)}</td>
      <td>${lo?'<span class="badge b-red">&#128308; Reorder</span>':'<span class="badge b-green">&#9989; OK</span>'}</td>
      <td style="display:flex;gap:4px;flex-wrap:wrap">
        <button class="btn btn-ghost btn-sm" onclick="adjStock(${i.id})">&#177; Qty</button>
        <button class="btn btn-danger btn-sm" onclick="delInv(${i.id})">Del</button>
      </td>
    </tr>`;
  }).join('')||`<tr><td colspan="10"><div class="empty"><div class="empty-icon">&#128230;</div>No items yet</div></td></tr>`;
  document.getElementById('inv-tv').textContent=kes(tv);
}
function adjStock(id){
  const n=prompt('Quantity to ADD (e.g. 10) or REMOVE (e.g. -3):');
  if(n===null)return;const d=parseInt(n);if(isNaN(d)){toast('Invalid number','err');return;}
  const arr=load(K.inv);const item=arr.find(i=>i.id===id);if(!item)return;
  item.qty=Math.max(0,item.qty+d);item.restocked=today();save(K.inv,arr);renderInv();
  toast(`${d>=0?'Added':'Removed'} ${Math.abs(d)} units`,'ok');
}
function delInv(id){if(!confirm('Remove this item?'))return;save(K.inv,load(K.inv).filter(i=>i.id!==id));renderInv();toast('Item removed');}

// ── EXPENSES ──
function addExp(){
  const d=document.getElementById('exp-date').value;
  const cat=document.getElementById('exp-cat').value;
  const desc=document.getElementById('exp-desc').value.trim();
  const amt=+document.getElementById('exp-amt').value||0;
  const pay=document.getElementById('exp-pay').value;
  const ref=document.getElementById('exp-ref').value.trim();
  if(!d||!amt){toast('Date and amount required','err');return;}
  const arr=load(K.exp);
  arr.push({id:genId(arr),date:d,cat,desc,amt,payment:pay,ref});
  save(K.exp,arr);
  ['exp-desc','exp-amt','exp-ref'].forEach(i=>document.getElementById(i).value='');
  toast('Expense saved','ok');renderExp();
}
const EXP_BC={'Rent':'b-red','Internet':'b-blue','Electricity':'b-orange','Staff Salaries':'b-purple','Supplies':'b-teal','Equipment Maintenance':'b-gray','Marketing':'b-orange','Transport':'b-gray','Miscellaneous':'b-gray'};
function renderExp(){
  const arr=load(K.exp);
  const from=document.getElementById('exp-from')?.value||'';
  const to=document.getElementById('exp-to')?.value||'9999';
  const list=arr.filter(e=>(!from||e.date>=from)&&e.date<=to).sort((a,b)=>b.date.localeCompare(a.date)||b.id-a.id);
  let total=0;
  document.getElementById('exp-tbody').innerHTML=list.map(e=>{
    total+=e.amt;const locked=isLocked(e.date);
    const bc=EXP_BC[e.cat]||'b-gray';
    const action=locked
      ?`<button class="btn btn-unlock btn-sm" onclick="reqUnlock('exp',${e.id})">&#128273; Unlock</button>`
      :`<button class="btn btn-danger btn-sm" onclick="delExpToday(${e.id})">Delete</button>`;
    return `<tr>
      <td><span style="font-family:'JetBrains Mono',monospace;font-size:12px">${fmtD(e.date)}</span>${locked?'<br><span class="badge b-locked">&#128274;</span>':''}</td>
      <td><span class="badge ${bc}" style="font-size:10px">${e.cat}</span></td>
      <td>${e.desc||'—'}</td>
      <td class="fw7 c-red">${kes(e.amt)}</td>
      <td>${e.payment}</td><td class="text-muted">${e.ref||'—'}</td>
      <td>${action}</td>
    </tr>`;
  }).join('')||`<tr><td colspan="7"><div class="empty"><div class="empty-icon">&#128184;</div>No expenses found</div></td></tr>`;
  document.getElementById('exp-total').textContent=kes(total);
}
function delExpToday(id){if(!confirm('Delete?'))return;save(K.exp,load(K.exp).filter(e=>e.id!==id));renderExp();toast('Expense deleted');}
function delExpForce(id){save(K.exp,load(K.exp).filter(e=>e.id!==id));renderExp();toast('Locked expense deleted after verification','ok');}

// ── CUSTOMERS ──
function addCust(){
  const name=document.getElementById('cu-name').value.trim();
  const phone=document.getElementById('cu-phone').value.trim();
  const email=document.getElementById('cu-email').value.trim();
  const type=document.getElementById('cu-type').value;
  const status=document.getElementById('cu-status').value;
  const notes=document.getElementById('cu-notes').value.trim();
  if(!name){toast('Name is required','err');return;}
  const arr=load(K.cus);
  arr.push({id:'C'+String(arr.length+1).padStart(3,'0'),name,phone,email,type,status,notes});
  save(K.cus,arr);
  ['cu-name','cu-phone','cu-email','cu-notes'].forEach(i=>document.getElementById(i).value='');
  toast('Customer added','ok');renderCust();
}
function renderCust(){
  const arr=load(K.cus);const svcs=load(K.svc);
  const q=(document.getElementById('cu-q')?.value||'').toLowerCase();
  const SC={'Regular':'b-green','New':'b-orange','VIP':'b-blue'};
  const TC={'Individual':'b-gray','Business':'b-teal','Institution':'b-purple'};
  const list=arr.filter(c=>!q||`${c.name}${c.phone}${c.type}`.toLowerCase().includes(q));
  document.getElementById('cu-tbody').innerHTML=list.map(c=>{
    const spent=svcs.filter(s=>s.customer===c.name).reduce((a,b)=>a+b.total,0);
    const visits=svcs.filter(s=>s.customer===c.name).length;
    return `<tr>
      <td style="font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--g4)">${c.id}</td>
      <td class="fw7">${c.name}</td><td>${c.phone||'—'}</td>
      <td style="font-size:12px;color:var(--blue)">${c.email||'—'}</td>
      <td><span class="badge ${TC[c.type]||'b-gray'}" style="font-size:10px">${c.type}</span></td>
      <td><span class="badge ${SC[c.status]||'b-gray'}" style="font-size:10px">${c.status}</span></td>
      <td class="fw7 c-green">${kes(spent)}</td>
      <td style="text-align:center">${visits}</td>
      <td><button class="btn btn-danger btn-sm" onclick="delCust('${c.id}')">Del</button></td>
    </tr>`;
  }).join('')||`<tr><td colspan="9"><div class="empty"><div class="empty-icon">&#128101;</div>No customers yet</div></td></tr>`;
}
function delCust(id){if(!confirm('Remove customer?'))return;save(K.cus,load(K.cus).filter(c=>c.id!==id));renderCust();toast('Customer removed');}

// ── REPORTS ──
function setRange(r){
  const t=today();let from=t,to=t;
  if(r==='month'){from=t.slice(0,7)+'-01';}
  else if(r==='week'){const d=new Date();d.setDate(d.getDate()-((d.getDay()+6)%7));from=d.toISOString().split('T')[0];}
  else if(r==='yesterday'){const d=new Date(Date.now()-86400000);from=to=d.toISOString().split('T')[0];}
  document.getElementById('rp-from').value=from;
  document.getElementById('rp-to').value=to;
  renderRep();
}
function renderRep(){
  const svcs=load(K.svc);const exps=load(K.exp);
  const from=document.getElementById('rp-from')?.value||'';
  const to=document.getElementById('rp-to')?.value||today();
  const fs=svcs.filter(s=>(!from||s.date>=from)&&s.date<=to);
  const fe=exps.filter(e=>(!from||e.date>=from)&&e.date<=to);
  const rev=fs.reduce((a,b)=>a+b.total,0);
  const exp=fe.reduce((a,b)=>a+b.amt,0);
  const prof=rev-exp;
  const margin=rev?Math.round(prof/rev*100):0;
  document.getElementById('rp-kpis').innerHTML=[
    {l:'Total Revenue',v:kes(rev),c:'blue',n:fs.length+' entries'},
    {l:'Total Expenses',v:kes(exp),c:'red',n:fe.length+' entries'},
    {l:'Net Profit',v:kes(prof),c:prof>=0?'green':'red',n:prof>=0?'Profitable':'Loss'},
    {l:'Profit Margin',v:margin+'%',c:margin>20?'green':margin>0?'teal':'red',n:'Net / Revenue'},
    {l:"Today's Revenue",v:kes(svcs.filter(s=>s.date===today()).reduce((a,b)=>a+b.total,0)),c:'orange',n:'Live'},
    {l:'Avg per Job',v:fs.length?kes(Math.round(rev/fs.length)):'KES 0',c:'purple',n:'Revenue / jobs'},
  ].map(k=>`<div class="kpi ${k.c}"><div class="kpi-lbl">${k.l}</div><div class="kpi-val">${k.v}</div><div class="kpi-note">${k.n}</div></div>`).join('');
  // Service chart
  const sT=[...new Set(fs.map(s=>s.type))].map(t=>({n:t,v:fs.filter(s=>s.type===t).reduce((a,b)=>a+b.total,0)})).sort((a,b)=>b.v-a.v);
  const mS=Math.max(...sT.map(x=>x.v),1);
  const cc=['#1560BD','#E85C00','#1A7A45','#5A2D9C','#0A7E82','#C0301E','#D4940A'];
  document.getElementById('rp-svc').innerHTML=sT.length
    ?sT.map((s,i)=>`<div class="cb-row"><div class="cb-lbl">${s.n.replace(' Application','').replace(' Service','')}</div><div class="cb-track"><div class="cb-fill" style="width:${Math.round(s.v/mS*100)}%;background:${cc[i%cc.length]}">${kes(s.v)}</div></div></div>`).join('')
    :'<div class="empty">No data for this period</div>';
  // Expense chart
  const eT=[...new Set(fe.map(e=>e.cat))].map(c=>({n:c,v:fe.filter(e=>e.cat===c).reduce((a,b)=>a+b.amt,0)})).sort((a,b)=>b.v-a.v);
  const mE=Math.max(...eT.map(x=>x.v),1);
  const ec=['#C0301E','#5A2D9C','#0A7E82','#D4940A','#1A7A45','#1560BD','#E85C00'];
  document.getElementById('rp-exp').innerHTML=eT.length
    ?eT.map((e,i)=>`<div class="cb-row"><div class="cb-lbl">${e.n}</div><div class="cb-track"><div class="cb-fill" style="width:${Math.round(e.v/mE*100)}%;background:${ec[i%ec.length]}">${kes(e.v)}</div></div></div>`).join('')
    :'<div class="empty">No data for this period</div>';
  // Daily 7-day
  const days=Array.from({length:7},(_,i)=>{const d=new Date();d.setDate(d.getDate()-6+i);return d.toISOString().split('T')[0];});
  const dT=days.map(d=>({d,v:svcs.filter(s=>s.date===d).reduce((a,b)=>a+b.total,0)}));
  const mD=Math.max(...dT.map(x=>x.v),1);
  document.getElementById('rp-daily').innerHTML=dT.map(d=>`
    <div class="cb-row">
      <div class="cb-lbl" style="font-family:'JetBrains Mono',monospace;font-size:11px">${fmtD(d.d)}</div>
      <div class="cb-track"><div class="cb-fill" style="width:${d.v?Math.max(Math.round(d.v/mD*100),3):0}%;background:${d.d===today()?'var(--orange)':'var(--blue)'}">${d.v?kes(d.v):''}</div></div>
    </div>`).join('');
  // Profit summary
  document.getElementById('rp-profit').innerHTML=`
    <div style="display:flex;flex-direction:column;gap:9px">
      <div style="display:flex;justify-content:space-between;padding:12px 14px;border-radius:var(--r8);background:var(--blue-lt);border-left:3px solid var(--blue)">
        <span style="color:var(--blue-d);font-weight:600">Revenue</span><span class="fw7" style="color:var(--blue-d)">${kes(rev)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;padding:12px 14px;border-radius:var(--r8);background:var(--red-lt);border-left:3px solid var(--red)">
        <span style="color:var(--red);font-weight:600">Expenses</span><span class="fw7" style="color:var(--red)">&#8722; ${kes(exp)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;padding:13px 14px;border-radius:var(--r8);background:${prof>=0?'var(--green-lt)':'var(--red-lt)'};border-left:3px solid ${prof>=0?'var(--green)':'var(--red)'}">
        <span style="font-weight:700;color:${prof>=0?'var(--green)':'var(--red)'}">Net Profit</span>
        <span style="font-size:18px;font-weight:800;color:${prof>=0?'var(--green)':'var(--red)'}">${kes(prof)}</span>
      </div>
      <div style="text-align:center;color:var(--g4);font-size:12px;padding-top:4px">Margin <strong>${margin}%</strong> &nbsp;&#183;&nbsp; ${from||'All time'} &#8594; ${to}</div>
    </div>`;
}
function reams (){
  if(load(K.svc).length)return;
  const t=today();
  const d=n=>{const dt=new Date(Date.now()-n*86400000);return dt.toISOString().split('T')[0];};
  save(K.svc,[
 ]);
}

// ── EXCEL EXPORTS ──
function xlsxDownload(wb, filename){
  XLSX.writeFile(wb, filename);
}
function fmtNum(n){ return Number(n||0); }

function exportSL(){
  const arr=load(K.svc);
  const from=document.getElementById('sl-from')?.value||'';
  const to=document.getElementById('sl-to')?.value||'9999';
  const q=(document.getElementById('sl-q')?.value||'').toLowerCase();
  const list=arr.filter(r=>{
    if(from&&r.date<from)return false;
    if(to&&r.date>to)return false;
    if(q&&!`${r.type}${r.desc}${r.customer}${r.staff}`.toLowerCase().includes(q))return false;
    return true;
  }).sort((a,b)=>b.date.localeCompare(a.date)||b.id-a.id);
  const rows=list.map(r=>({
    'Date':fmtD(r.date),'Service Type':r.type,'Description':r.desc||'',
    'Qty':fmtNum(r.qty),'Unit Price (KES)':fmtNum(r.price),'Total (KES)':fmtNum(r.total),
    'Customer':r.customer,'Payment':r.payment,'Staff':r.staff
  }));
  const total=list.reduce((a,b)=>a+b.total,0);
  rows.push({'Date':'','Service Type':'','Description':'','Qty':'','Unit Price (KES)':'','Total (KES)':fmtNum(total),'Customer':'TOTAL','Payment':'','Staff':''});
  const ws=XLSX.utils.json_to_sheet(rows);
  ws['!cols']=[{wch:12},{wch:24},{wch:22},{wch:6},{wch:14},{wch:14},{wch:18},{wch:14},{wch:14}];
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'Service Log');
  xlsxDownload(wb,'Glambo_ServiceLog_'+today()+'.xlsx');
  toast('Service Log exported','ok');
}

function exportInv(){
  const arr=load(K.inv);
  const rows=arr.map(i=>({
    'Item Name':i.name,'Category':i.cat,'Qty in Stock':fmtNum(i.qty),
    'Min Stock Level':fmtNum(i.min),'Unit Cost (KES)':fmtNum(i.cost),
    'Stock Value (KES)':fmtNum(i.qty*i.cost),'Supplier':i.supp||'',
    'Last Restocked':fmtD(i.restocked),'Status':i.qty<=i.min?'⚠ Reorder':'✓ OK'
  }));
  const tv=arr.reduce((a,b)=>a+(b.qty*b.cost),0);
  rows.push({'Item Name':'TOTAL STOCK VALUE','Category':'','Qty in Stock':'','Min Stock Level':'','Unit Cost (KES)':'','Stock Value (KES)':fmtNum(tv),'Supplier':'','Last Restocked':'','Status':''});
  const ws=XLSX.utils.json_to_sheet(rows);
  ws['!cols']=[{wch:22},{wch:18},{wch:12},{wch:14},{wch:14},{wch:16},{wch:18},{wch:14},{wch:10}];
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'Inventory');
  xlsxDownload(wb,'Glambo_Inventory_'+today()+'.xlsx');
  toast('Inventory exported','ok');
}

function exportExp(){
  const arr=load(K.exp);
  const from=document.getElementById('exp-from')?.value||'';
  const to=document.getElementById('exp-to')?.value||'9999';
  const list=arr.filter(e=>(!from||e.date>=from)&&e.date<=to).sort((a,b)=>b.date.localeCompare(a.date)||b.id-a.id);
  const rows=list.map(e=>({
    'Date':fmtD(e.date),'Category':e.cat,'Description':e.desc||'',
    'Amount (KES)':fmtNum(e.amt),'Payment Method':e.payment,'Reference':e.ref||''
  }));
  const total=list.reduce((a,b)=>a+b.amt,0);
  rows.push({'Date':'','Category':'TOTAL','Description':'','Amount (KES)':fmtNum(total),'Payment Method':'','Reference':''});
  const ws=XLSX.utils.json_to_sheet(rows);
  ws['!cols']=[{wch:12},{wch:22},{wch:24},{wch:14},{wch:16},{wch:16}];
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'Expenses');
  xlsxDownload(wb,'Glambo_Expenses_'+today()+'.xlsx');
  toast('Expenses exported','ok');
}

function exportCust(){
  const arr=load(K.cus);const svcs=load(K.svc);
  const rows=arr.map(c=>{
    const spent=svcs.filter(s=>s.customer===c.name).reduce((a,b)=>a+b.total,0);
    const visits=svcs.filter(s=>s.customer===c.name).length;
    return {'ID':c.id,'Name / Business':c.name,'Phone':c.phone||'','Email':c.email||'',
      'Type':c.type,'Status':c.status,'Total Spent (KES)':fmtNum(spent),'Visits':fmtNum(visits),'Notes':c.notes||''};
  });
  const ws=XLSX.utils.json_to_sheet(rows);
  ws['!cols']=[{wch:8},{wch:22},{wch:14},{wch:24},{wch:12},{wch:10},{wch:16},{wch:8},{wch:24}];
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'Customers');
  xlsxDownload(wb,'Glambo_Customers_'+today()+'.xlsx');
  toast('Customers exported','ok');
}

function exportRep(){
  const svcs=load(K.svc);const exps=load(K.exp);
  const from=document.getElementById('rp-from')?.value||'';
  const to=document.getElementById('rp-to')?.value||today();
  const fs=svcs.filter(s=>(!from||s.date>=from)&&s.date<=to);
  const fe=exps.filter(e=>(!from||e.date>=from)&&e.date<=to);
  const rev=fs.reduce((a,b)=>a+b.total,0);
  const exp=fe.reduce((a,b)=>a+b.amt,0);
  const prof=rev-exp;
  const margin=rev?Math.round(prof/rev*100):0;
  const wb=XLSX.utils.book_new();
  // Sheet 1: Summary
  const sumRows=[
    {'Metric':'Date Range','Value':(from||'All time')+' → '+to},
    {'Metric':'Total Revenue (KES)','Value':fmtNum(rev)},
    {'Metric':'Total Expenses (KES)','Value':fmtNum(exp)},
    {'Metric':'Net Profit (KES)','Value':fmtNum(prof)},
    {'Metric':'Profit Margin (%)','Value':margin},
    {'Metric':'Total Service Entries','Value':fmtNum(fs.length)},
    {'Metric':'Avg Revenue per Job (KES)','Value':fs.length?fmtNum(Math.round(rev/fs.length)):0},
  ];
  const wsSummary=XLSX.utils.json_to_sheet(sumRows);
  wsSummary['!cols']=[{wch:28},{wch:20}];
  XLSX.utils.book_append_sheet(wb,wsSummary,'Summary');
  // Sheet 2: Service entries
  const svcRows=fs.sort((a,b)=>b.date.localeCompare(a.date)).map(r=>({
    'Date':fmtD(r.date),'Service Type':r.type,'Description':r.desc||'',
    'Qty':fmtNum(r.qty),'Unit Price (KES)':fmtNum(r.price),'Total (KES)':fmtNum(r.total),
    'Customer':r.customer,'Payment':r.payment,'Staff':r.staff
  }));
  if(svcRows.length){
    const wsSvc=XLSX.utils.json_to_sheet(svcRows);
    wsSvc['!cols']=[{wch:12},{wch:24},{wch:22},{wch:6},{wch:14},{wch:14},{wch:18},{wch:14},{wch:14}];
    XLSX.utils.book_append_sheet(wb,wsSvc,'Services');
  }
  // Sheet 3: Expenses
  const expRows=fe.sort((a,b)=>b.date.localeCompare(a.date)).map(e=>({
    'Date':fmtD(e.date),'Category':e.cat,'Description':e.desc||'',
    'Amount (KES)':fmtNum(e.amt),'Payment Method':e.payment,'Reference':e.ref||''
  }));
  if(expRows.length){
    const wsExp=XLSX.utils.json_to_sheet(expRows);
    wsExp['!cols']=[{wch:12},{wch:22},{wch:24},{wch:14},{wch:16},{wch:16}];
    XLSX.utils.book_append_sheet(wb,wsExp,'Expenses');
  }
  // Sheet 4: Revenue by service type
  const sT=[...new Set(fs.map(s=>s.type))].map(t=>({'Service Type':t,'Total Revenue (KES)':fmtNum(fs.filter(s=>s.type===t).reduce((a,b)=>a+b.total,0)),'Job Count':fmtNum(fs.filter(s=>s.type===t).length)})).sort((a,b)=>b['Total Revenue (KES)']-a['Total Revenue (KES)']);
  if(sT.length){
    const wsST=XLSX.utils.json_to_sheet(sT);
    wsST['!cols']=[{wch:28},{wch:18},{wch:10}];
    XLSX.utils.book_append_sheet(wb,wsST,'Revenue by Service');
  }
  xlsxDownload(wb,'Glambo_Report_'+from+'_to_'+to+'.xlsx');
  toast('Report exported (4 sheets)','ok');
}

function initApp(){
  reams();
  const t=today();const m1=t.slice(0,7)+'-01';
  document.getElementById('top-date').textContent=new Date().toLocaleDateString('en-KE',{weekday:'short',day:'numeric',month:'short',year:'numeric'});
  [['sl-date',t],['exp-date',t],['sl-from',m1],['sl-to',t],['exp-from',m1],['exp-to',t],['rp-from',m1],['rp-to',t]]
    .forEach(([id,v])=>{const el=document.getElementById(id);if(el)el.value=v;});
  renderSL();
}
initSetup();


