let currentUser=null,settings={},allClients=[],allInvoices=[],allQuotes=[],allPayments=[],editInvRows=[],editQuoteRows=[],_editInvId=null;

async function api(method,url,body){const o={method,headers:{'Content-Type':'application/json'}};if(body!==undefined)o.body=JSON.stringify(body);const r=await fetch(url,o);return r.json();}

function toast(msg,type=''){const t=document.getElementById('toast');t.textContent=msg;t.className='toast show '+type;clearTimeout(t._t);t._t=setTimeout(()=>t.className='toast hidden',3000);}
function openModal(id){document.getElementById(id).classList.remove('hidden');}
function closeModal(id){document.getElementById(id).classList.add('hidden');}

function fmt(n,cur){const c=cur||settings.invoice_currency||'KWD';return c+' '+Number(n||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});}
function fmtDate(d){if(!d)return'—';const clean=d.split('T')[0];const p=clean.split('-');return p.length===3?p[2]+'/'+p[1]+'/'+p[0]:d;}
function today(){return new Date().toISOString().split('T')[0];}
function addDays(d,n){const dt=new Date(d);dt.setDate(dt.getDate()+n);return dt.toISOString().split('T')[0];}
function initials(n){return(n||'').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();}
function statusBadge(s){const cls={paid:'badge-paid',pending:'badge-pending',overdue:'badge-overdue',draft:'badge-draft',sent:'badge-sent',accepted:'badge-accepted',refused:'badge-refused',refunded:'badge-refunded'};const lbl={paid:'Paid',pending:'Pending',overdue:'Overdue',draft:'Draft',sent:'Sent',accepted:'Accepted',refused:'Refused',refunded:'Refunded'};return`<span class="badge ${cls[s]||'badge-draft'}">${lbl[s]||s}</span>`;}
function tagBadge(t){const cls={VIP:'badge-vip',New:'badge-new',Regular:'badge-regular'};return`<span class="badge ${cls[t]||'badge-draft'}">${t||'New'}</span>`;}

/* AUTH */
async function init(){const{user}=await api('GET','/api/me');settings=await api('GET','/api/settings').catch(()=>({}));if(user){currentUser=user;showApp();showPage('dashboard');}else{document.getElementById('login-screen').style.display='flex';}}
document.getElementById('btn-login').addEventListener('click',doLogin);
['login-user','login-pass'].forEach(id=>document.getElementById(id).addEventListener('keydown',e=>{if(e.key==='Enter')doLogin();}));
async function doLogin(){const btn=document.getElementById('btn-login');const err=document.getElementById('login-error');btn.textContent='…';btn.disabled=true;const data=await api('POST','/api/login',{username:document.getElementById('login-user').value.trim(),password:document.getElementById('login-pass').value});btn.textContent='Sign In';btn.disabled=false;if(data.success){currentUser=data.user;err.style.display='none';settings=await api('GET','/api/settings').catch(()=>({}));showApp();showPage('dashboard');}else{err.textContent=data.error||'Invalid credentials';err.style.display='block';}}
document.getElementById('btn-logout').addEventListener('click',async()=>{await api('POST','/api/logout');currentUser=null;document.getElementById('app-screen').classList.add('hidden');document.getElementById('login-screen').style.display='flex';document.getElementById('login-pass').value='';});
function showApp(){document.getElementById('login-screen').style.display='none';document.getElementById('app-screen').classList.remove('hidden');document.getElementById('user-avatar').textContent=initials(currentUser.display_name);document.getElementById('user-name-display').textContent=currentUser.display_name;document.getElementById('user-role-display').textContent=currentUser.role==='patron'?'Administrator':'Staff';}

/* NAV */
document.querySelectorAll('.nav-item[data-page]').forEach(item=>item.addEventListener('click',()=>showPage(item.dataset.page)));
function showPage(page){document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));const nav=document.querySelector(`.nav-item[data-page="${page}"]`);if(nav)nav.classList.add('active');const mc=document.getElementById('main-content');mc.innerHTML='<div class="loading-page"><i class="ti ti-loader spin"></i> Loading…</div>';const pages={dashboard:pageDashboard,clients:pageClients,invoices:pageInvoices,'new-invoice':pageNewInvoice,tickets:pageTickets,'new-ticket':pageNewTicket,payments:pagePayments,statements:pageStatements,reports:pageReports,settings:pageSettings};if(pages[page])pages[page](mc);}

/* DASHBOARD */
async function pageDashboard(mc){const[invData,rpt]=await Promise.all([api('GET','/api/invoices'),api('GET','/api/reports/summary')]);allInvoices=invData;const out=allInvoices.filter(i=>i.status!=='paid'&&i.status!=='draft');mc.innerHTML=`
<div class="page-header"><div><div class="page-title">Dashboard</div><div class="page-sub">${new Date().toLocaleDateString('en-US',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</div></div><div class="header-actions"><button class="btn-new" onclick="showPage('new-invoice')"><i class="ti ti-plus"></i> New Invoice</button></div></div>
<div class="stats-grid">
  <div class="stat-card"><div class="stat-icon" style="background:#e6f9ee"><i class="ti ti-cash" style="color:#1a7a3a"></i></div><div class="stat-label">Collected</div><div class="stat-value" style="color:#1a7a3a">${fmt(rpt.paid)}</div><div class="stat-detail">${allInvoices.filter(i=>i.status==='paid').length} invoice(s)</div></div>
  <div class="stat-card"><div class="stat-icon" style="background:#fff4e0"><i class="ti ti-clock" style="color:#a05c00"></i></div><div class="stat-label">Pending</div><div class="stat-value" style="color:#a05c00">${fmt(rpt.pending)}</div><div class="stat-detail">${allInvoices.filter(i=>i.status==='pending').length} invoice(s)</div></div>
  <div class="stat-card"><div class="stat-icon" style="background:#fdecea"><i class="ti ti-alert-triangle" style="color:#b71c1c"></i></div><div class="stat-label">Overdue</div><div class="stat-value" style="color:#b71c1c">${fmt(rpt.overdue)}</div><div class="stat-detail">${allInvoices.filter(i=>i.status==='overdue').length} invoice(s)</div></div>
  <div class="stat-card"><div class="stat-icon" style="background:#deeeff"><i class="ti ti-users" style="color:#0a3258"></i></div><div class="stat-label">Clients</div><div class="stat-value">${rpt.clientCount}</div></div>
  <div class="stat-card"><div class="stat-icon" style="background:#f0e8ff"><i class="ti ti-file-invoice" style="color:#5b21b6"></i></div><div class="stat-label">Total Invoices</div><div class="stat-value">${rpt.invoiceCount}</div></div>
</div>
<div style="margin-bottom:1.1rem"><div style="font-size:11px;color:#aaa;font-weight:700;text-transform:uppercase;letter-spacing:.06em;margin-bottom:10px">Quick Actions</div>
<div class="quick-grid">
  <div class="quick-action" onclick="showPage('new-invoice')"><i class="ti ti-file-plus"></i><span>New Invoice</span></div>
  <div class="quick-action" onclick="showPage('new-ticket')"><i class="ti ti-ticket"></i><span>New Ticket</span></div>
  <div class="quick-action" onclick="openClientModal()"><i class="ti ti-user-plus"></i><span>New Client</span></div>
  <div class="quick-action" onclick="showPage('reports')"><i class="ti ti-chart-bar"></i><span>Reports</span></div>
  <div class="quick-action" onclick="openPdfImport()"><i class="ti ti-file-import"></i><span>Import PDF</span></div>
</div></div>
<div class="card"><div class="card-header"><span class="card-title"><i class="ti ti-clock" style="vertical-align:-2px;margin-right:6px;color:#a05c00"></i>Outstanding Invoices</span><button class="btn-secondary" onclick="showPage('invoices')" style="font-size:12px;padding:5px 10px">View all</button></div>
<div class="table-wrap"><table><thead><tr><th>#</th><th>Client</th><th>Date</th><th>Due</th><th>Total</th><th>Status</th><th>Actions</th></tr></thead><tbody>
${out.length===0?`<tr><td colspan="7"><div class="empty-state"><i class="ti ti-mood-happy"></i><h3>No outstanding invoices</h3></div></td></tr>`:out.map(i=>`<tr><td style="font-weight:700;cursor:pointer;color:#1A6FB5" onclick="viewInvoice(${i.id})">${i.num}</td><td>${i.client_name}</td><td>${fmtDate(i.date)}</td><td>${fmtDate(i.due_date)}</td><td style="font-weight:700">${fmt(i.total,i.currency)}</td><td>${statusBadge(i.status)}</td><td></td></tr>`).join('')}
</tbody></table></div></div>`;}

/* CLIENTS */
async function pageClients(mc){allClients=await api('GET','/api/clients');renderClientsPage(mc,allClients);}
function renderClientsPage(mc,list){mc.innerHTML=`
<div class="page-header"><div><div class="page-title">Clients</div><div class="page-sub">${list.length} client(s)</div></div><button class="btn-new" onclick="openClientModal()"><i class="ti ti-plus"></i> New Client</button></div>
<div class="filter-bar"><input type="text" placeholder="Search…" oninput="filterClients(this.value)" style="min-width:200px"/><select onchange="filterClients(document.querySelector('.filter-bar input').value,this.value)"><option value="">All</option><option>VIP</option><option>Regular</option><option>New</option></select></div>
<div class="clients-grid" id="clients-grid">${list.length===0?`<div class="empty-state" style="grid-column:1/-1"><i class="ti ti-users"></i><h3>No clients</h3></div>`:list.map(clientCard).join('')}</div>`;}
function clientCard(c){return`<div class="client-card"><div style="display:flex;align-items:center;gap:10px;margin-bottom:.75rem"><div class="client-avatar">${initials(c.name)}</div><div><div class="client-name">${c.name}</div><div style="margin-top:3px">${tagBadge(c.tag)}</div></div></div>${c.email?`<div class="client-meta"><i class="ti ti-mail"></i>${c.email}</div>`:''} ${c.phone?`<div class="client-meta"><i class="ti ti-phone"></i>${c.phone}</div>`:''} ${c.city?`<div class="client-meta"><i class="ti ti-map-pin"></i>${c.city}</div>`:''}<div class="client-actions"><button class="action-btn danger" onclick="deleteClient(${c.id})"><i class="ti ti-trash"></i></button></div></div>`;}
function filterClients(q,tag){const f=allClients.filter(c=>(!q||c.name.toLowerCase().includes(q.toLowerCase())||(c.email||'').toLowerCase().includes(q.toLowerCase()))&&(!tag||c.tag===tag));const g=document.getElementById('clients-grid');if(g)g.innerHTML=f.length?f.map(clientCard).join(''):`<div class="empty-state"><i class="ti ti-search"></i><h3>No results</h3></div>`;}
function openClientModal(id){const c=id?allClients.find(x=>x.id===id):null;document.getElementById('modal-client-title').textContent=c?'Edit Client':'New Client';document.getElementById('edit-client-id').value=c?c.id:'';['c-name','c-email','c-phone','c-fax','c-address','c-city','c-notes'].forEach(k=>{const f=k.replace('c-','');document.getElementById(k).value=c?c[f.replace('-','_')]||'':''});document.getElementById('c-tag').value=c?c.tag||'New':'New';openModal('modal-client');}
document.getElementById('btn-save-client').addEventListener('click',async()=>{const name=document.getElementById('c-name').value.trim();if(!name){toast('Name is required','error');return;}const id=document.getElementById('edit-client-id').value;const body={name,email:document.getElementById('c-email').value.trim(),phone:document.getElementById('c-phone').value.trim(),fax:document.getElementById('c-fax').value.trim(),address:document.getElementById('c-address').value.trim(),city:document.getElementById('c-city').value.trim(),tag:document.getElementById('c-tag').value,notes:document.getElementById('c-notes').value.trim()};if(id)await api('PUT',`/api/clients/${id}`,body);else await api('POST','/api/clients',body);toast(id?'✅ Client updated':'✅ Client added','success');closeModal('modal-client');showPage('clients');});
async function deleteClient(id){if(!confirm('Delete this client?'))return;await api('DELETE',`/api/clients/${id}`);toast('Client deleted');showPage('clients');}

/* INVOICES LIST */
async function pageInvoices(mc){allInvoices=await api('GET','/api/invoices');mc.innerHTML=`
<div class="page-header"><div><div class="page-title">Invoices</div><div class="page-sub">${allInvoices.length} invoice(s)${currentUser.role==='employe'?' — your invoices only':''}</div></div><div class="header-actions"><button class="btn-new" onclick="showPage('new-invoice')"><i class="ti ti-plus"></i> New Invoice</button><button class="btn-secondary" onclick="openPdfImport()"><i class="ti ti-file-import"></i> Import PDF</button></div></div>
${currentUser.role==='employe'?`<div class="info-box"><i class="ti ti-info-circle"></i> You can only see your own invoices.</div>`:''}
<div class="filter-bar"><input type="text" placeholder="Client, number…" id="inv-q" oninput="filterInv()"/><select id="inv-s" onchange="filterInv()"><option value="">All statuses</option><option value="draft">Draft</option><option value="pending">Pending</option><option value="paid">Paid</option><option value="overdue">Overdue</option></select><input type="date" id="inv-from" onchange="filterInv()"/><input type="date" id="inv-to" onchange="filterInv()"/></div>
<div class="card" style="padding:0;overflow:hidden"><div class="table-wrap"><table><thead><tr><th>#</th><th>Client</th><th>Date</th><th>Due</th><th>Total</th><th>Status</th><th>Created by</th><th>Actions</th></tr></thead><tbody id="inv-tbody">${invRowsHtml(allInvoices)}</tbody></table></div></div>`;}
function invRowsHtml(list){if(!list.length)return`<tr><td colspan="8"><div class="empty-state"><i class="ti ti-file-off"></i><h3>No invoices</h3></div></td></tr>`;return list.map(i=>`<tr><td style="font-weight:700;cursor:pointer;color:#1A6FB5" onclick="viewInvoice(${i.id})">${i.num}</td><td>${i.client_name}</td><td>${fmtDate(i.date)}</td><td>${fmtDate(i.due_date)}</td><td style="font-weight:700">${fmt(i.total,i.currency)}</td><td>${statusBadge(i.status)}</td><td style="color:#aaa;font-size:12px">${i.owner_name||'—'}</td><td class="actions-cell"><button class="action-btn danger" onclick="deleteInvoice(${i.id})"><i class="ti ti-trash"></i> Delete</button></td></tr>`).join('');}
function filterInv(){const q=document.getElementById('inv-q')?.value||'';const s=document.getElementById('inv-s')?.value||'';const from=document.getElementById('inv-from')?.value||'';const to=document.getElementById('inv-to')?.value||'';const f=allInvoices.filter(i=>(!q||i.num.toLowerCase().includes(q.toLowerCase())||i.client_name.toLowerCase().includes(q.toLowerCase()))&&(!s||i.status===s)&&(!from||i.date>=from)&&(!to||i.date<=to));const tb=document.getElementById('inv-tbody');if(tb)tb.innerHTML=invRowsHtml(f);}

/* MODAL PAYMENT */
let _payInvId=null;
async function openPayModal(id){_payInvId=id;const inv=await api('GET',`/api/invoices/${id}`);document.getElementById('pay-inv-num').textContent=inv.num;document.getElementById('pay-inv-client').textContent=inv.client_name;document.getElementById('pay-inv-amount').textContent=fmt(inv.total,inv.currency);document.getElementById('pay-method').value='Cash';document.getElementById('pay-reference').value='';document.getElementById('pay-notes').value='';openModal('modal-payment');}
document.getElementById('btn-confirm-pay').addEventListener('click',async()=>{if(!_payInvId)return;const method=document.getElementById('pay-method').value;const reference=document.getElementById('pay-reference').value.trim();const notes=document.getElementById('pay-notes').value.trim();await api('PATCH',`/api/invoices/${_payInvId}/status`,{status:'paid',method,reference,notes});closeModal('modal-payment');toast('✅ Payment recorded','success');const active=document.querySelector('.nav-item.active');const page=active?active.dataset.page:'invoices';if(page==='dashboard')showPage('dashboard');else showPage('invoices');});
async function markUnpaid(id){if(!confirm('Mark this invoice as unpaid?\nThe associated payment will be deleted.'))return;await api('PATCH',`/api/invoices/${id}/status`,{status:'pending'});toast('Invoice marked as unpaid','error');viewInvoice(id);}
async function deleteInvoice(id){if(!confirm('Delete this invoice?'))return;await api('DELETE',`/api/invoices/${id}`);toast('Invoice deleted');showPage('invoices');}

/* VIEW INVOICE */
async function viewInvoice(id){
  const inv=await api('GET',`/api/invoices/${id}`);
  const rows=inv.rows||[];
  const s=settings;
  const logoHtml=s.company_logo?`<img src="${s.company_logo}" class="inv-logo" alt="Logo"/>`:`<div class="inv-logo-placeholder"><i class="ti ti-plane"></i></div>`;
  const mc=document.getElementById('main-content');
  mc.innerHTML=`
<div class="page-header"><div><div class="page-title">${inv.num}</div><div class="page-sub">${inv.client_name} — ${statusBadge(inv.status)}</div></div>
<div class="header-actions">
  <button class="btn-secondary" onclick="showPage('invoices')"><i class="ti ti-arrow-left"></i> Back</button>
  <button class="btn-secondary" onclick="editInvoice(${inv.id})"><i class="ti ti-edit"></i> Edit</button>
  ${inv.status!=='paid'?`<button class="btn-new" onclick="openPayModal(${inv.id})"><i class="ti ti-check"></i> Mark as Paid</button>`:''}
  ${inv.status==='paid'?`<button class="btn-unpaid" onclick="markUnpaid(${inv.id})"><i class="ti ti-x"></i> Mark Unpaid</button>`:''}
  <button class="btn-secondary" onclick="printInv()"><i class="ti ti-printer"></i> Print / PDF</button>
</div></div>
${inv.status==='paid'?`<div class="info-box info-box-paid"><i class="ti ti-circle-check"></i> This invoice has been paid.</div>`:''}
${inv.status==='pending'||inv.status==='overdue'?`<div class="info-box info-box-unpaid"><i class="ti ti-alert-circle"></i> This invoice has not been paid yet.</div>`:''}
<div id="printable"><div class="inv-wrap card">
  <div class="inv-head">
    <div class="inv-head-left">${logoHtml}</div>
    <div class="inv-head-right"><div class="inv-title">INVOICE</div><div class="inv-meta-grid"><span class="inv-meta-label">Invoice #:</span><span class="inv-meta-val">${inv.num}</span><span class="inv-meta-label">Invoice date:</span><span class="inv-meta-val">${fmtDate(inv.date)}</span>${inv.due_date?`<span class="inv-meta-label">Due date:</span><span class="inv-meta-val">${fmtDate(inv.due_date)}</span>`:''}</div></div>
  </div>
  <div class="inv-bill">
    <div><div class="inv-bill-label">From</div><div class="inv-bill-name">${s.company_name||'WHITE SKY'}</div><div class="inv-bill-meta">${s.company_address||''}<br>P: ${s.company_phone_p||''}<br>M: ${s.company_phone_m||''}<br>${s.company_email||''}</div></div>
    <div><div class="inv-bill-label">Bill to</div><div class="inv-bill-name">${inv.client_name}</div><div class="inv-bill-meta">${inv.client_address?`Address: ${inv.client_address}`:''}${inv.client_phone?`<br>Phone: ${inv.client_phone}`:''}${inv.client_fax?`<br>Fax: ${inv.client_fax}`:''}</div></div>
  </div>
  <div class="inv-pax"><table class="inv-pax-table">
    <thead><tr><th>PNR #</th><th>Destination</th><th>Passenger</th><th>${rows.some(r=>r.airline==='Hotel')?'Hotel':'Airline'}</th><th>Date</th><th>Price</th></tr></thead>
    <tbody>${rows.length===0?`<tr><td colspan="6" style="text-align:center;color:#bbb;padding:1.5rem">No rows</td></tr>`:rows.map(r=>`<tr><td><span class="inv-pnr">${r.pnr||'—'}</span></td><td>${r.destination||'—'}</td><td>${r.passenger||'—'}</td><td>${r.airlineRef||r.airline||'—'}</td><td>${r.travel_date||'—'}</td><td>$${Number(r.price).toLocaleString('en-US',{minimumFractionDigits:2})}</td></tr>`).join('')}</tbody>
  </table></div>
  <div class="inv-totals"><div class="inv-totals-inner">
    <div class="inv-tot-row"><span class="lbl">Invoice Subtotal</span><span class="val">${inv.currency||'KWD'} ${Number(inv.subtotal).toLocaleString('en-US',{minimumFractionDigits:2})}</span></div>
    <div class="inv-tot-row"><span class="lbl">Tax Rate</span><span class="val">${inv.currency||'KWD'} ${inv.tax?Number(inv.tax).toLocaleString('en-US',{minimumFractionDigits:2}):'-'}</span></div>
    <div class="inv-tot-row"><span class="lbl">Sales Tax</span><span class="val">${inv.currency||'KWD'} -</span></div>
    <div class="inv-tot-row"><span class="lbl">Deposit Received</span><span class="val">${inv.currency||'KWD'} ${inv.deposit?Number(inv.deposit).toLocaleString('en-US',{minimumFractionDigits:2}):'-'}</span></div>
    <div class="inv-tot-row inv-tot-final"><span class="lbl"><strong>TOTAL</strong></span><span class="val"><strong>${inv.currency||'KWD'} ${Number(inv.total).toLocaleString('en-US',{minimumFractionDigits:2})}</strong></span></div>
  </div></div>
  <div class="inv-foot">
    <div class="inv-stamp-area"><div><div class="inv-stamp-label">Signature</div>${s.company_signature?`<img src="${s.company_signature}" style="height:70px;margin-top:6px"/>`:'<div style="height:70px"></div>'}</div><div><div class="inv-stamp-label">Stamp</div>${s.company_stamp?`<img src="${s.company_stamp}" style="height:70px;margin-top:6px"/>`:'<div style="height:70px"></div>'}</div></div>
    <div class="inv-foot-note">${(s.invoice_footer||'Please make all checks payable to WHITE SKY TRAVEL AGENCY.\nTotal due in 07 days.').replace(/\n/g,'<br>')}</div>
  </div>
</div></div>`;}

function printInv(){
  const inv_content=document.getElementById('printable').innerHTML;
  const win=window.open('','_blank');
  win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Invoice</title><style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',Arial,sans-serif;font-size:12px;color:#1a1a2e;background:#fff}
.inv-wrap{padding:0}
.inv-head{display:flex;justify-content:space-between;align-items:flex-start;padding:24px 30px 16px;border-bottom:3px solid #0a3258}
.inv-head-left{display:flex;align-items:center;gap:14px}
.inv-logo{width:80px;height:80px;object-fit:contain}
.inv-logo-placeholder{width:80px;height:80px;display:flex;align-items:center;justify-content:center;font-size:10px;color:#999}
.inv-agency-name{font-size:13px;font-weight:700;color:#0a3258;letter-spacing:.04em}
.inv-head-right{text-align:right}
.inv-title{font-size:44px;font-weight:900;color:#1A6FB5;letter-spacing:.06em;line-height:1;margin-bottom:10px}
.inv-meta-grid{display:grid;grid-template-columns:auto auto;gap:3px 16px;font-size:11px}
.inv-meta-label{color:#999;font-weight:700;text-transform:uppercase;font-size:10px;text-align:right}
.inv-meta-val{color:#1a1a2e;font-weight:600;text-align:left}
.inv-bill{display:grid;grid-template-columns:1fr 1fr;gap:30px;padding:16px 30px;border-bottom:1px solid #e5eaf2}
.inv-bill-label{font-size:9px;font-weight:700;color:#aaa;text-transform:uppercase;letter-spacing:.06em;margin-bottom:5px}
.inv-bill-name{font-size:13px;font-weight:700;color:#0a3258;margin-bottom:3px}
.inv-bill-meta{font-size:11px;color:#666;line-height:1.7}
.inv-pax{padding:16px 30px}
.inv-pax-table{width:100%;border-collapse:collapse;font-size:11.5px}
.inv-pax-table th{background:#0a3258;color:#fff;padding:9px 12px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;text-align:left}
.inv-pax-table th:last-child{text-align:right}
.inv-pax-table td{padding:9px 12px;border-bottom:1px solid #f0f3f8;vertical-align:middle}
.inv-pax-table td:last-child{text-align:right;font-weight:700}
.inv-pax-table tbody tr:nth-child(even) td{background:#f9fbff}
.inv-pax-table tr:last-child td{border-bottom:none}
.inv-pnr{font-weight:800;color:#0a3258}
.inv-totals{display:flex;justify-content:flex-end;padding:0 30px 16px}
.inv-totals-inner{min-width:260px;border:1px solid #e5eaf2;border-radius:6px;overflow:hidden;font-size:12px}
.inv-tot-row{display:flex;justify-content:space-between;padding:7px 14px;border-bottom:1px solid #f0f3f8}
.inv-tot-row:last-child{border-bottom:none}
.inv-tot-row .lbl{color:#888}
.inv-tot-row .val{font-weight:600;color:#1a1a2e}
.inv-tot-final{background:#0a3258!important}
.inv-tot-final .lbl,.inv-tot-final .val{color:#fff!important;font-weight:700}
.inv-foot{padding:10px 30px 20px;display:flex;justify-content:space-between;align-items:flex-end;flex-wrap:wrap;gap:1rem;border-top:1px solid #e5eaf2}
.inv-stamp-area{display:flex;gap:60px}
.inv-stamp-label{font-size:10px;font-weight:700;color:#999;text-transform:uppercase;letter-spacing:.04em;margin-bottom:50px}
.inv-foot-note{font-size:10px;color:#aaa;text-align:right;line-height:1.8;white-space:pre-line}
@page{margin:10mm;size:A4}
@media print{
  body{padding:0}
  button{display:none!important}
}
  </style></head><body>${inv_content}<script>window.onload=()=>window.print()<\/script></body></html>`);
  win.document.close();
}

















function fillClient(sel){const o=sel.querySelector(`option[value="${sel.value}"]`);if(!o||!sel.value)return;[['inv-client-name','name'],['inv-client-addr','addr'],['inv-client-phone','phone'],['inv-client-fax','fax']].forEach(([id,k])=>{const el=document.getElementById(id);if(el)el.value=o.dataset[k]||'';});}
function setAllAirlineType(val){editInvRows.forEach(r=>r.airline=val);renderInvRows();setTimeout(()=>{const sel=document.getElementById('col-airline-type');if(sel)sel.value=val;},10);}

/* NEW/EDIT INVOICE */
async function pageNewInvoice(mc){_editInvId=null;editInvRows=[{pnr:'',destination:'',passenger:'',airline:'Airline',airlineRef:'',travel_date:'',price:0}];allClients=await api('GET','/api/clients');const{num}=await api('GET','/api/invoices/next-num');renderInvForm(mc,{num,date:today(),due_date:addDays(today(),parseInt(settings.invoice_due_days)||7),status:'pending',currency:settings.invoice_currency||'KWD',tax:0,deposit:0,due_days:settings.invoice_due_days||7});}
async function editInvoice(id){_editInvId=id;const inv=await api('GET',`/api/invoices/${id}`);editInvRows=inv.rows&&inv.rows.length?inv.rows.map(r=>({...r,airlineRef:r.airlineRef||''})):[{pnr:'',destination:'',passenger:'',airline:'Airline',airlineRef:'',travel_date:'',price:0}];allClients=await api('GET','/api/clients');const mc=document.getElementById('main-content');document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));renderInvForm(mc,inv);}
function newInvoiceFor(cid,cname,caddr,cphone,cfax){showPage('new-invoice');setTimeout(()=>{const sel=document.getElementById('inv-client');if(sel)sel.value=cid;[['inv-client-name',cname],['inv-client-addr',caddr],['inv-client-phone',cphone],['inv-client-fax',cfax]].forEach(([id,v])=>{const el=document.getElementById(id);if(el)el.value=v||'';});},150);}

function renderInvForm(mc,inv){
  const currencies=['KWD','USD','EUR','LBP','AED','SAR'];
  mc.innerHTML=`
<div class="page-header"><div><div class="page-title">${_editInvId?'Edit Invoice':'New Invoice'}</div></div><button class="btn-secondary" onclick="showPage('invoices')"><i class="ti ti-arrow-left"></i> Cancel</button></div>
<div class="card"><div class="card-header"><span class="card-title">Information</span></div><div class="form-grid2" style="gap:14px">
  <div class="form-group"><label class="form-label">Invoice #</label><input class="form-input" id="inv-num" value="${inv.num||''}" ${_editInvId?'readonly style="background:#f5f5f5"':''}/></div>
  <div class="form-group"><label class="form-label">Currency</label><select class="form-input" id="inv-currency">${currencies.map(c=>`<option ${(inv.currency||'KWD')===c?'selected':''}>${c}</option>`).join('')}</select></div>
  <div class="form-group"><label class="form-label">Date</label><input type="date" class="form-input" id="inv-date" value="${inv.date||today()}"/></div>
  <div class="form-group"><label class="form-label">Due Date</label><input type="date" class="form-input" id="inv-due" value="${inv.due_date||addDays(today(),7)}"/></div>
  <div class="form-group"><label class="form-label">Status</label><select class="form-input" id="inv-status"><option value="draft" ${inv.status==='draft'?'selected':''}>Draft</option><option value="pending" ${inv.status==='pending'?'selected':''}>Pending</option><option value="paid" ${inv.status==='paid'?'selected':''}>Paid</option><option value="overdue" ${inv.status==='overdue'?'selected':''}>Overdue</option></select></div>
  <div class="form-group"><label class="form-label">Payment terms (days)</label><input type="number" class="form-input" id="inv-due-days" value="${inv.due_days||7}" min="1" oninput="document.getElementById('inv-due').value=addDays(document.getElementById('inv-date').value,parseInt(this.value)||7)"/></div>
</div></div>
<div class="card"><div class="card-header"><span class="card-title">Client (Bill to)</span></div><div class="form-grid2" style="gap:14px">
  <div class="form-group"><label class="form-label">Select client</label><select class="form-input" id="inv-client" onchange="fillClient(this)"><option value="">-- Select --</option>${allClients.map(c=>`<option value="${c.id}" data-name="${c.name}" data-addr="${c.address||''}" data-phone="${c.phone||''}" data-fax="${c.fax||''}" ${inv.client_id==c.id?'selected':''}>${c.name}</option>`).join('')}</select></div>
  <div class="form-group"><label class="form-label">Name (Bill to) *</label><input class="form-input" id="inv-client-name" value="${inv.client_name||''}" placeholder="BERRO"/></div>
  <div class="form-group"><label class="form-label">Address</label><input class="form-input" id="inv-client-addr" value="${inv.client_address||''}" placeholder="DUBAI"/></div>
  <div class="form-group"><label class="form-label">Phone</label><input class="form-input" id="inv-client-phone" value="${inv.client_phone||''}" placeholder="965-99967060"/></div>
  <div class="form-group"><label class="form-label">Fax</label><input class="form-input" id="inv-client-fax" value="${inv.client_fax||''}" placeholder="NA"/></div>
</div></div>
<div class="card"><div class="card-header"><span class="card-title">Passengers / Services</span></div>
<div class="pax-table-wrap"><table class="pax-table">
<colgroup><col style="width:12%"><col style="width:22%"><col style="width:22%"><col style="width:18%"><col style="width:15%"><col style="width:8%"><col style="width:3%"></colgroup>
<thead><tr><th>PNR #</th><th>Destination</th><th>Passenger</th><th><select id="col-airline-type" onchange="setAllAirlineType(this.value)" style="font-size:11px;padding:3px 5px;border:1px solid #ccc;border-radius:4px;background:#f5f8fd;font-weight:700;cursor:pointer"><option value="Airline">Airline</option><option value="Hotel">Hotel</option></select></th><th>Travel Date</th><th>Price</th><th></th></tr></thead>
<tbody id="inv-rows"></tbody>
</table></div>
<button class="btn-add-row" onclick="addInvRow()"><i class="ti ti-plus" style="vertical-align:-2px;margin-right:4px"></i>Add row</button>
<div class="totals-box"><div class="totals-row"><span>Subtotal</span><span id="inv-subtotal" style="font-weight:700">0.00</span></div><div class="totals-row"><span>Tax</span><input type="number" class="form-input" id="inv-tax" value="${inv.tax||0}" min="0" step="0.01" oninput="calcInvTotal()"/></div><div class="totals-row"><span>Deposit received</span><input type="number" class="form-input" id="inv-deposit" value="${inv.deposit||0}" min="0" step="0.01" oninput="calcInvTotal()"/></div><div class="totals-row total-final"><span>TOTAL</span><span id="inv-total" style="font-size:20px">0.00</span></div></div>
<div class="form-group" style="margin-top:1rem"><label class="form-label">Notes</label><textarea class="form-input" id="inv-notes" rows="2">${inv.notes||''}</textarea></div>
<div class="form-actions"><button class="btn-secondary" onclick="showPage('invoices')">Cancel</button><button class="btn-secondary" onclick="saveInv('draft')"><i class="ti ti-device-floppy" style="vertical-align:-2px;margin-right:5px"></i>Save Draft</button><button class="btn-save" onclick="saveInv('pending')"><i class="ti ti-send" style="vertical-align:-2px;margin-right:5px"></i>Issue Invoice</button></div>
</div>`;renderInvRows();}

function renderInvRows(){const t=document.getElementById('inv-rows');if(!t)return;t.innerHTML=editInvRows.map((r,i)=>`<tr>
<td><input value="${r.pnr||''}" placeholder="UDXAY4" oninput="editInvRows[${i}].pnr=this.value"/></td>
<td><input value="${r.destination||''}" placeholder="BEY/DXB/BEY" oninput="editInvRows[${i}].destination=this.value"/></td>
<td><input value="${r.passenger||''}" placeholder="FULL NAME" oninput="editInvRows[${i}].passenger=this.value"/></td>
<td><input value="${r.airlineRef||''}" placeholder="ME, Hilton…" oninput="editInvRows[${i}].airlineRef=this.value" style="width:100%;padding:5px 7px;font-size:12px;border:1.5px solid #e0e7ef;border-radius:6px;background:#fff;outline:none;color:#1a1a2e"/></td>
<td><input value="${r.travel_date||''}" placeholder="29/12-31/12/24" oninput="editInvRows[${i}].travel_date=this.value"/></td>
<td><input type="number" value="${r.price||0}" min="0" step="0.01" style="text-align:right" oninput="editInvRows[${i}].price=parseFloat(this.value)||0;calcInvTotal()"/></td>
<td><button class="action-btn danger" onclick="removeInvRow(${i})"><i class="ti ti-x"></i></button></td>
</tr>`).join('');calcInvTotal();}
function addInvRow(){editInvRows.push({pnr:'',destination:'',passenger:'',airline:'Airline',airlineRef:'',travel_date:'',price:0});renderInvRows();}
function removeInvRow(i){if(editInvRows.length===1){toast('At least one row required');return;}editInvRows.splice(i,1);renderInvRows();}
function calcInvTotal(){const sub=editInvRows.reduce((a,r)=>a+(parseFloat(r.price)||0),0);const tax=parseFloat(document.getElementById('inv-tax')?.value)||0;const dep=parseFloat(document.getElementById('inv-deposit')?.value)||0;const cur=document.getElementById('inv-currency')?.value||'KWD';const s=document.getElementById('inv-subtotal');if(s)s.textContent=cur+' '+sub.toFixed(2);const t=document.getElementById('inv-total');if(t)t.textContent=cur+' '+(sub+tax-dep).toFixed(2);}
async function saveInv(status){const cname=document.getElementById('inv-client-name')?.value.trim();if(!cname){toast('Client name is required','error');return;}const body={num:document.getElementById('inv-num')?.value.trim(),client_id:document.getElementById('inv-client')?.value||null,client_name:cname,client_address:document.getElementById('inv-client-addr')?.value.trim(),client_phone:document.getElementById('inv-client-phone')?.value.trim(),client_fax:document.getElementById('inv-client-fax')?.value.trim(),status,date:document.getElementById('inv-date')?.value,due_date:document.getElementById('inv-due')?.value,due_days:document.getElementById('inv-due-days')?.value||7,currency:document.getElementById('inv-currency')?.value||'KWD',tax:document.getElementById('inv-tax')?.value||0,deposit:document.getElementById('inv-deposit')?.value||0,notes:document.getElementById('inv-notes')?.value.trim(),rows:editInvRows};let r;if(_editInvId){r=await api('PUT',`/api/invoices/${_editInvId}`,body);toast('✅ Invoice updated','success');}else{r=await api('POST','/api/invoices',body);toast('✅ Invoice created','success');}if(r&&r.error){toast(r.error,'error');return;}if(_editInvId)viewInvoice(_editInvId);else showPage('invoices');}

/* TICKET SALES */
async function pageTickets(mc){const tickets=await api('GET','/api/tickets');const firstDay=new Date(new Date().getFullYear(),0,1).toISOString().split('T')[0];mc.innerHTML=`<div class="page-header"><div><div class="page-title">Ticket Sales</div><div class="page-sub">${tickets.length} ticket(s)</div></div><div class="header-actions"><button class="btn-new" onclick="showPage('new-ticket')"><i class="ti ti-plus"></i> New Ticket</button><button class="btn-secondary" onclick="showProfitReport()"><i class="ti ti-chart-bar"></i> Profit Report</button></div></div><div class="card" style="padding:0;overflow:hidden"><div class="table-wrap"><table><thead><tr><th>#</th><th>Passenger</th><th>Airline</th><th>PNR</th><th>Destination</th><th>Date</th><th>Net</th><th>Selling</th><th>Profit</th><th>Status</th><th>Actions</th></tr></thead><tbody>${tickets.length===0?`<tr><td colspan="11"><div class="empty-state"><i class="ti ti-ticket"></i><h3>No tickets</h3></div></td></tr>`:tickets.map(t=>`<tr><td style="font-weight:700;cursor:pointer;color:#1A6FB5" onclick="viewTicket(${t.id})">${t.num}</td><td>${t.passenger||'—'}</td><td>${t.airline||'—'}</td><td>${t.pnr||'—'}</td><td>${t.destination||'—'}</td><td>${fmtDate(t.date)}</td><td>${fmt(t.net_price)}</td><td>${fmt(t.selling_price)}</td><td style="font-weight:700;color:#1a7a3a">${fmt(t.selling_price-t.net_price)}</td><td>${t.status==='paid'?'<span class="badge badge-paid">Paid</span>':'<span class="badge badge-pending">Unpaid</span>'}</td><td class="actions-cell"><button class="action-btn edit" onclick="editTicket(${t.id})"><i class="ti ti-edit"></i> Edit</button><button class="action-btn danger" onclick="deleteTicket(${t.id})"><i class="ti ti-trash"></i> Delete</button></td></tr>`).join('')}</tbody></table></div></div><div id="profit-report-section"></div>`;}

function showProfitReport(){const firstDay=new Date(new Date().getFullYear(),0,1).toISOString().split('T')[0];document.getElementById('profit-report-section').innerHTML=`<div class="card" style="margin-top:1rem"><div class="card-header"><span class="card-title"><i class="ti ti-chart-bar"></i> Profit Report</span></div><div class="filter-bar" style="flex-wrap:wrap;gap:10px"><input type="date" class="form-input" id="rpt-tkt-from" value="${firstDay}" style="width:150px"/><span style="color:#aaa;align-self:center">to</span><input type="date" class="form-input" id="rpt-tkt-to" value="${today()}" style="width:150px"/><button class="btn-new" onclick="loadProfitReport()"><i class="ti ti-search"></i> Generate</button></div></div><div id="profit-report-result"></div>`;}

async function loadProfitReport(){const from=document.getElementById('rpt-tkt-from')?.value;const to=document.getElementById('rpt-tkt-to')?.value;const tickets=await api('GET','/api/tickets');const filtered=tickets.filter(t=>{const d=t.date?t.date.split('t')[0]:'';;const iso=d.includes('/')?d.split('/').reverse().join('-'):d;return(!from||iso>=from)&&(!to||iso<=to);}).sort((a,b)=>a.date.localecompare(b.date)).sort((a,b)=>a.date.localeCompare(b.date));const totalProfit=filtered.reduce((a,t)=>a+(t.selling_price-t.net_price),0);const totalSelling=filtered.reduce((a,t)=>a+t.selling_price,0);const fmtNum=(n)=>Number(n||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});const rows=filtered.map((t,idx)=>`<tr style="background:${idx%2===0?'#f2f5fa':'#fff'}"><td style="padding:5px 8px;border:1px solid #ddd">${fmtDate(t.date)}</td><td style="padding:5px 8px;border:1px solid #ddd;font-weight:700">${t.num}</td><td style="padding:5px 8px;border:1px solid #ddd">${t.passenger||'—'}</td><td style="padding:5px 8px;border:1px solid #ddd">${t.airline||'—'}</td><td style="padding:5px 8px;border:1px solid #ddd">${t.destination||'—'}</td><td style="padding:5px 8px;border:1px solid #ddd;text-align:right">${fmtNum(t.net_price)}</td><td style="padding:5px 8px;border:1px solid #ddd;text-align:right;font-weight:700">${fmtNum(t.selling_price)}</td><td style="padding:5px 8px;border:1px solid #ddd;text-align:right;font-weight:700;color:#1a7a3a">${fmtNum(t.selling_price-t.net_price)}</td><td style="padding:5px 8px;border:1px solid #ddd">${t.status==='paid'?'<span style="color:#1a7a3a;font-weight:700">Paid</span>':'<span style="color:#888">Unpaid</span>'}</td></tr>`).join('');document.getElementById('profit-report-result').innerHTML=`<div class="card" style="margin-top:.5rem;padding:0;overflow:hidden"><div style="display:flex;justify-content:space-between;align-items:center;padding:.75rem 1rem;border-bottom:1px solid #eee"><span style="font-weight:700;font-size:14px">📊 Profit Report</span><button class="btn-secondary" onclick="printProfitReport()"><i class="ti ti-printer"></i> Print / PDF</button></div><div id="profit-report-printable" style="padding:1.25rem"><table style="width:100%;border-collapse:collapse;font-size:11.5px"><thead><tr style="background:#0a3258;color:#fff"><th style="padding:7px 8px;border:1px solid #0a3258">Date</th><th style="padding:7px 8px;border:1px solid #0a3258">#</th><th style="padding:7px 8px;border:1px solid #0a3258">Passenger</th><th style="padding:7px 8px;border:1px solid #0a3258">Airline</th><th style="padding:7px 8px;border:1px solid #0a3258">Destination</th><th style="padding:7px 8px;border:1px solid #0a3258;text-align:right">Net</th><th style="padding:7px 8px;border:1px solid #0a3258;text-align:right">Selling</th><th style="padding:7px 8px;border:1px solid #0a3258;text-align:right">Profit</th><th style="padding:7px 8px;border:1px solid #0a3258">Status</th></tr></thead><tbody>${filtered.length===0?`<tr><td colspan="9" style="text-align:center;padding:2rem;color:#aaa;border:1px solid #ddd">No tickets for this period</td></tr>`:rows}</tbody><tfoot><tr style="background:#0a3258;color:#fff"><td colspan="5" style="padding:8px;border:1px solid #0a3258;font-weight:700">TOTAL</td><td style="padding:8px;border:1px solid #0a3258;text-align:right;font-weight:700">${fmtNum(totalSelling-totalProfit)}</td><td style="padding:8px;border:1px solid #0a3258;text-align:right;font-weight:700">${fmtNum(totalSelling)}</td><td style="padding:8px;border:1px solid #0a3258;text-align:right;font-weight:700;color:#90ee90">${fmtNum(totalProfit)}</td><td style="border:1px solid #0a3258"></td></tr></tfoot></table></div></div>`;}

function printProfitReport(){const content=document.getElementById('profit-report-printable')?.innerHTML;if(!content)return;const s=settings;const logoHtml=s.company_logo?`<img src="${s.company_logo}" style="height:60px;object-fit:contain" alt="Logo"/>`:`<div style="font-size:18px;font-weight:900;color:#0a3258">✈ WHITE SKY</div>`;const win=window.open('','_blank');win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Profit Report</title><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;font-size:11px;color:#222;background:#fff}.page{padding:20px 25px}.header{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:12px;border-bottom:3px solid #0a3258;margin-bottom:16px}.header-left{display:flex;align-items:center;gap:14px}.company-info{font-size:10px;color:#555;line-height:1.6}.company-name{font-size:13px;font-weight:700;color:#0a3258}.stmt-title{text-align:right}.stmt-title h1{font-size:22px;font-weight:900;color:#0a3258}table{width:100%;border-collapse:collapse;font-size:10.5px}thead tr{background:#0a3258;color:#fff}th{padding:7px 8px;border:1px solid #0a3258;text-align:left;font-weight:700;font-size:10px;text-transform:uppercase}td{padding:5px 8px;border:1px solid #ddd}tbody tr:nth-child(even) td{background:#f5f8fd}tfoot tr{background:#0a3258;color:#fff}tfoot td{border:1px solid #0a3258;font-weight:700}.footer{margin-top:20px;padding-top:10px;border-top:1px solid #ddd;display:flex;justify-content:space-between;font-size:9.5px;color:#aaa}@media print{body{padding:0}.page{padding:10px 15px}button{display:none!important}}</style></head><body><div class="page"><div class="header"><div class="header-left">${logoHtml}<div class="company-info"><div class="company-name">${s.company_name||'WHITE SKY TRAVEL AGENCY'}</div><div>${s.company_address||''}</div><div>P: ${s.company_phone_p||''} | M: ${s.company_phone_m||''}</div></div></div><div class="stmt-title"><h1>PROFIT REPORT</h1><p style="font-size:10px;color:#888;margin-top:4px">Generated on ${new Date().toLocaleDateString('en-GB')}</p></div></div>${content}<div class="footer"><span>${s.company_name||'WHITE SKY TRAVEL AGENCY'}</span><span>Generated on ${new Date().toLocaleString('en-GB')}</span></div></div><script>window.onload=()=>window.print()<\/script></body></html>`);win.document.close();}

async function viewTicket(id){const t=await api('GET',`/api/tickets/${id}`);const mc=document.getElementById('main-content');mc.innerHTML=`<div class="page-header"><div><div class="page-title">${t.num}</div><div class="page-sub">${t.passenger||''} — ${t.status==='paid'?'<span class=\'badge badge-paid\'>Paid</span>':'<span class=\'badge badge-pending\'>Unpaid</span>'}</div></div><div class="header-actions"><button class="btn-secondary" onclick="showPage('tickets')"><i class="ti ti-arrow-left"></i> Back</button><button class="btn-secondary" onclick="editTicket(${t.id})"><i class="ti ti-edit"></i> Edit</button>${t.status!=='paid'?`<button class="btn-new" onclick="api('PATCH','/api/tickets/${t.id}/status',{status:'paid'}).then(()=>{toast('✅ Marked as paid','success');viewTicket(${t.id})})"><i class="ti ti-check"></i> Mark Paid</button>`:`<button class="btn-danger" onclick="api('PATCH','/api/tickets/${t.id}/status',{status:'unpaid'}).then(()=>{toast('Marked unpaid','error');viewTicket(${t.id})})"><i class="ti ti-x"></i> Mark Unpaid</button>`}<button class="action-btn" onclick="deleteTicket(${t.id})"><i class="ti ti-trash"></i></button></div></div><div class="card"><div class="form-grid2" style="gap:14px"><div class="form-group"><label class="form-label">Ticket #</label><div style="padding:9px 12px;background:#f5f5f5;border-radius:7px;font-weight:700">${t.num}</div></div><div class="form-group"><label class="form-label">Date</label><div style="padding:9px 12px;background:#f5f5f5;border-radius:7px">${fmtDate(t.date)}</div></div><div class="form-group"><label class="form-label">Airline PNR</label><div style="padding:9px 12px;background:#f5f5f5;border-radius:7px;font-weight:700">${t.pnr||'—'}</div></div><div class="form-group"><label class="form-label">System PNR</label><div style="padding:9px 12px;background:#f5f5f5;border-radius:7px">${t.company||'—'}</div></div><div class="form-group"><label class="form-label">Airline</label><div style="padding:9px 12px;background:#f5f5f5;border-radius:7px">${t.airline||'—'}</div></div><div class="form-group"><label class="form-label">Destination</label><div style="padding:9px 12px;background:#f5f5f5;border-radius:7px">${t.destination||'—'}</div></div><div class="form-group"><label class="form-label">Passenger Name</label><div style="padding:9px 12px;background:#f5f5f5;border-radius:7px">${t.passenger||'—'}</div></div><div class="form-group"><label class="form-label">System Issue</label><div style="padding:9px 12px;background:#f5f5f5;border-radius:7px">${t.system_issue||'—'}</div></div><div class="form-group"><label class="form-label">Net Price</label><div style="padding:9px 12px;background:#f5f5f5;border-radius:7px">${fmt(t.net_price)}</div></div><div class="form-group"><label class="form-label">Selling Price</label><div style="padding:9px 12px;background:#f5f5f5;border-radius:7px;font-weight:700">${fmt(t.selling_price)}</div></div><div class="form-group full"><label class="form-label">Profit</label><div style="padding:9px 12px;background:#e6f9ee;border-radius:7px;font-weight:700;color:#1a7a3a;font-size:18px">${fmt(t.selling_price-t.net_price)}</div></div>${t.notes?`<div class="form-group full"><label class="form-label">Notes</label><div style="padding:9px 12px;background:#f5f5f5;border-radius:7px">${t.notes}</div></div>`:''}</div></div>`;}
let _editTicketId=null;
async function pageNewTicket(mc){_editTicketId=null;allClients=await api('GET','/api/clients');const{num}=await api('GET','/api/tickets/next-num');renderTicketForm(mc,{num,date:today(),status:'unpaid',ticket_type:'individual'});}
async function editTicket(id){_editTicketId=id;const t=await api('GET',`/api/tickets/${id}`);allClients=await api('GET','/api/clients');const mc=document.getElementById('main-content');document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));renderTicketForm(mc,t);}
function renderTicketForm(mc,t){
  const isCompany=t.ticket_type==='company';
  mc.innerHTML=`<div class="page-header"><div><div class="page-title">${_editTicketId?'Edit Ticket':'New Ticket'}</div></div><button class="btn-secondary" onclick="showPage('tickets')"><i class="ti ti-arrow-left"></i> Cancel</button></div>
<div class="card">
  <div style="display:flex;gap:8px;margin-bottom:1.2rem">
    <button id="tkt-type-indiv" onclick="switchTktType('individual')" class="${!isCompany?'btn-new':'btn-secondary'}" style="border-radius:8px"><i class="ti ti-user"></i> Individual</button>
    <button id="tkt-type-company" onclick="switchTktType('company')" class="${isCompany?'btn-new':'btn-secondary'}" style="border-radius:8px"><i class="ti ti-building"></i> Company</button>
  </div>
  <input type="hidden" id="tkt-type" value="${t.ticket_type||'individual'}"/>
  <div class="form-grid2" style="gap:14px">
    <div class="form-group"><label class="form-label">Ticket #</label><input class="form-input" id="tkt-num" value="${t.num||''}" ${_editTicketId?'readonly style="background:#f5f5f5"':''}/></div>
    <div class="form-group"><label class="form-label">Date</label><input type="date" class="form-input" id="tkt-date" value="${t.date||today()}"/></div>
    <div class="form-group full" id="tkt-company-row" style="display:${isCompany?'block':'none'}">
      <label class="form-label">Company (Client)</label>
      <select class="form-input" id="tkt-client-id" onchange="fillTktCompany(this)">
        <option value="">-- Select Company --</option>
        ${allClients.map(c=>`<option value="${c.id}" data-name="${c.name}" ${t.client_id==c.id?'selected':''}>${c.name}</option>`).join('')}
      </select>
    </div>
    <div class="form-group" id="tkt-passenger-row" style="display:${!isCompany?'block':'none'}">
      <label class="form-label">Passenger Name</label>
      <input class="form-input" id="tkt-passenger" value="${t.passenger||''}" placeholder="FULL NAME"/>
    </div>
    <div class="form-group"><label class="form-label">Airline PNR</label><input class="form-input" id="tkt-pnr" value="${t.pnr||''}" placeholder="UDXAY4"/></div>
    <div class="form-group"><label class="form-label">System PNR</label><input class="form-input" id="tkt-company" value="${t.company||''}" placeholder="e.g. Amadeus, Sabre"/></div>
    <div class="form-group"><label class="form-label">Airline</label><input class="form-input" id="tkt-airline" value="${t.airline||''}" placeholder="e.g. ME, QR, EK"/></div>
    <div class="form-group"><label class="form-label">Destination</label><input class="form-input" id="tkt-destination" value="${t.destination||''}" placeholder="e.g. BEY/DXB/BEY"/></div>
    <div class="form-group"><label class="form-label">System Issue</label><input class="form-input" id="tkt-system" value="${t.system_issue||''}" placeholder="e.g. Amadeus, Sabre"/></div>
    <div class="form-group"><label class="form-label">Currency</label><select class="form-input" id="tkt-currency"><option ${(t.currency||'KWD')==='KWD'?'selected':''}>KWD</option><option ${t.currency==='USD'?'selected':''}>USD</option><option ${t.currency==='EUR'?'selected':''}>EUR</option><option ${t.currency==='LBP'?'selected':''}>LBP</option><option ${t.currency==='AED'?'selected':''}>AED</option><option ${t.currency==='SAR'?'selected':''}>SAR</option></select></div>
    <div class="form-group"><label class="form-label">Net Price</label><input type="number" class="form-input" id="tkt-net" value="${t.net_price||0}" min="0" step="0.01" oninput="calcProfit()"/></div>
    <div class="form-group"><label class="form-label">Selling Price</label><input type="number" class="form-input" id="tkt-selling" value="${t.selling_price||0}" min="0" step="0.01" oninput="calcProfit()"/></div>
    <div class="form-group full"><label class="form-label">Profit</label><div id="tkt-profit" style="padding:9px 12px;background:#e6f9ee;border-radius:7px;font-weight:700;color:#1a7a3a;font-size:16px">${fmt((t.selling_price||0)-(t.net_price||0))}</div></div>
    <div class="form-group"><label class="form-label">Status</label><select class="form-input" id="tkt-status"><option value="unpaid" ${(t.status||'unpaid')==='unpaid'?'selected':''}>Unpaid</option><option value="paid" ${t.status==='paid'?'selected':''}>Paid</option></select></div>
    <div class="form-group full"><label class="form-label">Notes</label><textarea class="form-input" id="tkt-notes" rows="2">${t.notes||''}</textarea></div>
  </div>
  <div class="form-actions"><button class="btn-secondary" onclick="showPage('tickets')">Cancel</button><button class="btn-save" onclick="saveTicket()"><i class="ti ti-send" style="vertical-align:-2px;margin-right:5px"></i>${_editTicketId?'Update':'Save Ticket'}</button></div>
</div>`;calcProfit();}

function switchTktType(type){document.getElementById('tkt-type').value=type;const isCompany=type==='company';document.getElementById('tkt-type-indiv').className=!isCompany?'btn-new':'btn-secondary';document.getElementById('tkt-type-indiv').style.borderRadius='8px';document.getElementById('tkt-type-company').className=isCompany?'btn-new':'btn-secondary';document.getElementById('tkt-type-company').style.borderRadius='8px';document.getElementById('tkt-company-row').style.display=isCompany?'block':'none';document.getElementById('tkt-passenger-row').style.display=!isCompany?'block':'none';}
function fillTktCompany(sel){const o=sel.querySelector(`option[value="${sel.value}"]`);if(o&&sel.value){document.getElementById('tkt-passenger').value=o.dataset.name||o.textContent;}}
function calcProfit(){const net=parseFloat(document.getElementById('tkt-net')?.value)||0;const sell=parseFloat(document.getElementById('tkt-selling')?.value)||0;const el=document.getElementById('tkt-profit');if(el)el.textContent=fmt(sell-net);}
async function saveTicket(){const type=document.getElementById('tkt-type')?.value||'individual';const clientId=type==='company'?document.getElementById('tkt-client-id')?.value||null:null;const passenger=document.getElementById('tkt-passenger')?.value.trim()||'';const body={num:document.getElementById('tkt-num')?.value.trim(),date:document.getElementById('tkt-date')?.value,pnr:document.getElementById('tkt-pnr')?.value.trim(),company:document.getElementById('tkt-company')?.value.trim(),airline:document.getElementById('tkt-airline')?.value.trim(),destination:document.getElementById('tkt-destination')?.value.trim(),passenger,system_issue:document.getElementById('tkt-system')?.value.trim(),currency:document.getElementById('tkt-currency')?.value||'KWD',net_price:document.getElementById('tkt-net')?.value||0,selling_price:document.getElementById('tkt-selling')?.value||0,status:document.getElementById('tkt-status')?.value||'unpaid',notes:document.getElementById('tkt-notes')?.value.trim(),ticket_type:type,client_id:clientId};let r;if(_editTicketId){r=await api('PUT',`/api/tickets/${_editTicketId}`,body);toast('✅ Ticket updated','success');}else{r=await api('POST','/api/tickets',body);toast('✅ Ticket saved','success');}if(r&&r.error){toast(r.error,'error');return;}if(_editTicketId)viewTicket(_editTicketId);else showPage('tickets');}
async function deleteTicket(id){if(!confirm('Delete this ticket?'))return;await api('DELETE',`/api/tickets/${id}`);toast('Ticket deleted');showPage('tickets');}

/* STATEMENTS */
async function pageStatements(mc){allClients=await api('GET','/api/clients');const firstDay='2020-01-01';mc.innerHTML=`
<div class="page-header"><div><div class="page-title">Statements</div><div class="page-sub">Invoice & ticket history by client or person</div></div></div>
<div style="display:flex;gap:8px;margin-bottom:1.5rem"><button id="tab-company" onclick="switchStmtTab('company')" class="btn-new" style="border-radius:8px">🏢 Company</button><button id="tab-person" onclick="switchStmtTab('person')" class="btn-secondary" style="border-radius:8px">👤 Individual</button></div>
<div id="stmt-company"><div class="card"><div class="card-header"><span class="card-title">Company Statement</span></div><div class="filter-bar" style="flex-wrap:wrap;gap:10px"><select class="form-input" id="stmt-client" style="min-width:200px"><option value="">-- Select Company --</option>${allClients.map(c=>`<option value="${c.id}">${c.name}</option>`).join('')}</select><input type="date" class="form-input" id="stmt-from" value="${firstDay}" style="width:150px"/><span style="color:#aaa;align-self:center">to</span><input type="date" class="form-input" id="stmt-to" value="${today()}" style="width:150px"/><button class="btn-new" onclick="loadCompanyStmt()"><i class="ti ti-search"></i> Search</button></div></div><div id="stmt-company-result"></div></div>
<div id="stmt-person" style="display:none"><div class="card"><div class="card-header"><span class="card-title">Individual Statement</span></div><div class="filter-bar" style="flex-wrap:wrap;gap:10px"><div style="position:relative;min-width:200px">
  <input type="text" class="form-input" id="stmt-name" placeholder="Passenger name…" style="width:100%" oninput="filterStmtNames(this.value)" onblur="setTimeout(()=>document.getElementById('stmt-name-suggestions').style.display='none',200)" autocomplete="off"/>
  <div id="stmt-name-suggestions" style="display:none;position:absolute;top:100%;left:0;right:0;background:#fff;border:1px solid #ddd;border-radius:6px;box-shadow:0 4px 12px rgba(0,0,0,.1);z-index:999;max-height:200px;overflow-y:auto"></div>
</div><input type="date" class="form-input" id="stmt-pfrom" value="${firstDay}" style="width:150px"/><span style="color:#aaa;align-self:center">to</span><input type="date" class="form-input" id="stmt-pto" value="${today()}" style="width:150px"/><button class="btn-new" onclick="loadPersonStmt()"><i class="ti ti-search"></i> Search</button></div></div><div id="stmt-person-result"></div></div>`;}



function switchStmtTab(tab){document.getElementById('stmt-company').style.display=tab==='company'?'':'none';document.getElementById('stmt-person').style.display=tab==='person'?'':'none';document.getElementById('tab-company').className=tab==='company'?'btn-new':'btn-secondary';document.getElementById('tab-company').style.borderRadius='8px';document.getElementById('tab-person').className=tab==='person'?'btn-new':'btn-secondary';document.getElementById('tab-person').style.borderRadius='8px';}
async function loadCompanyStmt(){const clientId=document.getElementById('stmt-client')?.value;const from=document.getElementById('stmt-from')?.value;const to=document.getElementById('stmt-to')?.value;if(!clientId){toast('Please select a company','error');return;}const client=allClients.find(c=>c.id==clientId);const invoices=await api('GET','/api/invoices');const clientInvoices=invoices.filter(i=>{const matchClient=i.client_id==clientId||(i.client_name&&client&&i.client_name.toLowerCase()===client.name.toLowerCase());const matchDate=(!from||i.date>=from)&&(!to||i.date<=to);return matchClient&&matchDate;}).sort((a,b)=>a.date.localeCompare(b.date));const rc=document.getElementById('stmt-company-result');if(!rc)return;const totalAmount=clientInvoices.reduce((a,i)=>a+i.total,0);const totalDue=clientInvoices.filter(i=>i.status!=='paid').reduce((a,i)=>a+i.total,0);const fmtNum=(n)=>Number(n||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});const rows=clientInvoices.map((i,idx)=>{const isPaid=i.status==='paid'||i.status==='refunded';const isRefunded=i.status==='refunded';const balDue=isPaid?0:i.total;const bg=isRefunded?'#fffbe6':idx%2===0?'#f2f5fa':'#fff';const desc=i.notes?i.notes.split(' ').slice(0,3).join(' ').toUpperCase():'TICKET';const detail=i.notes||'—';return`<tr style="background:${bg}"><td style="padding:5px 8px;border:1px solid #ddd">${fmtDate(i.date)}</td><td style="padding:5px 8px;border:1px solid #ddd;text-align:center;font-weight:700">${i.num}</td><td style="padding:5px 8px;border:1px solid #ddd;font-weight:600">${desc}</td><td style="padding:5px 8px;border:1px solid #ddd">${detail}</td><td style="padding:5px 8px;border:1px solid #ddd;text-align:right">${fmtNum(i.total)}</td><td style="padding:5px 8px;border:1px solid #ddd;text-align:right;font-weight:700">${balDue>0?fmtNum(balDue):''}</td><td style="padding:5px 8px;border:1px solid #ddd;text-align:center;color:#c0392b;font-weight:700;font-style:italic">${fmtDate(i.due_date)}</td><td style="padding:5px 8px;border:1px solid #ddd;text-align:center;color:#b8860b;font-weight:700">${isRefunded?'✓ REFUND':''}</td><td style="padding:5px 8px;border:1px solid #ddd;color:${i.status==='paid'?'#1a7a3a':i.status==='refunded'?'#b8860b':'#888'};font-weight:700">${i.status==='paid'?'PAID':i.status==='refunded'?'REFUNDED':''}</td></tr>`;}).join('');rc.innerHTML=`<div class="card" style="margin-top:1rem;padding:0;overflow:hidden"><div style="display:flex;justify-content:space-between;align-items:center;padding:.75rem 1rem;border-bottom:1px solid #eee"><span style="font-weight:700;font-size:14px">📋 ${client?.name||''} — Statement of Account</span><button class="btn-secondary" onclick="printStmt()"><i class="ti ti-printer"></i> Print / PDF</button></div><div id="stmt-printable" style="padding:1.25rem"><table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:1rem"><tr><td style="font-size:15px;font-weight:700;color:#1A6FB5">${client?.name||''}</td><td style="text-align:center;font-size:14px;font-weight:700">CREDIT ACCOUNT</td><td style="text-align:right"><span style="font-size:12px;font-weight:600">Total Amount Payable</span><br><span style="background:#FFD700;padding:4px 14px;font-size:16px;font-weight:700;display:inline-block;margin-top:4px">${fmtNum(totalDue)}</span></td></tr></table><table style="width:100%;border-collapse:collapse;font-size:11.5px"><thead><tr style="background:#8fa8c8;color:#fff"><th style="padding:7px 8px;border:1px solid #aaa;text-align:left">Invoice Date</th><th style="padding:7px 8px;border:1px solid #aaa;text-align:center">Invoice Number</th><th style="padding:7px 8px;border:1px solid #aaa;text-align:left">Description</th><th style="padding:7px 8px;border:1px solid #aaa;text-align:left">Detail</th><th style="padding:7px 8px;border:1px solid #aaa;text-align:right">Total Invoice Amount</th><th style="padding:7px 8px;border:1px solid #aaa;text-align:right">Balance Due</th><th style="padding:7px 8px;border:1px solid #aaa;text-align:center">Due Date</th><th style="padding:7px 8px;border:1px solid #aaa;text-align:center">Refund</th><th style="padding:7px 8px;border:1px solid #aaa;text-align:left">Status</th></tr></thead><tbody>${clientInvoices.length===0?`<tr><td colspan="9" style="text-align:center;padding:2rem;color:#aaa;border:1px solid #ddd">No invoices found for this period</td></tr>`:rows}</tbody><tfoot><tr style="background:#f0f0f0"><td colspan="4" style="padding:7px 8px;border:1px solid #ddd;font-weight:700">Total Amount Payable</td><td style="padding:7px 8px;border:1px solid #ddd;text-align:right;font-weight:700">${fmtNum(totalAmount)}</td><td style="padding:7px 8px;border:1px solid #ddd;text-align:right;font-weight:700;color:#c0392b">${fmtNum(totalDue)}</td><td colspan="3" style="border:1px solid #ddd"></td></tr></tfoot></table></div></div>`;}



function printStmt(){const content=document.getElementById('stmt-printable')?.innerHTML;if(!content)return;const s=settings;const logoHtml=s.company_logo?`<img src="${s.company_logo}" style="height:60px;object-fit:contain" alt="Logo"/>`:`<div style="font-size:18px;font-weight:900;color:#0a3258">✈ WHITE SKY</div>`;const win=window.open('','_blank');win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Statement of Account</title><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;font-size:11px;color:#222;background:#fff}.page{padding:20px 25px}.header{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:12px;border-bottom:3px solid #0a3258;margin-bottom:16px}.header-left{display:flex;align-items:center;gap:14px}.company-info{font-size:10px;color:#555;line-height:1.6}.company-name{font-size:13px;font-weight:700;color:#0a3258;margin-bottom:2px}.stmt-title{text-align:right}.stmt-title h1{font-size:22px;font-weight:900;color:#0a3258;letter-spacing:.04em}.stmt-title p{font-size:10px;color:#888;margin-top:2px}table{width:100%;border-collapse:collapse;font-size:10.5px}thead tr{background:#0a3258;color:#fff}th{padding:7px 8px;border:1px solid #0a3258;text-align:left;font-weight:700;font-size:10px;text-transform:uppercase;letter-spacing:.03em}td{padding:5px 8px;border:1px solid #ddd}tbody tr:nth-child(even) td{background:#f5f8fd}tfoot tr td{background:#e8eef5;font-weight:700;border:1px solid #bbb}.footer{margin-top:20px;padding-top:10px;border-top:1px solid #ddd;display:flex;justify-content:space-between;font-size:9.5px;color:#aaa}@media print{body{padding:0}.page{padding:10px 15px}button{display:none!important}}</style></head><body><div class="page"><div class="header"><div class="header-left">${logoHtml}<div class="company-info"><div class="company-name">${s.company_name||'WHITE SKY TRAVEL AGENCY'}</div><div>${s.company_address||''}</div><div>P: ${s.company_phone_p||''} | M: ${s.company_phone_m||''}</div><div>${s.company_email||''}</div></div></div><div class="stmt-title"><h1>STATEMENT</h1><p>OF ACCOUNT</p><p style="margin-top:6px;color:#555">Date: ${new Date().toLocaleDateString('en-GB')}</p></div></div>${content}<div class="footer"><span>${s.company_name||'WHITE SKY TRAVEL AGENCY'} — ${s.company_email||''}</span><span>Generated on ${new Date().toLocaleString('en-GB')}</span></div></div><script>window.onload=()=>window.print()<\/script></body></html>`);win.document.close();}

let _stmtAllNames=[];
async function loadStmtNames(){
  if(currentUser&&currentUser.role==='employe'){_stmtAllNames=[];return;}
  if(_stmtAllNames.length)return;
  const[inv,tkt]=await Promise.all([api('GET','/api/invoices'),api('GET','/api/tickets')]);
  const names=new Set();
  inv.forEach(i=>{if(i.client_name)names.add(i.client_name);});
  tkt.forEach(t=>{if(t.passenger)names.add(t.passenger);});
  _stmtAllNames=[...names].sort();
}
function filterStmtNames(q){loadStmtNames().then(()=>{const box=document.getElementById('stmt-name-suggestions');if(!q){box.style.display='none';return;}const matches=_stmtAllNames.filter(n=>n.toLowerCase().includes(q.toLowerCase())).slice(0,8);if(!matches.length){box.style.display='none';return;}box.innerHTML=matches.map(n=>`<div style="padding:8px 12px;cursor:pointer;font-size:13px;border-bottom:1px solid #f0f0f0" onmousedown="document.getElementById('stmt-name').value='${n.replace(/'/g,"\\'")}';document.getElementById('stmt-name-suggestions').style.display='none'">${n}</div>`).join('');box.style.display='block';});}












async function loadPersonStmt(){const name=document.getElementById('stmt-name')?.value.trim();const from=document.getElementById('stmt-pfrom')?.value;const to=document.getElementById('stmt-pto')?.value;if(!name){toast('Please enter a name','error');return;}const[tickets,invoices]=await Promise.all([api('GET','/api/tickets'),api('GET','/api/invoices')]);const filteredTickets=tickets.filter(t=>{const matchName=t.passenger&&t.passenger.toLowerCase().includes(name.toLowerCase());const matchDate=(!from||t.date>=from)&&(!to||t.date<=to);return matchName&&matchDate;});const filteredInvoices=invoices.filter(i=>{const matchName=i.client_name&&i.client_name.toLowerCase().includes(name.toLowerCase());const matchDate=(!from||i.date>=from)&&(!to||i.date<=to);return matchName&&matchDate;});const rc=document.getElementById('stmt-person-result');if(!rc)return;const fmtNum=(n)=>Number(n||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});const totalAmount=filteredInvoices.reduce((a,i)=>a+i.total,0)+filteredTickets.reduce((a,t)=>a+t.selling_price,0);const totalDue=filteredInvoices.filter(i=>i.status!=='paid'&&i.status!=='refunded').reduce((a,i)=>a+i.total,0)+filteredTickets.filter(t=>t.status!=='paid'&&t.status!=='refunded').reduce((a,t)=>a+t.selling_price,0);const allRows=[...filteredInvoices.map(i=>({id:i.id,type:'invoice',num:i.num,date:i.date,desc:i.notes?i.notes.split(' ').slice(0,3).join(' ').toUpperCase():'TICKET',detail:i.notes||'—',total:i.total,due:(i.status==='paid'||i.status==='refunded')?0:i.total,due_date:i.due_date,status:i.status,currency:i.currency})),...filteredTickets.map(t=>({id:t.id,type:'ticket',num:t.num,date:t.date,desc:'TICKET',detail:t.destination||'—',total:t.selling_price,due:(t.status==='paid'||t.status==='refunded')?0:t.selling_price,due_date:'—',status:t.status,currency:''}))].sort((a,b)=>a.date.localeCompare(b.date));const rows=allRows.map((r,idx)=>`<tr style="background:${idx%2===0?'#f2f5fa':'#fff'}"><td style="padding:5px 8px;border:1px solid #ddd">${fmtDate(r.date)}</td><td style="padding:5px 8px;border:1px solid #ddd;text-align:center;font-weight:700;color:#1A6FB5;cursor:pointer" onclick="${r.type==='invoice'?`viewInvoice(${r.id})`:`viewTicket(${r.id})`}">${r.num}</td><td style="padding:5px 8px;border:1px solid #ddd;font-weight:600">${r.desc}</td><td style="padding:5px 8px;border:1px solid #ddd">${r.detail}</td><td style="padding:5px 8px;border:1px solid #ddd;text-align:right">${fmtNum(r.total)}</td><td style="padding:5px 8px;border:1px solid #ddd;text-align:right;font-weight:700">${r.due>0?fmtNum(r.due):''}</td><td style="padding:5px 8px;border:1px solid #ddd;text-align:center;color:#c0392b;font-weight:700;font-style:italic">${r.due_date&&r.due_date!=='—'?fmtDate(r.due_date):'—'}</td><td style="padding:5px 8px;border:1px solid #ddd;color:${r.status==='paid'?'#1a7a3a':'#888'};font-weight:${r.status==='paid'?'700':'400'}">${r.status==='paid'?'PAID':r.status==='refunded'?'REFUNDED':''}</td></tr>`).join('');rc.innerHTML=`<div class="card" style="margin-top:1rem;padding:0;overflow:hidden"><div style="display:flex;justify-content:space-between;align-items:center;padding:.75rem 1rem;border-bottom:1px solid #eee"><span style="font-weight:700;font-size:14px">👤 Statement — ${name}</span><button class="btn-secondary" onclick="printPersonStmt()"><i class="ti ti-printer"></i> Print / PDF</button></div><div id="person-stmt-printable" style="padding:1.25rem"><table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:1rem"><tr><td style="font-size:15px;font-weight:700;color:#1A6FB5">${name}</td><td style="text-align:center;font-size:14px;font-weight:700">CREDIT ACCOUNT</td><td style="text-align:right"><span style="font-size:12px;font-weight:600">Total Amount Payable</span><br><span style="background:#FFD700;padding:4px 14px;font-size:16px;font-weight:700;display:inline-block;margin-top:4px">${fmtNum(totalDue)}</span></td></tr></table><table style="width:100%;border-collapse:collapse;font-size:11.5px"><thead><tr style="background:#8fa8c8;color:#fff"><th style="padding:7px 8px;border:1px solid #aaa;text-align:left">Invoice Date</th><th style="padding:7px 8px;border:1px solid #aaa;text-align:center">Invoice Number</th><th style="padding:7px 8px;border:1px solid #aaa;text-align:left">Description</th><th style="padding:7px 8px;border:1px solid #aaa;text-align:left">Detail</th><th style="padding:7px 8px;border:1px solid #aaa;text-align:right">Total Invoice Amount</th><th style="padding:7px 8px;border:1px solid #aaa;text-align:right">Balance Due</th><th style="padding:7px 8px;border:1px solid #aaa;text-align:center">Due Date</th><th style="padding:7px 8px;border:1px solid #aaa;text-align:left">Status</th></tr></thead><tbody>${allRows.length===0?`<tr><td colspan="8" style="text-align:center;padding:2rem;color:#aaa;border:1px solid #ddd">No results found for "${name}"</td></tr>`:rows}</tbody><tfoot><tr style="background:#f0f0f0"><td colspan="4" style="padding:7px 8px;border:1px solid #ddd;font-weight:700">Total Amount Payable</td><td style="padding:7px 8px;border:1px solid #ddd;text-align:right;font-weight:700">${fmtNum(totalAmount)}</td><td style="padding:7px 8px;border:1px solid #ddd;text-align:right;font-weight:700;color:#c0392b">${fmtNum(totalDue)}</td><td colspan="2" style="border:1px solid #ddd"></td></tr></tfoot></table></div></div>`;}

function printPersonStmt(){
  const content=document.getElementById('person-stmt-printable')?.innerHTML;
  if(!content)return;
  const s=settings;
  const logoHtml=s.company_logo?`<img src="${s.company_logo}" style="height:60px;object-fit:contain" alt="Logo"/>`:`<div style="font-size:18px;font-weight:900;color:#0a3258">✈ WHITE SKY</div>`;
  const win=window.open('','_blank');
  win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Individual Statement</title><style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:Arial,sans-serif;font-size:11px;color:#222;background:#fff}
    .page{padding:20px 25px}
    .header{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:12px;border-bottom:3px solid #0a3258;margin-bottom:16px}
    .header-left{display:flex;align-items:center;gap:14px}
    .company-info{font-size:10px;color:#555;line-height:1.6}
    .company-name{font-size:13px;font-weight:700;color:#0a3258;margin-bottom:2px}
    .stmt-title{text-align:right}
    .stmt-title h1{font-size:22px;font-weight:900;color:#0a3258;letter-spacing:.04em}
    .stmt-title p{font-size:10px;color:#888;margin-top:2px}
    table{width:100%;border-collapse:collapse;font-size:10.5px}
    thead tr{background:#0a3258;color:#fff}
    th{padding:7px 8px;border:1px solid #0a3258;text-align:left;font-weight:700;font-size:10px;text-transform:uppercase;letter-spacing:.03em}
    td{padding:5px 8px;border:1px solid #ddd}
    tbody tr:nth-child(even) td{background:#f5f8fd}
    tfoot tr td{background:#e8eef5;font-weight:700;border:1px solid #bbb}
    .footer{margin-top:20px;padding-top:10px;border-top:1px solid #ddd;display:flex;justify-content:space-between;font-size:9.5px;color:#aaa}
    @media print{body{padding:0}.page{padding:10px 15px}button{display:none!important}}
  </style></head><body><div class="page">
  <div class="header">
    <div class="header-left">
      ${logoHtml}
      <div class="company-info">
        <div class="company-name">${s.company_name||'WHITE SKY TRAVEL AGENCY'}</div>
        <div>${s.company_address||''}</div>
        <div>P: ${s.company_phone_p||''} | M: ${s.company_phone_m||''}</div>
        <div>${s.company_email||''}</div>
      </div>
    </div>
    <div class="stmt-title">
      <h1>STATEMENT</h1>
      <p>OF ACCOUNT</p>
      <p style="margin-top:6px;color:#555">Date: ${new Date().toLocaleDateString('en-GB')}</p>
    </div>
  </div>
  ${content}
  <div class="footer">
    <span>${s.company_name||'WHITE SKY TRAVEL AGENCY'} — ${s.company_email||''}</span>
    <span>Generated on ${new Date().toLocaleString('en-GB')}</span>
  </div>
</div><script>window.onload=()=>window.print()<\/script></body></html>`);
  win.document.close();
}

/* PAYMENTS */
async function pagePayments(mc){const[allPay,allInv]=await Promise.all([api('GET','/api/payments'),api('GET','/api/invoices')]);const paidInv=allInv.filter(i=>i.status==='paid'||i.status==='refunded');const total=paidInv.filter(i=>i.status==='paid').reduce((a,i)=>a+i.total,0);mc.innerHTML=`<div class="page-header"><div><div class="page-title">Payments</div><div class="page-sub">${paidInv.length} invoice(s) — Collected: <strong>${fmt(total)}</strong></div></div></div><div class="card" style="padding:0;overflow:hidden"><div class="table-wrap"><table><thead><tr><th>#</th><th>Client</th><th>Date</th><th>Total</th><th>Method</th><th>Reference</th><th>Status</th><th>Actions</th></tr></thead><tbody>${paidInv.length===0?`<tr><td colspan="8"><div class="empty-state"><i class="ti ti-cash-off"></i><h3>No paid invoices</h3></div></td></tr>`:paidInv.map(i=>{const pay=allPay.find(p=>p.invoice_id===i.id);const isRefunded=i.status==='refunded';return`<tr style="${isRefunded?'background:#fffbe6':''}"><td style="font-weight:700;cursor:pointer;color:#1A6FB5" onclick="viewInvoice(${i.id})">${i.num}</td><td>${i.client_name}</td><td>${fmtDate(i.date)}</td><td style="font-weight:700;color:${isRefunded?'#b8860b':'#1a7a3a'}">${fmt(i.total,i.currency)}</td><td>${pay?.method?`<span class="pay-method-badge">${pay.method}</span>`:'—'}</td><td style="color:#aaa">${pay?.reference||'—'}</td><td>${statusBadge(i.status)}</td><td class="actions-cell">${!isRefunded?`<button class="btn-secondary" title="Mark as Refunded" onclick="markRefunded(${i.id})" style="color:#b8860b;border-color:#b8860b;font-size:11px;padding:4px 8px"><i class="ti ti-rotate-clockwise"></i> Refund</button>`:'<span style="background:#fffbe6;color:#b8860b;font-size:11px;font-weight:700;padding:3px 8px;border-radius:5px;border:1px solid #b8860b">✓ Refunded</span>'}<button class="btn-secondary" title="Mark unpaid" onclick="markUnpaidFromList(${i.id})" style="color:#c0392b;border-color:#f5c6c6;font-size:11px;padding:4px 8px"><i class="ti ti-x"></i> Unpaid</button></td></tr>`;}).join('')}</tbody></table></div></div>`;}
async function markRefunded(id){if(!confirm('Mark this invoice as refunded?'))return;await api('PATCH',`/api/invoices/${id}/status`,{status:'refunded'});toast('✅ Invoice marked as refunded','success');showPage('payments');}
async function markUnpaidFromList(id){if(!confirm('Mark this invoice as unpaid?\nThe payment will be deleted.'))return;await api('PATCH',`/api/invoices/${id}/status`,{status:'pending'});toast('Invoice marked as unpaid','error');showPage('payments');}

/* REPORTS */
async function pageReports(mc){const firstDay=new Date(new Date().getFullYear(),0,1).toISOString().split('T')[0];mc.innerHTML=`<div class="page-header"><div><div class="page-title">Reports</div><div class="page-sub">Invoice list by period</div></div></div><div class="card"><div class="card-header"><span class="card-title">Period</span></div><div class="filter-bar"><input type="date" id="rpt-from" value="${firstDay}"/><span style="color:#aaa">to</span><input type="date" id="rpt-to" value="${today()}"/><button class="btn-new" onclick="loadReport()"><i class="ti ti-search"></i> Generate</button><button class="btn-secondary" onclick="document.getElementById('rpt-from').value='';document.getElementById('rpt-to').value='';loadReport()">All periods</button></div></div><div id="report-content"><div class="loading-page"><i class="ti ti-loader spin"></i></div></div>`;loadReport();}
async function loadReport(){const from=document.getElementById('rpt-from')?.value;const to=document.getElementById('rpt-to')?.value;let url='/api/invoices';const p=[];if(from)p.push('from='+from);if(to)p.push('to='+to);if(p.length)url+='?'+p.join('&');const list=await api('GET',url);const rc=document.getElementById('report-content');if(!rc)return;const total=list.reduce((a,i)=>a+i.total,0);rc.innerHTML=`<div class="card" style="padding:0;overflow:hidden"><div class="card-header" style="padding:1rem 1.25rem"><span class="card-title">${list.length} invoice(s) — Total: <strong>${fmt(total)}</strong></span></div><div class="table-wrap"><table><thead><tr><th>#</th><th>Client</th><th>Date</th><th>Due</th><th>Total</th><th>Status</th><th>Created by</th></tr></thead><tbody>${list.length===0?`<tr><td colspan="7"><div class="empty-state"><i class="ti ti-file-off"></i><h3>No invoices for this period</h3></div></td></tr>`:list.map(i=>`<tr><td style="font-weight:700;cursor:pointer;color:#1A6FB5" onclick="viewInvoice(${i.id})">${i.num}</td><td>${i.client_name}</td><td>${fmtDate(i.date)}</td><td>${fmtDate(i.due_date)}</td><td style="font-weight:700">${fmt(i.total,i.currency)}</td><td>${statusBadge(i.status)}</td><td style="color:#aaa;font-size:12px">${i.owner_name||'—'}</td></tr>`).join('')}</tbody></table></div></div>`;}

/* SETTINGS */
async function pageSettings(mc){const isP=currentUser.role==='patron';settings=await api('GET','/api/settings');let users=[];if(isP)users=await api('GET','/api/users');const currencies=['KWD','USD','EUR','LBP','AED','SAR'];mc.innerHTML=`<div class="page-header"><div><div class="page-title">Settings</div></div></div>
<div class="card" style="max-width:640px">
  <div class="settings-label">Agency Logo</div>
  <div class="logo-upload-area" id="logo-drop" onclick="document.getElementById('logo-file').click()">
    ${settings.company_logo?`<img src="${settings.company_logo}" alt="Logo"/>`:`<div class="logo-placeholder"><i class="ti ti-photo"></i>Click to upload logo<br><span style="font-size:11px;color:#ccc">PNG, JPG — appears on invoices</span></div>`}
    <input type="file" id="logo-file" accept="image/*" ${!isP?'disabled':''} onchange="uploadLogo(this)"/>
  </div>
  ${settings.company_logo?`<button class="btn-danger" style="margin-top:8px;font-size:12px;padding:5px 10px" onclick="removeLogo()"><i class="ti ti-trash" style="vertical-align:-2px;margin-right:4px"></i>Remove logo</button>`:''}
  <div class="settings-label" style="margin-top:1.5rem">Signature Image</div>
  <div class="logo-upload-area" onclick="document.getElementById('sig-file').click()">
    ${settings.company_signature?`<img src="${settings.company_signature}" style="height:80px" alt="Signature"/>`:`<div class="logo-placeholder"><i class="ti ti-writing"></i>Click to upload signature<br><span style="font-size:11px;color:#ccc">PNG, JPG — appears on invoices</span></div>`}
    <input type="file" id="sig-file" accept="image/*" ${!isP?'disabled':''} onchange="uploadSignature(this)"/>
  </div>
  ${settings.company_signature?`<button class="btn-danger" style="margin-top:8px;font-size:12px;padding:5px 10px" onclick="removeSignature()"><i class="ti ti-trash" style="vertical-align:-2px;margin-right:4px"></i>Remove signature</button>`:''}
  <div class="settings-label" style="margin-top:1.5rem">Stamp Image</div>
  <div class="logo-upload-area" onclick="document.getElementById('stamp-file').click()">
    ${settings.company_stamp?`<img src="${settings.company_stamp}" style="height:80px" alt="Stamp"/>`:`<div class="logo-placeholder"><i class="ti ti-circle-check"></i>Click to upload stamp<br><span style="font-size:11px;color:#ccc">PNG, JPG — appears on invoices</span></div>`}
    <input type="file" id="stamp-file" accept="image/*" ${!isP?'disabled':''} onchange="uploadStamp(this)"/>
  </div>
  ${settings.company_stamp?`<button class="btn-danger" style="margin-top:8px;font-size:12px;padding:5px 10px" onclick="removeStamp()"><i class="ti ti-trash" style="vertical-align:-2px;margin-right:4px"></i>Remove stamp</button>`:''}
  <div class="settings-label" style="margin-top:1.5rem">Agency Information</div>
  <div class="form-grid2" style="gap:14px">
    <div class="form-group full"><label class="form-label">Name</label><input class="form-input" id="s-name" value="${settings.company_name||''}" ${!isP?'disabled':''}/></div>
    <div class="form-group full"><label class="form-label">Address</label><input class="form-input" id="s-addr" value="${settings.company_address||''}" ${!isP?'disabled':''}/></div>
    <div class="form-group"><label class="form-label">Phone P</label><input class="form-input" id="s-phone-p" value="${settings.company_phone_p||''}" ${!isP?'disabled':''}/></div>
    <div class="form-group"><label class="form-label">Phone M</label><input class="form-input" id="s-phone-m" value="${settings.company_phone_m||''}" ${!isP?'disabled':''}/></div>
    <div class="form-group full"><label class="form-label">Email</label><input class="form-input" id="s-email" value="${settings.company_email||''}" ${!isP?'disabled':''}/></div>
  </div>
  <div class="settings-label">Default Billing</div>
  <div class="form-grid2" style="gap:14px">
    <div class="form-group"><label class="form-label">Currency</label><select class="form-input" id="s-currency" ${!isP?'disabled':''}>${currencies.map(c=>`<option ${settings.invoice_currency===c?'selected':''}>${c}</option>`).join('')}</select></div>
    <div class="form-group"><label class="form-label">Payment terms (days)</label><input type="number" class="form-input" id="s-due-days" value="${settings.invoice_due_days||7}" ${!isP?'disabled':''}/></div>
    <div class="form-group full"><label class="form-label">Invoice footer</label><textarea class="form-input" id="s-footer" rows="3" ${!isP?'disabled':''}>${settings.invoice_footer||''}</textarea></div>
  </div>
  ${isP?`<button class="btn-save" onclick="saveSettings()">Save Settings</button>`:`<div class="info-box"><i class="ti ti-lock"></i> Only the owner can modify these settings.</div>`}
</div>
${isP?`<div class="card" style="max-width:640px"><div class="card-header"><span class="card-title">Users</span><button class="btn-new" onclick="openUserModal()"><i class="ti ti-plus"></i> Add</button></div>${users.map(u=>`<div class="access-row"><div style="display:flex;align-items:center;gap:12px"><div class="user-avatar" style="width:38px;height:38px;font-size:13px;background:${u.role==='patron'?'#deeeff':'#fff4e0'};color:${u.role==='patron'?'#0a3258':'#a05c00'}">${initials(u.display_name)}</div><div><div style="font-size:14px;font-weight:700">${u.display_name}</div><div style="font-size:12px;color:#aaa">${u.username} — ${u.role==='patron'?'Administrator':'Staff'}</div></div></div><div style="display:flex;align-items:center;gap:8px"><span class="badge ${u.role==='patron'?'badge-paid':'badge-pending'}">${u.role==='patron'?'Admin':'Staff'}</span><button class="action-btn" onclick="openUserModal(${u.id})"><i class="ti ti-edit"></i></button>${u.id!==currentUser.id?`<button class="action-btn danger" onclick="deleteUser(${u.id})"><i class="ti ti-trash"></i></button>`:''}</div></div>`).join('')}</div>`:''}`;}

async function saveSettings(){const body={company_name:document.getElementById('s-name')?.value.trim(),company_address:document.getElementById('s-addr')?.value.trim(),company_phone_p:document.getElementById('s-phone-p')?.value.trim(),company_phone_m:document.getElementById('s-phone-m')?.value.trim(),company_email:document.getElementById('s-email')?.value.trim(),invoice_currency:document.getElementById('s-currency')?.value,invoice_due_days:document.getElementById('s-due-days')?.value,invoice_footer:document.getElementById('s-footer')?.value};await api('POST','/api/settings',body);settings=await api('GET','/api/settings');toast('✅ Settings saved','success');}
function uploadLogo(input){const file=input.files[0];if(!file)return;const reader=new FileReader();reader.onload=async(e)=>{await api('POST','/api/settings',{company_logo:e.target.result});settings.company_logo=e.target.result;toast('✅ Logo updated','success');showPage('settings');};reader.readAsDataURL(file);}
async function removeLogo(){await api('POST','/api/settings',{company_logo:''});settings.company_logo='';toast('Logo removed');showPage('settings');}
function uploadSignature(input){const file=input.files[0];if(!file)return;const reader=new FileReader();reader.onload=async(e)=>{await api('POST','/api/settings',{company_signature:e.target.result});settings.company_signature=e.target.result;toast('✅ Signature updated','success');showPage('settings');};reader.readAsDataURL(file);}
async function removeSignature(){await api('POST','/api/settings',{company_signature:''});settings.company_signature='';toast('Signature removed');showPage('settings');}
function uploadStamp(input){const file=input.files[0];if(!file)return;const reader=new FileReader();reader.onload=async(e)=>{await api('POST','/api/settings',{company_stamp:e.target.result});settings.company_stamp=e.target.result;toast('✅ Stamp updated','success');showPage('settings');};reader.readAsDataURL(file);}
async function removeStamp(){await api('POST','/api/settings',{company_stamp:''});settings.company_stamp='';toast('Stamp removed');showPage('settings');}

/* USERS */
function openUserModal(id){const isEdit=!!id;document.getElementById('modal-user-title').textContent=isEdit?'Edit User':'New User';document.getElementById('edit-user-id').value=id||'';document.getElementById('btn-save-user').textContent=isEdit?'Update':'Create';document.getElementById('u-pass-hint').style.display=isEdit?'':'none';document.getElementById('u-display').value='';document.getElementById('u-username').value='';document.getElementById('u-password').value='';document.getElementById('u-role').value='employe';document.getElementById('u-username').disabled=!!isEdit;openModal('modal-user');}
document.getElementById('btn-save-user').addEventListener('click',async()=>{const id=document.getElementById('edit-user-id').value;const body={display_name:document.getElementById('u-display').value.trim(),username:document.getElementById('u-username').value.trim(),password:document.getElementById('u-password').value,role:document.getElementById('u-role').value};if(!id&&(!body.username||!body.password)){toast('All fields are required','error');return;}const r=id?await api('PUT',`/api/users/${id}`,body):await api('POST','/api/users',body);if(r&&r.error){toast(r.error,'error');return;}closeModal('modal-user');toast('✅ User '+(id?'updated':'created'),'success');showPage('settings');});
async function deleteUser(id){if(!confirm('Delete this user?'))return;await api('DELETE',`/api/users/${id}`);toast('User deleted');showPage('settings');}






/* PDF IMPORT */
async function openPdfImport(){
  // Load clients first
  if(!allClients.length) allClients = await api('GET','/api/clients');
  document.getElementById('pdf-preview').style.display='none';
  document.getElementById('pdf-error').style.display='none';
  document.getElementById('btn-save-pdf').style.display='none';
  document.getElementById('pdf-file-input').value='';
  // Populate client dropdown
  const sel = document.getElementById('pdf-client-select');
  if(sel) sel.innerHTML = '<option value="">-- Select client (optional) --</option>' + allClients.map(c=>`<option value="${c.id}" data-name="${c.name}" data-addr="${c.address||''}" data-phone="${c.phone||''}" data-fax="${c.fax||''}">${c.name}</option>`).join('');
  openModal('modal-import-pdf');
}

function fillPdfClient(sel){
  const o = sel.querySelector(`option[value="${sel.value}"]`);
  if(!o||!sel.value) return;
  document.getElementById('pdf-client').value = o.dataset.name||'';
}

async function handlePdfImport(input){
  const file=input.files[0];
  if(!file)return;
  const errEl=document.getElementById('pdf-error');
  errEl.style.display='none';
  try{
    const arrayBuffer=await file.arrayBuffer();
    const pdf=await pdfjsLib.getDocument({data:arrayBuffer}).promise;
    let text='';
    for(let i=1;i<=pdf.numPages;i++){
      const page=await pdf.getPage(i);
      const content=await page.getTextContent();
      text+=content.items.map(s=>s.str).join(' ')+'\n';
    }
    console.log('PDF TEXT:', text);
    parsePdfText(text);
  }catch(e){
    errEl.textContent='Error reading PDF: '+e.message;
    errEl.style.display='block';
  }
}

function parsePdfText(text) {
  const errEl = document.getElementById('pdf-error');
  errEl.style.display = 'none';
  errEl.style.cssText = '';

  try {
    const tokens = text.split(/  +/).map(t => t.replace(/ /g, '').trim()).filter(Boolean);

    // Invoice number
    const numIdx = tokens.indexOf('#:');
    const num = numIdx !== -1 ? 'FAC-' + tokens[numIdx + 1] : '';

    // Date
    const dateIdx = tokens.findIndex(t => t === 'date:');
    let date = '';
    if (dateIdx !== -1) {
      const raw = tokens[dateIdx + 1];
      const parts = raw.split('/');
      if (parts.length === 3) date = parts[2] + '-' + parts[1] + '-' + parts[0].padStart(2, '0');
    }

    // Client
    const toIdx = tokens.findIndex(t => t === 'to:');
    const clientFromPdf = toIdx !== -1 ? tokens[toIdx + 1] : '';

    // Currency detection
    const currencyMap = { 'KWD':'KWD', 'USD':'USD', 'EUR':'EUR', 'LBP':'LBP', 'AED':'AED', 'SAR':'SAR' };
    let currency = 'KWD';
    for(const cur of Object.keys(currencyMap)){
      if(tokens.includes(cur)){ currency = cur; break; }
    }

    // Total
    let total = '0';
    for (let i = tokens.length - 1; i >= 0; i--) {
      if (tokens[i] === 'TOTAL') {
        const next = tokens[i+1]||'';
        const next2 = tokens[i+2]||'';
        if(next2 === currency || next2.includes(currency)){ total = next.replace(currency,''); break; }
        if(/^\d/.test(next)){ total = next.replace(currency,''); break; }
      }
    }

    // Rows
    const priceHeaderIdx = tokens.indexOf('Price');
    const subtotalIdx = tokens.findIndex((t, i) => i > priceHeaderIdx && t === 'Invoice' && tokens[i+1] === 'Subtotal');
    const rowTokens = tokens.slice(priceHeaderIdx + 1, subtotalIdx !== -1 ? subtotalIdx : undefined);

    const rows = [];
    let i = 0;
    while (i < rowTokens.length) {
      let pnr = rowTokens[i]; i++;
if (!pnr || pnr === currency || pnr === 'TOTAL') break;
// Si le token suivant commence par // c'est une suite du PNR
while (rowTokens[i] && rowTokens[i].startsWith('//')) {
  pnr += ' ' + rowTokens[i]; i++;
}
const destination = rowTokens[i] || ''; i++;
      




      let passengerParts = [];
      while (i < rowTokens.length) {
        const t = rowTokens[i];
        if (!t || t === currency || new RegExp('^\\d+'+currency+'$').test(t)) break;
        if (t.match(/^\d{1,2}[\/]\d{2}/)) break;
        const next = rowTokens[i + 1];
        if (next && (next.match(/^\d{1,2}[\/]\d{2}/) || next === currency || new RegExp('^\\d+'+currency+'$').test(next))) {
          if (t === 'hotel') { i++; break; }
          passengerParts.push(t); i++;
          break;
        }
        passengerParts.push(t); i++;
      }

      const airline = passengerParts.pop() || '';
      const passenger = passengerParts.join(' ');
      const travel_date = rowTokens[i] || ''; i++;

      let priceRaw = rowTokens[i] || '0'; i++;
      const priceClean = priceRaw.replace(currency,'');
      const price = parseFloat(priceClean) || 0;
      if (rowTokens[i] === currency) i++;

      rows.push({ pnr, destination, passenger, airline, airlineRef: airline, travel_date, price });
    }

    // Fill form
    document.getElementById('pdf-num').value = num;
    document.getElementById('pdf-date').value = date;
    document.getElementById('pdf-currency').value = currency;
    document.getElementById('pdf-total').value = total;

    // Client: use dropdown selection if set, otherwise from PDF
    const selClient = document.getElementById('pdf-client-select');
    const selVal = selClient ? selClient.value : '';
    if(!selVal) document.getElementById('pdf-client').value = clientFromPdf;

    if (rows.length > 0) {
      document.getElementById('pdf-pnr').value = rows[0].pnr;
      document.getElementById('pdf-destination').value = rows[0].destination;
      document.getElementById('pdf-passenger').value = rows[0].passenger;
      document.getElementById('pdf-airline').value = rows[0].airline;
      document.getElementById('pdf-travel-date').value = rows[0].travel_date;
    }

    window._pdfImportRows = rows;
    document.getElementById('pdf-preview').style.display = 'block';
    document.getElementById('btn-save-pdf').style.display = 'inline-flex';

    if (!num && !clientFromPdf) {
      errEl.textContent = 'Could not extract data. Please fill in manually.';
      errEl.style.display = 'block';
    } else if (rows.length > 1) {
      errEl.style.cssText = 'display:block;color:#1a7a3a;background:#e6f9ee;border:1px solid #a3d9b1;padding:10px;border-radius:7px;font-size:13px;margin-top:10px';
      errEl.textContent = '✅ ' + rows.length + ' rows detected. All will be imported.';
    }

  } catch(e) {
    errEl.textContent = 'Parsing error: ' + e.message;
    errEl.style.display = 'block';
  }
}

async function savePdfInvoice() {
  const num    = document.getElementById('pdf-num').value.trim();
  const date   = document.getElementById('pdf-date').value;
  const status = document.getElementById('pdf-status').value;
  const currency = document.getElementById('pdf-currency').value || 'KWD';

  // Client: from dropdown or manual field
  const selClient = document.getElementById('pdf-client-select');
  const clientId = selClient ? selClient.value || null : null;
  const clientOption = selClient ? selClient.querySelector(`option[value="${clientId}"]`) : null;
  const clientName = document.getElementById('pdf-client').value.trim();
  const clientAddr = clientOption ? clientOption.dataset.addr||'' : '';
  const clientPhone = clientOption ? clientOption.dataset.phone||'' : '';
  const clientFax = clientOption ? clientOption.dataset.fax||'' : '';

  if (!num || !clientName) { toast('Invoice # and client are required', 'error'); return; }

  const dueDate = '';

  const rows = (window._pdfImportRows && window._pdfImportRows.length > 0)
    ? window._pdfImportRows
    : [{
        pnr:         document.getElementById('pdf-pnr').value.trim(),
        destination: document.getElementById('pdf-destination').value.trim(),
        passenger:   document.getElementById('pdf-passenger').value.trim(),
        airline:     document.getElementById('pdf-airline').value.trim(),
        airlineRef:  document.getElementById('pdf-airline').value.trim(),
        travel_date: document.getElementById('pdf-travel-date').value.trim(),
        price:       parseFloat(document.getElementById('pdf-total').value) || 0
      }];

  const subtotal = rows.reduce((a, r) => a + (parseFloat(r.price) || 0), 0);

  const body = {
    num, client_id: clientId, client_name: clientName,
    client_address: clientAddr, client_phone: clientPhone, client_fax: clientFax,
    status, date, due_date: dueDate, due_days: 7,
    subtotal, tax: 0, deposit: 0, total: subtotal,
    currency, notes: '', rows
  };

  const r = await api('POST', '/api/invoices', body);
  if (r && r.error) { toast(r.error, 'error'); return; }
  window._pdfImportRows = null;
  toast('✅ Invoice imported!', 'success');
  closeModal('modal-import-pdf');
  showPage('invoices');
}





/* KEYBOARD */
document.addEventListener('keydown',e=>{if(e.key==='Escape')document.querySelectorAll('.modal-bg:not(.hidden)').forEach(m=>m.classList.add('hidden'));});
document.querySelectorAll('.modal-bg').forEach(m=>m.addEventListener('click',e=>{if(e.target===m)m.classList.add('hidden');}));

init();
