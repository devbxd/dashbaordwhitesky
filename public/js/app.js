let currentUser=null,settings={},allClients=[],allInvoices=[],allQuotes=[],allPayments=[],editInvRows=[],editQuoteRows=[],_editInvId=null;
let allHotels=[],allVisas=[],allGroups=[],_editHotelId=null,_editVisaId=null,_editGroupId=null,editGroupTravelers=[];
let allPassports=[],_editPassportId=null,_editVisaFile=null,_editPassportFile=null;

/* ─── LANGUAGE (FR/EN/AR) ───────────────────────────────────────────────
   No external service, no Google — a local dictionary swapped into the DOM after
   every render. Works offline, works identically in the desktop app (same page). */
let currentLang='en';
const I18N={
  fr:{
    "Dashboard":"Tableau de bord","Clients":"Clients","Catalog":"Catalogue","Quotes":"Devis","New Quote":"Nouveau devis",
    "Invoices":"Factures","Invoice":"Facture","New Invoice":"Nouvelle facture","Edit Invoice":"Modifier la facture",
    "Ticket Sales":"Ventes de billets","New Ticket":"Nouveau billet","Services":"Services","New Service":"Nouveau service",
    "Payments":"Paiements","Credit Notes":"Notes de crédit","New Credit Note":"Nouvelle note de crédit","Statements":"Relevés","Reports":"Rapports","Settings":"Paramètres",
    "Account":"Compte","Finance":"Finance","Invoicing":"Facturation","INVOICING SYSTEM":"SYSTÈME DE FACTURATION","Invoicing System":"Système de facturation",
    "Dashboard ":"Tableau de bord ","Logout":"Déconnexion","Administrator":"Administrateur","Staff":"Employé","Demo":"Démo","CEO":"PDG",
    "New Client":"Nouveau client","New Item":"Nouvel article","New User":"Nouvel utilisateur","Edit Client":"Modifier le client","Edit Quote":"Modifier le devis",
    "Save":"Enregistrer","Save Draft":"Enregistrer le brouillon","Cancel":"Annuler","Delete":"Supprimer","Edit":"Modifier","Back":"Retour",
    "Print / PDF":"Imprimer / PDF","Confirm Payment":"Confirmer le paiement","Confirm":"Confirmer","Search":"Rechercher","Generate":"Générer",
    "All periods":"Toutes les périodes","Copy link":"Copier le lien","Send":"Envoyer","Update":"Mettre à jour","Create":"Créer","Add":"Ajouter","Add row":"Ajouter une ligne",
    "View all":"Voir tout","Quick Actions":"Actions rapides","Import PDF":"Importer un PDF","Sign In":"Se connecter","Username":"Nom d'utilisateur","Password":"Mot de passe",
    "Client":"Client","Currency":"Devise","Date":"Date","Due Date":"Date d'échéance","Valid until":"Valable jusqu'au","Status":"Statut",
    "Payment terms (days)":"Délai de paiement (jours)","Name":"Nom","Email":"Email","Phone":"Téléphone","Fax":"Fax","Address":"Adresse",
    "City / Country":"Ville / Pays","Type":"Type","Notes":"Notes","Total":"Total","Subtotal":"Sous-total","Tax":"Taxe","Tax Rate":"Taux de taxe",
    "Deposit received":"Acompte reçu","Deposit Received":"Acompte reçu","Balance due":"Solde dû","Amount due":"Montant dû","Amount received":"Montant reçu",
    "Payment method":"Méthode de paiement","Reference":"Référence","Already paid":"Déjà payé","Client (Bill to)":"Client (Facturé à)","Bill to":"Facturé à",
    "Draft":"Brouillon","Pending":"En attente","Paid":"Payée","Overdue":"En retard","Sent":"Envoyé","Accepted":"Accepté","Refused":"Refusé",
    "Refunded":"Remboursée","Partially Paid":"Partiellement payée","Unpaid":"Impayé","All statuses":"Tous les statuts",
    "#":"N°","Actions":"Actions","Created by":"Créé par","Method":"Méthode","Amount":"Montant","Category":"Catégorie","Price":"Prix",
    "No invoices":"Aucune facture","No clients":"Aucun client","No quotes":"Aucun devis","No items yet":"Aucun article pour l'instant",
    "No credit notes":"Aucune note de crédit","No paid invoices":"Aucune facture payée","No tickets":"Aucun billet",
    "Collected":"Encaissé","Total Invoices":"Total factures","Outstanding Invoices":"Factures en attente","Overdue":"En retard",
    "Information":"Informations","Company Logo":"Logo de l'entreprise","Signature Image":"Image de signature","Stamp Image":"Image du tampon",
    "Company Information":"Informations de l'entreprise","Default Billing":"Facturation par défaut","Users":"Utilisateurs","Language":"Langue",
    "Invoice footer":"Pied de page de la facture","Remove logo":"Supprimer le logo","Remove signature":"Supprimer la signature","Remove stamp":"Supprimer le tampon",
    "Save Settings":"Enregistrer les paramètres","Client, number…":"Client, numéro…","Search…":"Rechercher…","Passengers / Services":"Passagers / Services",
    "Mark as Paid":"Marquer comme payée","Record Payment":"Enregistrer un paiement","Mark Unpaid":"Marquer comme impayée","Issue Credit Note":"Émettre une note de crédit",
    "Email to Client":"Envoyer par email","Record Another Payment":"Enregistrer un autre paiement","Reports · Period":"Rapports · Période",
    "Revenue by month":"Revenus par mois","Top clients":"Meilleurs clients","Investment summary":"Résumé","Welcome back,":"Bon retour,",
    "Select client":"Sélectionner un client","-- Select --":"-- Sélectionner --","Passenger":"Passager","Destination":"Destination","Airline":"Compagnie",
    "PNR #":"N° PNR","Travel Date":"Date de voyage","Client (Bill to) *":"Client (Facturé à) *","Payment method *":"Méthode de paiement *",
    "Due":"Échéance","No outstanding invoices":"Aucune facture en attente","Invoicing":"Facturation","Total invoices":"Total factures",
    "Yes":"Oui","No":"Non","Loading…":"Chargement…"
  },
  ar:{
    "Dashboard":"لوحة التحكم","Clients":"العملاء","Catalog":"الكتالوج","Quotes":"عروض الأسعار","New Quote":"عرض سعر جديد",
    "Invoices":"الفواتير","Invoice":"فاتورة","New Invoice":"فاتورة جديدة","Edit Invoice":"تعديل الفاتورة",
    "Ticket Sales":"مبيعات التذاكر","New Ticket":"تذكرة جديدة","Services":"الخدمات","New Service":"خدمة جديدة",
    "Payments":"المدفوعات","Credit Notes":"إشعارات دائن","New Credit Note":"إشعار دائن جديد","Statements":"كشوف الحساب","Reports":"التقارير","Settings":"الإعدادات",
    "Account":"الحساب","Finance":"المالية","Invoicing":"الفوترة","INVOICING SYSTEM":"نظام الفوترة","Invoicing System":"نظام الفوترة",
    "Logout":"تسجيل الخروج","Administrator":"مدير","Staff":"موظف","Demo":"تجريبي","CEO":"الرئيس التنفيذي",
    "New Client":"عميل جديد","New Item":"عنصر جديد","New User":"مستخدم جديد","Edit Client":"تعديل العميل","Edit Quote":"تعديل عرض السعر",
    "Save":"حفظ","Save Draft":"حفظ كمسودة","Cancel":"إلغاء","Delete":"حذف","Edit":"تعديل","Back":"رجوع",
    "Print / PDF":"طباعة / PDF","Confirm Payment":"تأكيد الدفع","Confirm":"تأكيد","Search":"بحث","Generate":"إنشاء",
    "All periods":"كل الفترات","Copy link":"نسخ الرابط","Send":"إرسال","Update":"تحديث","Create":"إنشاء","Add":"إضافة","Add row":"إضافة سطر",
    "View all":"عرض الكل","Quick Actions":"إجراءات سريعة","Import PDF":"استيراد PDF","Sign In":"تسجيل الدخول","Username":"اسم المستخدم","Password":"كلمة المرور",
    "Client":"العميل","Currency":"العملة","Date":"التاريخ","Due Date":"تاريخ الاستحقاق","Valid until":"صالح حتى","Status":"الحالة",
    "Payment terms (days)":"مدة السداد (أيام)","Name":"الاسم","Email":"البريد الإلكتروني","Phone":"الهاتف","Fax":"فاكس","Address":"العنوان",
    "City / Country":"المدينة / الدولة","Type":"النوع","Notes":"ملاحظات","Total":"الإجمالي","Subtotal":"المجموع الفرعي","Tax":"الضريبة","Tax Rate":"نسبة الضريبة",
    "Deposit received":"الدفعة المقدمة","Deposit Received":"الدفعة المقدمة","Balance due":"الرصيد المستحق","Amount due":"المبلغ المستحق","Amount received":"المبلغ المستلم",
    "Payment method":"طريقة الدفع","Reference":"المرجع","Already paid":"المدفوع مسبقاً","Client (Bill to)":"العميل (يُفوتر إلى)","Bill to":"يُفوتر إلى",
    "Draft":"مسودة","Pending":"قيد الانتظار","Paid":"مدفوعة","Overdue":"متأخرة","Sent":"مُرسل","Accepted":"مقبول","Refused":"مرفوض",
    "Refunded":"مُرجعة","Partially Paid":"مدفوعة جزئياً","Unpaid":"غير مدفوع","All statuses":"كل الحالات",
    "#":"#","Actions":"إجراءات","Created by":"أنشأه","Method":"الطريقة","Amount":"المبلغ","Category":"الفئة","Price":"السعر",
    "No invoices":"لا توجد فواتير","No clients":"لا يوجد عملاء","No quotes":"لا توجد عروض أسعار","No items yet":"لا توجد عناصر بعد",
    "No credit notes":"لا توجد إشعارات دائن","No paid invoices":"لا توجد فواتير مدفوعة","No tickets":"لا توجد تذاكر",
    "Collected":"المُحصّل","Total Invoices":"إجمالي الفواتير","Outstanding Invoices":"الفواتير المستحقة",
    "Information":"معلومات","Company Logo":"شعار الشركة","Signature Image":"صورة التوقيع","Stamp Image":"صورة الختم",
    "Company Information":"معلومات الشركة","Default Billing":"الفوترة الافتراضية","Users":"المستخدمون","Language":"اللغة",
    "Invoice footer":"تذييل الفاتورة","Remove logo":"إزالة الشعار","Remove signature":"إزالة التوقيع","Remove stamp":"إزالة الختم",
    "Save Settings":"حفظ الإعدادات","Client, number…":"العميل، الرقم…","Search…":"بحث…","Passengers / Services":"الركاب / الخدمات",
    "Mark as Paid":"وضع علامة كمدفوعة","Record Payment":"تسجيل دفعة","Mark Unpaid":"وضع علامة كغير مدفوعة","Issue Credit Note":"إصدار إشعار دائن",
    "Email to Client":"إرسال بالبريد للعميل","Record Another Payment":"تسجيل دفعة أخرى",
    "Revenue by month":"الإيرادات الشهرية","Top clients":"أفضل العملاء","Investment summary":"الملخص","Welcome back,":"مرحباً بعودتك،",
    "Select client":"اختر العميل","-- Select --":"-- اختر --","Passenger":"الراكب","Destination":"الوجهة","Airline":"شركة الطيران",
    "PNR #":"رقم الحجز","Travel Date":"تاريخ السفر","Client (Bill to) *":"العميل (يُفوتر إلى) *","Payment method *":"طريقة الدفع *",
    "Due":"تاريخ الاستحقاق","No outstanding invoices":"لا توجد فواتير مستحقة","Invoicing":"الفوترة","Total invoices":"إجمالي الفواتير",
    "Yes":"نعم","No":"لا","Loading…":"جارٍ التحميل…"
  }
};
// Every text node remembers its own original English wording the first time it's seen
// (cached on the node object itself) — every re-translation always starts fresh from
// that baseline, so switching FR -> AR -> EN in the same session never leaves stale
// translated leftovers behind, however many times you flip languages.
function _translateTextNode(node){
  if(!node._enOriginal){const t=node.textContent.trim();if(!t)return;node._enOriginal=node.textContent;}
  const raw=node._enOriginal,trimmed=raw.trim();
  if(currentLang==='en'){node.textContent=raw;return;}
  const dict=I18N[currentLang];
  node.textContent=(dict&&dict[trimmed])?raw.replace(trimmed,dict[trimmed]):raw;
}
function translateNode(root){
  if(!root)return;
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,null);
  const nodes=[];let n;while(n=walker.nextNode())nodes.push(n);
  nodes.forEach(_translateTextNode);
  if(root.querySelectorAll&&currentLang!=='en'){
    const dict=I18N[currentLang];
    if(dict){
      root.querySelectorAll('[placeholder]').forEach(el=>{const t=el.getAttribute('placeholder');if(dict[t])el.setAttribute('placeholder',dict[t]);});
      root.querySelectorAll('[title]').forEach(el=>{const t=el.getAttribute('title');if(dict[t])el.setAttribute('title',dict[t]);});
    }
  }
}
function applyLanguage(lang){
  currentLang=lang||'en';
  document.documentElement.setAttribute('lang',currentLang);
  document.documentElement.setAttribute('dir',currentLang==='ar'?'rtl':'ltr');
  translateNode(document.body);
  // Re-render the current page from its source template so any page-specific content
  // (not just the static sidebar) rebuilds cleanly in the new language too.
  const activePage=document.querySelector('.nav-item.active')?.dataset.page;
  if(activePage&&currentUser)showPage(activePage);
}
const _langObserver=new MutationObserver(muts=>{
  muts.forEach(m=>{
    m.addedNodes.forEach(node=>{
      if(node.nodeType===1)translateNode(node);
      else if(node.nodeType===3)_translateTextNode(node);
    });
  });
});
document.addEventListener('DOMContentLoaded',()=>{_langObserver.observe(document.body,{childList:true,subtree:true,characterData:true});});

async function api(method,url,body){const o={method,headers:{'Content-Type':'application/json'}};if(body!==undefined)o.body=JSON.stringify(body);const r=await fetch(url,o);const data=await r.json();if(data&&data.deactivated)forceLogout(data.error);return data;}
function forceLogout(message){
  currentUser=null;
  document.getElementById('app-screen').classList.add('hidden');
  document.getElementById('welcome-overlay').classList.add('hidden');
  const loginScreen=document.getElementById('login-screen');
  loginScreen.style.display='flex';
  toggleAuthMode('signin');
  const err=document.getElementById('login-error');
  err.textContent=message||'Your session has ended.';
  err.style.display='block';
  document.getElementById('login-pass').value='';
}

function toast(msg,type=''){const t=document.getElementById('toast');t.textContent=msg;t.className='toast show '+type;clearTimeout(t._t);t._t=setTimeout(()=>t.className='toast hidden',3000);}
function openModal(id){document.getElementById(id).classList.remove('hidden');}
function closeModal(id){document.getElementById(id).classList.add('hidden');}

function fmt(n,cur){const c=cur||settings.invoice_currency||'KWD';return c+' '+Number(n||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});}
function fmtDate(d){if(!d)return'—';const clean=d.split('T')[0];const p=clean.split('-');return p.length===3?p[2]+'/'+p[1]+'/'+p[0]:d;}
function today(){return new Date().toISOString().split('T')[0];}
function addDays(d,n){const dt=new Date(d);dt.setDate(dt.getDate()+n);return dt.toISOString().split('T')[0];}
function initials(n){return(n||'').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();}
function statusBadge(s){const cls={paid:'badge-paid',pending:'badge-pending',overdue:'badge-overdue',draft:'badge-draft',sent:'badge-sent',accepted:'badge-accepted',refused:'badge-refused',refunded:'badge-refunded',partial:'badge-partial'};const lbl={paid:'Paid',pending:'Pending',overdue:'Overdue',draft:'Draft',sent:'Sent',accepted:'Accepted',refused:'Refused',refunded:'Refunded',partial:'Partially Paid'};return`<span class="badge ${cls[s]||'badge-draft'}">${lbl[s]||s}</span>`;}
function tagBadge(t){const cls={VIP:'badge-vip',New:'badge-new',Regular:'badge-regular'};return`<span class="badge ${cls[t]||'badge-draft'}">${t||'New'}</span>`;}

/* DOMAIN LABELS — lets the same invoice/ticket engine speak "travel" for White Sky or
   "services" for M&S Cyber Systems, purely as a UI relabeling (same DB columns underneath). */
function isCyber(){return !!(currentUser&&currentUser.role==='cyber');}
function isClient(){return !!(currentUser&&currentUser.role==='client');}
function dl(){
  if(isCyber())return{
    ticketsNav:'Services',newTicketNav:'New Service',ticketsTitle:'Services',newTicketTitle:'New Service',
    ticketNumLabel:'Reference #',colPnr:'Reference',colDest:'Project',colPassenger:'Description',colAirline:'Category',colDate:'Delivery Date',
    phPnr:'REF-001',phDest:'Project name',phPassenger:'Service description',phAirline:'Category',phDate:'2026-09-15',
    pnrFieldLabel:'Reference',companyFieldLabel:'Client reference',destFieldLabel:'Project',passengerFieldLabel:'Service description',
    systemFieldLabel:'Delivery date',netLabel:'Internal cost',sellLabel:'Selling price',
    passengerHeader:'Description',airlineHeader:'Category',importPdf:false,
    tktCompanyRow:'Company (Client)',tktContactLabel:'Contact name',tktContactPh:'Full name',
    tktRefLabel:'Reference',tktRefPh:'REF-001',tktSysPnrLabel:'Client company / project',tktSysPnrPh:'e.g. Acme Corp',
    tktCategoryLabel:'Service category',tktCategoryPh:'e.g. Penetration testing, Web app, Mobile app',
    tktProjectLabel:'Project name',tktProjectPh:'e.g. Corporate website',tktDeliveryLabel:'Delivery date',tktDeliveryPh:'e.g. 2026-09-15'
  };
  return{
    ticketsNav:'Ticket Sales',newTicketNav:'New Ticket',ticketsTitle:'Ticket Sales',newTicketTitle:'New Ticket',
    ticketNumLabel:'Ticket #',colPnr:'PNR #',colDest:'Destination',colPassenger:'Passenger',colAirline:'Airline',colDate:'Travel Date',
    phPnr:'UDXAY4',phDest:'BEY/DXB/BEY',phPassenger:'FULL NAME',phAirline:'ME, Hilton…',phDate:'29/12-31/12/24',
    pnrFieldLabel:'Airline PNR',companyFieldLabel:'System PNR',destFieldLabel:'Destination',passengerFieldLabel:'Passenger Name',
    systemFieldLabel:'System Issue',netLabel:'Net Price',sellLabel:'Selling Price',
    passengerHeader:'Passenger',airlineHeader:'Airline',importPdf:true,
    tktCompanyRow:'Company (Client)',tktContactLabel:'Passenger Name',tktContactPh:'FULL NAME',
    tktRefLabel:'Airline PNR',tktRefPh:'UDXAY4',tktSysPnrLabel:'System PNR',tktSysPnrPh:'e.g. Amadeus, Sabre',
    tktCategoryLabel:'Airline',tktCategoryPh:'e.g. ME, QR, EK',
    tktProjectLabel:'Destination',tktProjectPh:'e.g. BEY/DXB/BEY',tktDeliveryLabel:'System Issue',tktDeliveryPh:'e.g. Amadeus, Sabre'
  };
}

/* AUTH */
/* Login screen branding — this device remembers the last account that signed in here
   (localStorage, per install/browser) so a white-labeled desktop build shows the
   client's own name and logo instead of a hardcoded company, from the second launch on. */
function applyLoginBrandingFromCache(){
  try{
    const name=localStorage.getItem('brand_name');
    const logo=localStorage.getItem('brand_logo');
    if(name)document.getElementById('login-company-name').textContent=name;
    if(logo)document.getElementById('login-logo-circle').innerHTML=`<img src="${logo}" style="width:100%;height:100%;object-fit:contain;border-radius:16px"/>`;
  }catch(e){}
}
function cacheLoginBranding(){
  try{
    localStorage.setItem('brand_name',settings.company_name||currentUser.display_name||'');
    if(settings.company_logo)localStorage.setItem('brand_logo',settings.company_logo);
  }catch(e){}
}
applyLoginBrandingFromCache();
// Self-signup is only offered inside the desktop app (main.js loads the page with
// ?client=desktop) — the plain website never shows it, so a random visitor can't just
// register themselves. The real access control is the invite code required server-side
// (see /api/signup) — without a valid, unused code the form doesn't get anyone anywhere,
// so the link itself can stay visible every time.
function signupAllowedHere(){
  return new URLSearchParams(location.search).get('client')==='desktop';
}
async function init(){const{user}=await api('GET','/api/me');settings=await api('GET','/api/settings').catch(()=>({}));applyLanguage(settings.lang);if(user){currentUser=user;cacheLoginBranding();showApp();showPage('dashboard');}else{document.getElementById('login-screen').style.display='flex';if(signupAllowedHere())document.getElementById('signup-toggle-hint').classList.remove('hidden');translateNode(document.getElementById('login-screen'));}}
document.getElementById('btn-login').addEventListener('click',doLogin);
['login-user','login-pass'].forEach(id=>document.getElementById(id).addEventListener('keydown',e=>{if(e.key==='Enter')doLogin();}));
async function doLogin(){const btn=document.getElementById('btn-login');const err=document.getElementById('login-error');btn.textContent='…';btn.disabled=true;const data=await api('POST','/api/login',{username:document.getElementById('login-user').value.trim(),password:document.getElementById('login-pass').value});btn.textContent='Sign In';btn.disabled=false;if(data.success){currentUser=data.user;err.style.display='none';settings=await api('GET','/api/settings').catch(()=>({}));applyLanguage(settings.lang);cacheLoginBranding();await playWelcome(currentUser.display_name,currentUser.role==='cyber');showApp();showPage('dashboard');}else{err.textContent=data.error||'Invalid credentials';err.style.display='block';}}

function toggleAuthMode(mode){
  document.getElementById('signin-fields').classList.toggle('hidden',mode!=='signin');
  document.getElementById('signup-fields').classList.toggle('hidden',mode!=='signup');
  document.getElementById('login-error').style.display='none';
}
document.getElementById('btn-signup').addEventListener('click',doSignup);
['su-invite','su-display','su-company','su-user','su-pass'].forEach(id=>document.getElementById(id).addEventListener('keydown',e=>{if(e.key==='Enter')doSignup();}));
async function doSignup(){
  if(!signupAllowedHere())return;
  const btn=document.getElementById('btn-signup');const err=document.getElementById('login-error');
  const invite_code=document.getElementById('su-invite').value.trim();
  const display_name=document.getElementById('su-display').value.trim();
  const company_name=document.getElementById('su-company').value.trim();
  const username=document.getElementById('su-user').value.trim();
  const password=document.getElementById('su-pass').value;
  if(!invite_code||!display_name||!username||!password){err.textContent='Please fill in all fields';err.style.display='block';return;}
  btn.textContent='…';btn.disabled=true;
  const data=await api('POST','/api/signup',{username,password,display_name,company_name,client:'desktop',invite_code});
  btn.textContent='Create Account';btn.disabled=false;
  if(data.success){
    currentUser=data.user;err.style.display='none';
    settings=await api('GET','/api/settings').catch(()=>({}));
    applyLanguage(settings.lang);cacheLoginBranding();
    await playWelcome(currentUser.display_name,false);
    showApp();showPage('dashboard');
  }else{err.textContent=data.error||'Could not create account';err.style.display='block';}
}
function playWelcome(name,cyber){
  const overlay=document.getElementById('welcome-overlay');
  document.getElementById('welcome-icon-i').className=cyber?'ti ti-shield-lock':'ti ti-plane';
  document.getElementById('welcome-name').textContent=name||'';
  document.getElementById('login-screen').style.display='none';
  overlay.classList.remove('hidden');
  requestAnimationFrame(()=>overlay.classList.add('show'));
  return new Promise(resolve=>{
    setTimeout(()=>{
      overlay.classList.add('leaving');
      setTimeout(()=>{overlay.classList.add('hidden');overlay.classList.remove('show','leaving');resolve();},500);
    },1300);
  });
}
document.getElementById('btn-logout').addEventListener('click',async()=>{await api('POST','/api/logout');currentUser=null;document.getElementById('app-screen').classList.add('hidden');document.getElementById('login-screen').style.display='flex';document.getElementById('login-pass').value='';});
function showApp(){document.getElementById('login-screen').style.display='none';document.getElementById('app-screen').classList.remove('hidden');document.getElementById('user-avatar').textContent=initials(currentUser.display_name);document.getElementById('user-name-display').textContent=currentUser.display_name;const roleLabels={patron:'Administrator',employe:'Staff',demo:'Demo',cyber:'CEO',client:'Owner'};document.getElementById('user-role-display').textContent=roleLabels[currentUser.role]||'Staff';applyBranding();}
function applyBranding(){
  const cyber=isCyber();
  const client=isClient();
  const brandName=cyber?'M&S Cyber Systems':(client?(settings.company_name||currentUser.display_name):'White Sky Travel');
  const bn=document.querySelector('.brand-name');if(bn)bn.textContent=brandName;
  document.title=cyber?'M&S Cyber Systems — Invoicing':`${brandName} — Invoicing`;
  const bi=document.querySelector('.brand-icon i');if(bi)bi.className=cyber?'ti ti-shield-lock':(client?'ti ti-building-store':'ti ti-plane');
  const labels=dl();
  const tSep=document.querySelector('.nav-sep[data-sep="tickets"]');if(tSep)tSep.textContent=labels.ticketsNav;
  const tSpan=document.querySelector('.nav-item[data-page="tickets"] span');if(tSpan)tSpan.textContent=labels.ticketsNav;
  const tIcon=document.querySelector('.nav-item[data-page="tickets"] i');if(tIcon)tIcon.className=cyber?'ti ti-briefcase':'ti ti-ticket';
  const ntSpan=document.querySelector('.nav-item[data-page="new-ticket"] span');if(ntSpan)ntSpan.textContent=labels.newTicketNav;
  const ntIcon=document.querySelector('.nav-item[data-page="new-ticket"] i');if(ntIcon)ntIcon.className=cyber?'ti ti-briefcase':'ti ti-ticket';
  const isPatron=currentUser&&currentUser.role==='patron';
  document.getElementById('admin-nav-item')?.classList.toggle('hidden',!isPatron);
  document.getElementById('admin-sep')?.classList.toggle('hidden',!isPatron);
  // M&S Cyber Systems isn't a travel agency — these modules (ticket sales, hotel bookings,
  // visas, group trips, passport docs) don't apply to that business, so they're hidden for
  // the 'cyber' account instead of cluttering its sidebar with irrelevant sections.
  const travelOnlyPages=['tickets','new-ticket','hotels','new-hotel','visas','new-visa','groups','new-group','passports','new-passport'];
  const travelOnlySeps=['hotels-sep','visas-sep','groups-sep','passports-sep'];
  travelOnlyPages.forEach(p=>document.querySelector(`.nav-item[data-page="${p}"]`)?.classList.toggle('hidden',cyber));
  travelOnlySeps.forEach(id=>document.getElementById(id)?.classList.toggle('hidden',cyber));
  document.querySelector('.nav-sep[data-sep="tickets"]')?.classList.toggle('hidden',cyber);
}

/* NAV */
document.querySelectorAll('.nav-item[data-page]').forEach(item=>item.addEventListener('click',()=>showPage(item.dataset.page)));
function showPage(page){document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));const nav=document.querySelector(`.nav-item[data-page="${page}"]`);if(nav)nav.classList.add('active');const mc=document.getElementById('main-content');mc.innerHTML='<div class="loading-page"><i class="ti ti-loader spin"></i> Loading…</div>';const pages={dashboard:pageDashboard,clients:pageClients,catalog:pageCatalog,quotes:pageQuotes,'new-quote':pageNewQuote,invoices:pageInvoices,'new-invoice':pageNewInvoice,tickets:pageTickets,'new-ticket':pageNewTicket,hotels:pageHotels,'new-hotel':pageNewHotel,visas:pageVisas,'new-visa':pageNewVisa,groups:pageGroups,'new-group':pageNewGroup,passports:pagePassports,'new-passport':pageNewPassport,payments:pagePayments,'credit-notes':pageCreditNotes,statements:pageStatements,reports:pageReports,settings:pageSettings,admin:pageAdmin};if(pages[page])pages[page](mc);}

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
  <div class="quick-action" onclick="showPage('new-ticket')"><i class="${isCyber()?'ti ti-briefcase':'ti ti-ticket'}"></i><span>${dl().newTicketNav}</span></div>
  <div class="quick-action" onclick="openClientModal()"><i class="ti ti-user-plus"></i><span>New Client</span></div>
  <div class="quick-action" onclick="showPage('reports')"><i class="ti ti-chart-bar"></i><span>Reports</span></div>
  ${dl().importPdf?`<div class="quick-action" onclick="openPdfImport()"><i class="ti ti-file-import"></i><span>Import PDF</span></div>`:''}
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

/* CATALOG */
let allItems=[];
async function pageCatalog(mc){allItems=await api('GET','/api/items');mc.innerHTML=`
<div class="page-header"><div><div class="page-title">Catalog</div><div class="page-sub">${allItems.length} reusable item(s) — pick them while building a quote or invoice</div></div><button class="btn-new" onclick="openItemModal()"><i class="ti ti-plus"></i> New Item</button></div>
<div class="card" style="padding:0;overflow:hidden"><div class="table-wrap"><table><thead><tr><th>Name</th><th>Category</th><th>Default price</th><th>Actions</th></tr></thead><tbody>${allItems.length===0?`<tr><td colspan="4"><div class="empty-state"><i class="ti ti-tag"></i><h3>No items yet</h3><p>Add your frequently sold services or packages here.</p></div></td></tr>`:allItems.map(it=>`<tr><td style="font-weight:700">${it.name}</td><td style="color:#888">${it.category||'—'}</td><td style="font-weight:700">${fmt(it.price,it.currency)}</td><td class="actions-cell"><button class="action-btn edit" onclick="openItemModal(${it.id})"><i class="ti ti-edit"></i></button><button class="action-btn danger" onclick="deleteItem(${it.id})"><i class="ti ti-trash"></i></button></td></tr>`).join('')}</tbody></table></div></div>`;}
function openItemModal(id){const it=id?allItems.find(x=>x.id===id):null;document.getElementById('modal-item-title').textContent=it?'Edit Item':'New Item';document.getElementById('edit-item-id').value=it?it.id:'';document.getElementById('it-name').value=it?.name||'';document.getElementById('it-category').value=it?.category||'';document.getElementById('it-price').value=it?.price||0;document.getElementById('it-currency').value=it?.currency||settings.invoice_currency||'KWD';openModal('modal-item');}
document.getElementById('btn-save-item').addEventListener('click',async()=>{const name=document.getElementById('it-name').value.trim();if(!name){toast('Name is required','error');return;}const id=document.getElementById('edit-item-id').value;const body={name,category:document.getElementById('it-category').value.trim(),price:document.getElementById('it-price').value||0,currency:document.getElementById('it-currency').value};if(id)await api('PUT',`/api/items/${id}`,body);else await api('POST','/api/items',body);toast(id?'✅ Item updated':'✅ Item added','success');closeModal('modal-item');showPage('catalog');});
async function deleteItem(id){if(!confirm('Delete this item from the catalog?'))return;await api('DELETE',`/api/items/${id}`);toast('Item deleted');showPage('catalog');}

/* INVOICES LIST */
async function pageInvoices(mc){allInvoices=await api('GET','/api/invoices');mc.innerHTML=`
<div class="page-header"><div><div class="page-title">Invoices</div><div class="page-sub">${allInvoices.length} invoice(s)${currentUser.role==='employe'?' — your invoices only':''}</div></div><div class="header-actions"><button class="btn-new" onclick="showPage('new-invoice')"><i class="ti ti-plus"></i> New Invoice</button>${dl().importPdf?`<button class="btn-secondary" onclick="openPdfImport()"><i class="ti ti-file-import"></i> Import PDF</button>`:''}</div></div>
${currentUser.role==='employe'?`<div class="info-box"><i class="ti ti-info-circle"></i> You can only see your own invoices.</div>`:''}
<div class="filter-bar"><input type="text" placeholder="Client, number…" id="inv-q" oninput="filterInv()"/><select id="inv-s" onchange="filterInv()"><option value="">All statuses</option><option value="draft">Draft</option><option value="pending">Pending</option><option value="paid">Paid</option><option value="overdue">Overdue</option></select><input type="date" id="inv-from" onchange="filterInv()"/><input type="date" id="inv-to" onchange="filterInv()"/></div>
<div class="card" style="padding:0;overflow:hidden"><div class="table-wrap"><table><thead><tr><th>#</th><th>Client</th><th>Date</th><th>Due</th><th>Total</th><th>Status</th><th>Created by</th><th>Actions</th></tr></thead><tbody id="inv-tbody">${invRowsHtml(allInvoices)}</tbody></table></div></div>`;}
function invRowsHtml(list){if(!list.length)return`<tr><td colspan="8"><div class="empty-state"><i class="ti ti-file-off"></i><h3>No invoices</h3></div></td></tr>`;return list.map(i=>`<tr><td style="font-weight:700;cursor:pointer;color:#1A6FB5" onclick="viewInvoice(${i.id})">${i.num}</td><td>${i.client_name}</td><td>${fmtDate(i.date)}</td><td>${fmtDate(i.due_date)}</td><td style="font-weight:700">${fmt(i.total,i.currency)}</td><td>${statusBadge(i.status)}</td><td style="color:#aaa;font-size:12px">${i.owner_name||'—'}</td><td class="actions-cell"><button class="action-btn danger" onclick="deleteInvoice(${i.id})"><i class="ti ti-trash"></i> Delete</button></td></tr>`).join('');}
function filterInv(){const q=document.getElementById('inv-q')?.value||'';const s=document.getElementById('inv-s')?.value||'';const from=document.getElementById('inv-from')?.value||'';const to=document.getElementById('inv-to')?.value||'';const f=allInvoices.filter(i=>(!q||i.num.toLowerCase().includes(q.toLowerCase())||i.client_name.toLowerCase().includes(q.toLowerCase()))&&(!s||i.status===s)&&(!from||i.date>=from)&&(!to||i.date<=to));const tb=document.getElementById('inv-tbody');if(tb)tb.innerHTML=invRowsHtml(f);}

/* MODAL PAYMENT */
let _payInvId=null,_payInv=null;
async function openPayModal(id){_payInvId=id;const[inv,hist]=await Promise.all([api('GET',`/api/invoices/${id}`),api('GET',`/api/invoices/${id}/payments`)]);_payInv=inv;document.getElementById('pay-inv-num').textContent=inv.num;document.getElementById('pay-inv-client').textContent=inv.client_name;document.getElementById('pay-inv-already').textContent=fmt(hist.totalPaid,inv.currency);document.getElementById('pay-inv-amount').textContent=fmt(hist.balance,inv.currency);document.getElementById('pay-amount').value=hist.balance;document.getElementById('pay-method').value='Cash';document.getElementById('pay-reference').value='';document.getElementById('pay-notes').value='';openModal('modal-payment');}
document.getElementById('btn-confirm-pay').addEventListener('click',async()=>{if(!_payInvId||!_payInv)return;const amount=parseFloat(document.getElementById('pay-amount').value)||0;if(amount<=0){toast('Enter an amount greater than 0','error');return;}const method=document.getElementById('pay-method').value;const reference=document.getElementById('pay-reference').value.trim();const notes=document.getElementById('pay-notes').value.trim();const r=await api('POST','/api/payments',{invoice_id:_payInvId,invoice_num:_payInv.num,client_name:_payInv.client_name,amount,method,reference,date:today(),notes});if(r&&r.error){toast(r.error,'error');return;}closeModal('modal-payment');toast('✅ Payment recorded','success');viewInvoice(_payInvId);});
async function markUnpaid(id){if(!confirm('Mark this invoice as unpaid?\nThe associated payment will be deleted.'))return;await api('PATCH',`/api/invoices/${id}/status`,{status:'pending'});toast('Invoice marked as unpaid','error');viewInvoice(id);}
async function deleteInvoice(id){if(!confirm('Delete this invoice?'))return;await api('DELETE',`/api/invoices/${id}`);toast('Invoice deleted');showPage('invoices');}

/* VIEW INVOICE */
async function viewInvoice(id){
  const[inv,hist]=await Promise.all([api('GET',`/api/invoices/${id}`),api('GET',`/api/invoices/${id}/payments`)]);
  const rows=inv.rows||[];
  const s=settings;
  const logoHtml=s.company_logo?`<img src="${s.company_logo}" class="inv-logo" alt="Logo"/>`:`<div class="inv-logo-placeholder"><i class="${isCyber()?'ti ti-shield-lock':'ti ti-plane'}"></i></div>`;
  const L=dl();
  const mc=document.getElementById('main-content');
  mc.innerHTML=`
<div class="page-header"><div><div class="page-title">${inv.num}</div><div class="page-sub">${inv.client_name} — ${statusBadge(inv.status)}</div></div>
<div class="header-actions">
  <button class="btn-secondary" onclick="showPage('invoices')"><i class="ti ti-arrow-left"></i> Back</button>
  <button class="btn-secondary" onclick="editInvoice(${inv.id})"><i class="ti ti-edit"></i> Edit</button>
  ${inv.status!=='paid'?`<button class="btn-new" onclick="openPayModal(${inv.id})"><i class="ti ti-check"></i> ${inv.status==='partial'?'Record Another Payment':'Record Payment'}</button>`:''}
  ${(inv.status==='paid'||inv.status==='partial')?`<button class="btn-unpaid" onclick="markUnpaid(${inv.id})"><i class="ti ti-x"></i> Mark Unpaid</button>`:''}
  ${inv.status!=='refunded'?`<button class="btn-secondary" onclick="openCreditNoteModal(${inv.id})"><i class="ti ti-receipt-refund"></i> Issue Credit Note</button>`:''}
  <button class="btn-secondary" onclick="openEmailModal(${inv.id})"><i class="ti ti-mail"></i> Email to Client</button>
  <button class="btn-secondary" onclick="printInv()"><i class="ti ti-printer"></i> Print / PDF</button>
</div></div>
${inv.status==='paid'?`<div class="info-box info-box-paid"><i class="ti ti-circle-check"></i> This invoice has been paid in full.</div>`:''}
${inv.status==='partial'?`<div class="info-box info-box-unpaid"><i class="ti ti-alert-circle"></i> Partially paid — ${fmt(hist.balance,inv.currency)} still due.</div>`:''}
${inv.status==='pending'||inv.status==='overdue'?`<div class="info-box info-box-unpaid"><i class="ti ti-alert-circle"></i> This invoice has not been paid yet.</div>`:''}
${hist.payments&&hist.payments.length?`<div class="card"><div class="card-header"><span class="card-title"><i class="ti ti-history" style="vertical-align:-2px;margin-right:6px;color:#1A6FB5"></i>Payment history</span></div><table style="width:100%;border-collapse:collapse"><thead><tr><th style="text-align:left;font-size:11px;color:#888;padding:6px 4px">Date</th><th style="text-align:left;font-size:11px;color:#888;padding:6px 4px">Method</th><th style="text-align:left;font-size:11px;color:#888;padding:6px 4px">Reference</th><th style="text-align:right;font-size:11px;color:#888;padding:6px 4px">Amount</th></tr></thead><tbody>${hist.payments.map(p=>`<tr><td style="padding:6px 4px;font-size:13px">${fmtDate(p.date)}</td><td style="padding:6px 4px"><span class="pay-method-badge">${p.method}</span></td><td style="padding:6px 4px;color:#aaa;font-size:12px">${p.reference||'—'}</td><td style="padding:6px 4px;text-align:right;font-weight:700;color:#1a7a3a">${fmt(p.amount,inv.currency)}</td></tr>`).join('')}</tbody><tfoot><tr style="border-top:1.5px solid #eee"><td colspan="3" style="padding:8px 4px;font-weight:700">Balance due</td><td style="padding:8px 4px;text-align:right;font-weight:800;color:${hist.balance>0?'#b71c1c':'#1a7a3a'}">${fmt(hist.balance,inv.currency)}</td></tr></tfoot></table></div>`:''}
<div id="printable"><div class="inv-wrap card">
  <div class="inv-head">
    <div class="inv-head-left"><div style="display:flex;flex-direction:column;align-items:flex-start;gap:8px">${logoHtml}<div class="inv-company-name">${s.company_name||''}</div></div></div>
    <div class="inv-head-right"><div class="inv-title">INVOICE</div><div class="inv-meta-grid"><span class="inv-meta-label">Invoice #:</span><span class="inv-meta-val">${inv.num}</span><span class="inv-meta-label">Invoice date:</span><span class="inv-meta-val">${fmtDate(inv.date)}</span></div></div>
  </div>
  <div class="inv-bill">
    <div><div class="inv-bill-label">From</div><div class="inv-bill-name">${s.company_name||'—'}</div><div class="inv-bill-meta">${s.company_address||''}<br>P: ${s.company_phone_p||''}<br>M: ${s.company_phone_m||''}<br>${s.company_email||''}</div></div>
    <div><div class="inv-bill-label">Bill to</div><div class="inv-bill-name">${inv.client_name}</div><div class="inv-bill-meta">${inv.client_address?`Address: ${inv.client_address}`:''}${inv.client_phone?`<br>Phone: ${inv.client_phone}`:''}${inv.client_fax?`<br>Fax: ${inv.client_fax}`:''}</div></div>
  </div>
  <div class="inv-pax"><table class="inv-pax-table">
    <thead><tr><th>${L.colPnr}</th><th>${L.colDest}</th><th>${L.colPassenger}</th><th>${isCyber()?L.colAirline:(rows.some(r=>r.airline==='Hotel')?'Hotel':'Airline')}</th><th>Date</th><th>Price</th></tr></thead>
    <tbody>${rows.length===0?`<tr><td colspan="6" style="text-align:center;color:#bbb;padding:1.5rem">No rows</td></tr>`:rows.map(r=>`<tr><td><span class="inv-pnr">${r.pnr||'—'}</span></td><td>${r.destination||'—'}</td><td>${r.passenger||'—'}</td><td>${r.airlineRef||r.airline||'—'}</td><td>${r.travel_date||'—'}</td><td>${inv.currency||'KWD'} ${Number(r.price).toLocaleString('en-US',{minimumFractionDigits:2})}</td></tr>`).join('')}</tbody>
  </table></div>
  <div class="inv-totals"><div class="inv-totals-inner">
    <div class="inv-tot-row"><span class="lbl">Invoice Subtotal</span><span class="val">${inv.currency||'KWD'} ${Number(inv.subtotal).toLocaleString('en-US',{minimumFractionDigits:2})}</span></div>
    <div class="inv-tot-row"><span class="lbl">Tax Rate</span><span class="val">${inv.currency||'KWD'} ${inv.tax?Number(inv.tax).toLocaleString('en-US',{minimumFractionDigits:2}):'-'}</span></div>
    <div class="inv-tot-row"><span class="lbl">Sales Tax</span><span class="val">${inv.currency||'KWD'} -</span></div>
    <div class="inv-tot-row"><span class="lbl">Deposit Received</span><span class="val">${inv.currency||'KWD'} ${inv.deposit?Number(inv.deposit).toLocaleString('en-US',{minimumFractionDigits:2}):'-'}</span></div>
    <div class="inv-tot-row inv-tot-final"><span class="lbl"><strong>TOTAL</strong></span><span class="val"><strong>${inv.currency||'KWD'} ${Number(inv.total).toLocaleString('en-US',{minimumFractionDigits:2})}</strong></span></div>
  </div></div>
  <div class="inv-foot">
    <div class="inv-stamp-area"><div><div class="inv-stamp-label">Signature</div>${s.company_signature?`<img src="${s.company_signature}" style="height:70px;margin-top:6px"/>`:(isCyber()?`<div style="height:70px;display:flex;flex-direction:column;justify-content:flex-end"><div style="font-family:'Segoe Script','Brush Script MT',cursive;font-size:24px;color:#0a3258">Boudy Hajj</div><div style="font-size:10px;color:#999;text-transform:uppercase;letter-spacing:.05em;border-top:1px solid #ccc;margin-top:3px;padding-top:3px">Boudy Hajj — CEO, M&amp;S Cyber Systems</div></div>`:'<div style="height:70px"></div>')}</div><div><div class="inv-stamp-label">Stamp</div>${s.company_stamp?`<img src="${s.company_stamp}" style="height:70px;margin-top:6px"/>`:'<div style="height:70px"></div>'}</div>${inv.qr_data_url?`<div class="inv-qr"><img src="${inv.qr_data_url}" alt="Verification QR code"/><div class="inv-qr-caption">Scan to verify</div></div>`:''}</div>
    <div class="inv-foot-note">${(s.invoice_footer||'Total due in 07 days.').replace(/\n/g,'<br>')}</div>
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
.inv-company-name{font-size:15px;font-weight:800;color:#0a3258}
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
.inv-qr{text-align:center}
.inv-qr img{width:64px;height:64px;display:block}
.inv-qr-caption{font-size:8px;color:#aaa;text-transform:uppercase;letter-spacing:.04em;margin-top:4px;font-weight:700}
.inv-foot-note{font-size:10px;color:#aaa;text-align:right;line-height:1.8;white-space:pre-line}
@page{margin:10mm;size:A4}
@media print{
  body{padding:0}
  button{display:none!important}
}
  </style></head><body>${inv_content}<script>window.onload=()=>window.print()<\/script></body></html>`);
  win.document.close();
}

let _emailInvId=null;
function openEmailModal(id){_emailInvId=id;const inv=allInvoices.find(i=>i.id===id);const client=inv&&inv.client_id?allClients.find(c=>c.id===inv.client_id):null;document.getElementById('em-to').value=client?.email||'';document.getElementById('em-message').value='';openModal('modal-email');}
document.getElementById('btn-send-email').addEventListener('click',async()=>{
  const to=document.getElementById('em-to').value.trim();
  if(!to){toast('Enter a recipient email','error');return;}
  const btn=document.getElementById('btn-send-email');btn.disabled=true;btn.textContent='Sending…';
  const r=await api('POST',`/api/invoices/${_emailInvId}/send-email`,{to,message:document.getElementById('em-message').value.trim()});
  btn.disabled=false;btn.innerHTML='<i class="ti ti-send"></i> Send';
  if(r&&r.error){toast(r.error,'error');return;}
  toast('✅ Email sent','success');
  closeModal('modal-email');
});

















function fillClient(sel){const o=sel.querySelector(`option[value="${sel.value}"]`);if(!o||!sel.value)return;[['inv-client-name','name'],['inv-client-addr','addr'],['inv-client-phone','phone'],['inv-client-fax','fax']].forEach(([id,k])=>{const el=document.getElementById(id);if(el)el.value=o.dataset[k]||'';});}
function setAllAirlineType(val){editInvRows.forEach(r=>r.airline=val);renderInvRows();setTimeout(()=>{const sel=document.getElementById('col-airline-type');if(sel)sel.value=val;},10);}

/* NEW/EDIT INVOICE */
async function pageNewInvoice(mc){_editInvId=null;editInvRows=[{pnr:'',destination:'',passenger:'',airline:'Airline',airlineRef:'',travel_date:'',price:0}];[allClients,allItems]=await Promise.all([api('GET','/api/clients'),api('GET','/api/items')]);const{num}=await api('GET','/api/invoices/next-num');renderInvForm(mc,{num,date:today(),due_date:addDays(today(),parseInt(settings.invoice_due_days)||7),status:'pending',currency:settings.invoice_currency||'KWD',tax:0,deposit:0,due_days:settings.invoice_due_days||7});}
async function editInvoice(id){_editInvId=id;const inv=await api('GET',`/api/invoices/${id}`);editInvRows=inv.rows&&inv.rows.length?inv.rows.map(r=>({...r,airlineRef:r.airlineRef||''})):[{pnr:'',destination:'',passenger:'',airline:'Airline',airlineRef:'',travel_date:'',price:0}];[allClients,allItems]=await Promise.all([api('GET','/api/clients'),api('GET','/api/items')]);const mc=document.getElementById('main-content');document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));renderInvForm(mc,inv);}
function newInvoiceFor(cid,cname,caddr,cphone,cfax){showPage('new-invoice');setTimeout(()=>{const sel=document.getElementById('inv-client');if(sel)sel.value=cid;[['inv-client-name',cname],['inv-client-addr',caddr],['inv-client-phone',cphone],['inv-client-fax',cfax]].forEach(([id,v])=>{const el=document.getElementById(id);if(el)el.value=v||'';});},150);}

function renderInvForm(mc,inv){
  const currencies=['KWD','USD','EUR','LBP','AED','SAR'];
  const L=dl();
  mc.innerHTML=`
<div class="page-header"><div><div class="page-title">${_editInvId?'Edit Invoice':'New Invoice'}</div></div><button class="btn-secondary" onclick="showPage('invoices')"><i class="ti ti-arrow-left"></i> Cancel</button></div>
<div class="card"><div class="card-header"><span class="card-title">Information</span></div><div class="form-grid2" style="gap:14px">
  <div class="form-group"><label class="form-label">Invoice #</label><input class="form-input" id="inv-num" value="${inv.num||''}" ${_editInvId?'readonly style="background:#f5f5f5"':''}/></div>
  <div class="form-group"><label class="form-label">Currency</label><select class="form-input" id="inv-currency">${currencies.map(c=>`<option ${(inv.currency||'KWD')===c?'selected':''}>${c}</option>`).join('')}</select></div>
  ${isCyber()?`
  <div class="form-group"><label class="form-label">Delivery Date</label><input type="date" class="form-input" id="inv-date" value="${inv.date||today()}" oninput="document.getElementById('inv-due').value=addDays(this.value,parseInt(document.getElementById('inv-due-days').value)||0)"/></div>
  <input type="hidden" id="inv-due" value="${inv.due_date||inv.date||today()}"/>
  `:`
  <div class="form-group"><label class="form-label">Date</label><input type="date" class="form-input" id="inv-date" value="${inv.date||today()}"/></div>
  <div class="form-group"><label class="form-label">Due Date</label><input type="date" class="form-input" id="inv-due" value="${inv.due_date||addDays(today(),7)}"/></div>
  `}
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
<div class="card"><div class="card-header"><span class="card-title">${isCyber()?'Services':'Passengers / Services'}</span></div>
<div class="pax-table-wrap"><table class="pax-table">
<colgroup><col style="width:12%"><col style="width:22%"><col style="width:22%"><col style="width:18%"><col style="width:15%"><col style="width:8%"><col style="width:3%"></colgroup>
<thead><tr><th>${L.colPnr}</th><th>${L.colDest}</th><th>${L.colPassenger}</th><th>${isCyber()?L.colAirline:`<select id="col-airline-type" onchange="setAllAirlineType(this.value)" style="font-size:11px;padding:3px 5px;border:1px solid #ccc;border-radius:4px;background:#f5f8fd;font-weight:700;cursor:pointer"><option value="Airline">Airline</option><option value="Hotel">Hotel</option></select>`}</th><th>${L.colDate}</th><th>Price</th><th></th></tr></thead>
<tbody id="inv-rows"></tbody>
</table></div>
<button class="btn-add-row" onclick="addInvRow()"><i class="ti ti-plus" style="vertical-align:-2px;margin-right:4px"></i>Add row</button>
${allItems.length?`<select class="form-input" style="display:inline-block;width:auto;margin-left:10px;font-size:12px;padding:6px 8px" onchange="addRowFromCatalog(editInvRows,renderInvRows,this.value);this.value=''"><option value="">+ Add from catalog…</option>${allItems.map(it=>`<option value="${it.id}">${it.name} — ${fmt(it.price,it.currency)}</option>`).join('')}</select>`:''}
<div class="totals-box"><div class="totals-row"><span>Subtotal</span><span id="inv-subtotal" style="font-weight:700">0.00</span></div><div class="totals-row"><span>Tax</span><input type="number" class="form-input" id="inv-tax" value="${inv.tax||0}" min="0" step="0.01" oninput="calcInvTotal()"/></div><div class="totals-row"><span>Deposit received</span><input type="number" class="form-input" id="inv-deposit" value="${inv.deposit||0}" min="0" step="0.01" oninput="calcInvTotal()"/></div><div class="totals-row total-final"><span>TOTAL</span><span id="inv-total" style="font-size:20px">0.00</span></div></div>
<div class="form-group" style="margin-top:1rem"><label class="form-label">Notes</label><textarea class="form-input" id="inv-notes" rows="2">${inv.notes||''}</textarea></div>
<div class="form-actions"><button class="btn-secondary" onclick="showPage('invoices')">Cancel</button><button class="btn-secondary" onclick="saveInv('draft')"><i class="ti ti-device-floppy" style="vertical-align:-2px;margin-right:5px"></i>Save Draft</button><button class="btn-save" onclick="saveInv()"><i class="ti ti-send" style="vertical-align:-2px;margin-right:5px"></i>Save Invoice</button></div>
</div>`;renderInvRows();}

function renderInvRows(){const t=document.getElementById('inv-rows');if(!t)return;const L=dl();t.innerHTML=editInvRows.map((r,i)=>`<tr>
<td><input value="${r.pnr||''}" placeholder="${L.phPnr}" oninput="editInvRows[${i}].pnr=this.value"/></td>
<td><input value="${r.destination||''}" placeholder="${L.phDest}" oninput="editInvRows[${i}].destination=this.value"/></td>
<td><input value="${r.passenger||''}" placeholder="${L.phPassenger}" oninput="editInvRows[${i}].passenger=this.value"/></td>
<td><input value="${r.airlineRef||''}" placeholder="${L.phAirline}" oninput="editInvRows[${i}].airlineRef=this.value" style="width:100%;padding:5px 7px;font-size:12px;border:1.5px solid #e0e7ef;border-radius:6px;background:#fff;outline:none;color:#1a1a2e"/></td>
<td><input ${isCyber()?'type="date"':''} value="${r.travel_date||''}" placeholder="${L.phDate}" oninput="editInvRows[${i}].travel_date=this.value"/></td>
<td><input type="number" value="${r.price||0}" min="0" step="0.01" style="text-align:right" oninput="editInvRows[${i}].price=parseFloat(this.value)||0;calcInvTotal()"/></td>
<td><button class="action-btn danger" onclick="removeInvRow(${i})"><i class="ti ti-x"></i></button></td>
</tr>`).join('');calcInvTotal();}
function addInvRow(){editInvRows.push({pnr:'',destination:'',passenger:'',airline:'Airline',airlineRef:'',travel_date:'',price:0});renderInvRows();}
function addRowFromCatalog(rowsArr,renderFn,itemId){if(!itemId)return;const it=allItems.find(x=>x.id==itemId);if(!it)return;rowsArr.push({pnr:'',destination:'',passenger:'',airline:'Airline',airlineRef:it.name,travel_date:'',price:it.price});renderFn();}
function removeInvRow(i){if(editInvRows.length===1){toast('At least one row required');return;}editInvRows.splice(i,1);renderInvRows();}
function calcInvTotal(){const sub=editInvRows.reduce((a,r)=>a+(parseFloat(r.price)||0),0);const tax=parseFloat(document.getElementById('inv-tax')?.value)||0;const dep=parseFloat(document.getElementById('inv-deposit')?.value)||0;const cur=document.getElementById('inv-currency')?.value||'KWD';const s=document.getElementById('inv-subtotal');if(s)s.textContent=cur+' '+sub.toFixed(2);const t=document.getElementById('inv-total');if(t)t.textContent=cur+' '+(sub+tax-dep).toFixed(2);}
async function saveInv(forceStatus){const cname=document.getElementById('inv-client-name')?.value.trim();if(!cname){toast('Client name is required','error');return;}const status=forceStatus||document.getElementById('inv-status')?.value||'pending';const body={num:document.getElementById('inv-num')?.value.trim(),client_id:document.getElementById('inv-client')?.value||null,client_name:cname,client_address:document.getElementById('inv-client-addr')?.value.trim(),client_phone:document.getElementById('inv-client-phone')?.value.trim(),client_fax:document.getElementById('inv-client-fax')?.value.trim(),status,date:document.getElementById('inv-date')?.value,due_date:document.getElementById('inv-due')?.value,due_days:document.getElementById('inv-due-days')?.value||7,currency:document.getElementById('inv-currency')?.value||'KWD',tax:document.getElementById('inv-tax')?.value||0,deposit:document.getElementById('inv-deposit')?.value||0,notes:document.getElementById('inv-notes')?.value.trim(),rows:editInvRows};let r;if(_editInvId){r=await api('PUT',`/api/invoices/${_editInvId}`,body);toast('✅ Invoice updated','success');}else{r=await api('POST','/api/invoices',body);toast('✅ Invoice created','success');}if(r&&r.error){toast(r.error,'error');return;}if(_editInvId)viewInvoice(_editInvId);else showPage('invoices');}

/* QUOTES */
async function pageQuotes(mc){allQuotes=await api('GET','/api/quotes');mc.innerHTML=`
<div class="page-header"><div><div class="page-title">Quotes</div><div class="page-sub">${allQuotes.length} quote(s)${currentUser.role==='employe'?' — your quotes only':''}</div></div><div class="header-actions"><button class="btn-new" onclick="showPage('new-quote')"><i class="ti ti-plus"></i> New Quote</button></div></div>
${currentUser.role==='employe'?`<div class="info-box"><i class="ti ti-info-circle"></i> You can only see your own quotes.</div>`:''}
<div class="filter-bar"><input type="text" placeholder="Client, number…" id="qt-q" oninput="filterQt()"/><select id="qt-s" onchange="filterQt()"><option value="">All statuses</option><option value="draft">Draft</option><option value="sent">Sent</option><option value="accepted">Accepted</option><option value="refused">Refused</option></select></div>
<div class="card" style="padding:0;overflow:hidden"><div class="table-wrap"><table><thead><tr><th>#</th><th>Client</th><th>Date</th><th>Valid until</th><th>Total</th><th>Status</th><th>Actions</th></tr></thead><tbody id="qt-tbody">${qtRowsHtml(allQuotes)}</tbody></table></div></div>`;}
function qtRowsHtml(list){if(!list.length)return`<tr><td colspan="7"><div class="empty-state"><i class="ti ti-file-off"></i><h3>No quotes</h3></div></td></tr>`;return list.map(q=>`<tr><td style="font-weight:700;cursor:pointer;color:#1A6FB5" onclick="viewQuote(${q.id})">${q.num}</td><td>${q.client_name}</td><td>${fmtDate(q.date)}</td><td>${fmtDate(q.valid_until)}</td><td style="font-weight:700">${fmt(q.total,q.currency)}</td><td>${statusBadge(q.status)}</td><td class="actions-cell"><button class="action-btn danger" onclick="deleteQuote(${q.id})"><i class="ti ti-trash"></i> Delete</button></td></tr>`).join('');}
function filterQt(){const q=document.getElementById('qt-q')?.value||'';const s=document.getElementById('qt-s')?.value||'';const f=allQuotes.filter(x=>(!q||x.num.toLowerCase().includes(q.toLowerCase())||x.client_name.toLowerCase().includes(q.toLowerCase()))&&(!s||x.status===s));const tb=document.getElementById('qt-tbody');if(tb)tb.innerHTML=qtRowsHtml(f);}
async function deleteQuote(id){if(!confirm('Delete this quote?'))return;await api('DELETE',`/api/quotes/${id}`);toast('Quote deleted');showPage('quotes');}

async function viewQuote(id){
  const qt=await api('GET',`/api/quotes/${id}`);
  const rows=qt.rows||[];
  const s=settings;
  const logoHtml=s.company_logo?`<img src="${s.company_logo}" class="inv-logo" alt="Logo"/>`:`<div class="inv-logo-placeholder"><i class="${isCyber()?'ti ti-shield-lock':'ti ti-plane'}"></i></div>`;
  const L=dl();
  const mc=document.getElementById('main-content');
  mc.innerHTML=`
<div class="page-header"><div><div class="page-title">${qt.num}</div><div class="page-sub">${qt.client_name} — ${statusBadge(qt.status)}</div></div>
<div class="header-actions">
  <button class="btn-secondary" onclick="showPage('quotes')"><i class="ti ti-arrow-left"></i> Back</button>
  ${!qt.converted_invoice_id?`<button class="btn-secondary" onclick="editQuote(${qt.id})"><i class="ti ti-edit"></i> Edit</button>`:''}
  ${qt.status==='draft'?`<button class="btn-new" onclick="api('PATCH','/api/quotes/${qt.id}/status',{status:'sent'}).then(()=>{toast('✅ Marked as sent','success');viewQuote(${qt.id})})"><i class="ti ti-send"></i> Mark as Sent</button>`:''}
  ${qt.status==='sent'?`<button class="btn-new" onclick="api('PATCH','/api/quotes/${qt.id}/status',{status:'accepted'}).then(()=>{toast('✅ Marked as accepted','success');viewQuote(${qt.id})})"><i class="ti ti-check"></i> Mark as Accepted</button><button class="btn-unpaid" onclick="api('PATCH','/api/quotes/${qt.id}/status',{status:'refused'}).then(()=>{toast('Marked as refused','error');viewQuote(${qt.id})})"><i class="ti ti-x"></i> Mark as Refused</button>`:''}
  ${qt.status==='accepted'&&!qt.converted_invoice_id?`<button class="btn-new" onclick="convertQuoteToInvoice(${qt.id})"><i class="ti ti-file-invoice"></i> Convert to Invoice</button>`:''}
  <button class="btn-secondary" onclick="printQuote()"><i class="ti ti-printer"></i> Print / PDF</button>
</div></div>
${qt.converted_invoice_id?`<div class="info-box info-box-paid"><i class="ti ti-circle-check"></i> Converted to invoice <strong style="cursor:pointer;text-decoration:underline" onclick="showPage('invoices');setTimeout(()=>viewInvoice(${qt.converted_invoice_id}),150)">view invoice</strong>.</div>`:''}
${qt.status==='refused'?`<div class="info-box info-box-unpaid"><i class="ti ti-alert-circle"></i> This quote was refused by the client.</div>`:''}
<div id="printable"><div class="inv-wrap card">
  <div class="inv-head">
    <div class="inv-head-left"><div style="display:flex;flex-direction:column;align-items:flex-start;gap:8px">${logoHtml}<div class="inv-company-name">${s.company_name||''}</div></div></div>
    <div class="inv-head-right"><div class="inv-title">QUOTE</div><div class="inv-meta-grid"><span class="inv-meta-label">Quote #:</span><span class="inv-meta-val">${qt.num}</span><span class="inv-meta-label">Date:</span><span class="inv-meta-val">${fmtDate(qt.date)}</span>${qt.valid_until?`<span class="inv-meta-label">Valid until:</span><span class="inv-meta-val">${fmtDate(qt.valid_until)}</span>`:''}</div></div>
  </div>
  <div class="inv-bill">
    <div><div class="inv-bill-label">From</div><div class="inv-bill-name">${s.company_name||'—'}</div><div class="inv-bill-meta">${s.company_address||''}<br>P: ${s.company_phone_p||''}<br>M: ${s.company_phone_m||''}<br>${s.company_email||''}</div></div>
    <div><div class="inv-bill-label">Quote for</div><div class="inv-bill-name">${qt.client_name}</div><div class="inv-bill-meta">${qt.client_address?`Address: ${qt.client_address}`:''}${qt.client_phone?`<br>Phone: ${qt.client_phone}`:''}${qt.client_fax?`<br>Fax: ${qt.client_fax}`:''}</div></div>
  </div>
  <div class="inv-pax"><table class="inv-pax-table">
    <thead><tr><th>${L.colPnr}</th><th>${L.colDest}</th><th>${L.colPassenger}</th><th>${isCyber()?L.colAirline:(rows.some(r=>r.airline==='Hotel')?'Hotel':'Airline')}</th><th>Date</th><th>Price</th></tr></thead>
    <tbody>${rows.length===0?`<tr><td colspan="6" style="text-align:center;color:#bbb;padding:1.5rem">No rows</td></tr>`:rows.map(r=>`<tr><td><span class="inv-pnr">${r.pnr||'—'}</span></td><td>${r.destination||'—'}</td><td>${r.passenger||'—'}</td><td>${r.airlineRef||r.airline||'—'}</td><td>${r.travel_date||'—'}</td><td>${qt.currency||'KWD'} ${Number(r.price).toLocaleString('en-US',{minimumFractionDigits:2})}</td></tr>`).join('')}</tbody>
  </table></div>
  <div class="inv-totals"><div class="inv-totals-inner">
    <div class="inv-tot-row"><span class="lbl">Subtotal</span><span class="val">${qt.currency||'KWD'} ${Number(qt.subtotal).toLocaleString('en-US',{minimumFractionDigits:2})}</span></div>
    <div class="inv-tot-row"><span class="lbl">Tax</span><span class="val">${qt.currency||'KWD'} ${qt.tax?Number(qt.tax).toLocaleString('en-US',{minimumFractionDigits:2}):'-'}</span></div>
    <div class="inv-tot-row inv-tot-final"><span class="lbl"><strong>TOTAL</strong></span><span class="val"><strong>${qt.currency||'KWD'} ${Number(qt.total).toLocaleString('en-US',{minimumFractionDigits:2})}</strong></span></div>
  </div></div>
  <div class="inv-foot">
    <div class="inv-stamp-area"><div><div class="inv-stamp-label">Signature</div>${s.company_signature?`<img src="${s.company_signature}" style="height:70px;margin-top:6px"/>`:'<div style="height:70px"></div>'}</div><div><div class="inv-stamp-label">Stamp</div>${s.company_stamp?`<img src="${s.company_stamp}" style="height:70px;margin-top:6px"/>`:'<div style="height:70px"></div>'}</div></div>
    <div class="inv-foot-note">${qt.notes?qt.notes.replace(/\n/g,'<br>'):'This quote is valid until the date shown above.'}</div>
  </div>
</div></div>`;}

function printQuote(){
  const content=document.getElementById('printable').innerHTML;
  const win=window.open('','_blank');
  win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Quote</title><style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',Arial,sans-serif;font-size:12px;color:#1a1a2e;background:#fff}
.inv-wrap{padding:0}
.inv-head{display:flex;justify-content:space-between;align-items:flex-start;padding:24px 30px 16px;border-bottom:3px solid #0a3258}
.inv-head-left{display:flex;align-items:center;gap:14px}
.inv-logo{width:80px;height:80px;object-fit:contain}
.inv-logo-placeholder{width:80px;height:80px;display:flex;align-items:center;justify-content:center;font-size:10px;color:#999}
.inv-company-name{font-size:15px;font-weight:800;color:#0a3258}
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
@media print{body{padding:0}button{display:none!important}}
  </style></head><body>${content}<script>window.onload=()=>window.print()<\/script></body></html>`);
  win.document.close();
}

async function convertQuoteToInvoice(id){
  if(!confirm('Convert this quote into an invoice? This cannot be undone.'))return;
  const r=await api('POST',`/api/quotes/${id}/convert`,{});
  if(r&&r.error){toast(r.error,'error');return;}
  toast('✅ Converted to invoice '+r.num,'success');
  showPage('invoices');setTimeout(()=>viewInvoice(r.id),150);
}

function fillQtClient(sel){const o=sel.querySelector(`option[value="${sel.value}"]`);if(!o||!sel.value)return;[['qt-client-name','name'],['qt-client-addr','addr'],['qt-client-phone','phone'],['qt-client-fax','fax']].forEach(([id,k])=>{const el=document.getElementById(id);if(el)el.value=o.dataset[k]||'';});}

let _editQtId=null;
async function pageNewQuote(mc){_editQtId=null;editQuoteRows=[{pnr:'',destination:'',passenger:'',airline:'Airline',airlineRef:'',travel_date:'',price:0}];[allClients,allItems]=await Promise.all([api('GET','/api/clients'),api('GET','/api/items')]);const{num}=await api('GET','/api/quotes/next-num');renderQtForm(mc,{num,date:today(),valid_until:addDays(today(),14),status:'draft',currency:settings.invoice_currency||'KWD',tax:0});}
async function editQuote(id){_editQtId=id;const qt=await api('GET',`/api/quotes/${id}`);editQuoteRows=qt.rows&&qt.rows.length?qt.rows.map(r=>({...r,airlineRef:r.airlineRef||''})):[{pnr:'',destination:'',passenger:'',airline:'Airline',airlineRef:'',travel_date:'',price:0}];[allClients,allItems]=await Promise.all([api('GET','/api/clients'),api('GET','/api/items')]);const mc=document.getElementById('main-content');document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));renderQtForm(mc,qt);}

function renderQtForm(mc,qt){
  const currencies=['KWD','USD','EUR','LBP','AED','SAR'];
  const L=dl();
  mc.innerHTML=`
<div class="page-header"><div><div class="page-title">${_editQtId?'Edit Quote':'New Quote'}</div></div><button class="btn-secondary" onclick="showPage('quotes')"><i class="ti ti-arrow-left"></i> Cancel</button></div>
<div class="card"><div class="card-header"><span class="card-title">Information</span></div><div class="form-grid2" style="gap:14px">
  <div class="form-group"><label class="form-label">Quote #</label><input class="form-input" id="qt-num" value="${qt.num||''}" ${_editQtId?'readonly style="background:#f5f5f5"':''}/></div>
  <div class="form-group"><label class="form-label">Currency</label><select class="form-input" id="qt-currency">${currencies.map(c=>`<option ${(qt.currency||'KWD')===c?'selected':''}>${c}</option>`).join('')}</select></div>
  <div class="form-group"><label class="form-label">Date</label><input type="date" class="form-input" id="qt-date" value="${qt.date||today()}"/></div>
  <div class="form-group"><label class="form-label">Valid until</label><input type="date" class="form-input" id="qt-valid" value="${qt.valid_until||addDays(today(),14)}"/></div>
</div></div>
<div class="card"><div class="card-header"><span class="card-title">Client</span></div><div class="form-grid2" style="gap:14px">
  <div class="form-group"><label class="form-label">Select client</label><select class="form-input" id="qt-client" onchange="fillQtClient(this)"><option value="">-- Select --</option>${allClients.map(c=>`<option value="${c.id}" data-name="${c.name}" data-addr="${c.address||''}" data-phone="${c.phone||''}" data-fax="${c.fax||''}" ${qt.client_id==c.id?'selected':''}>${c.name}</option>`).join('')}</select></div>
  <div class="form-group"><label class="form-label">Name *</label><input class="form-input" id="qt-client-name" value="${qt.client_name||''}"/></div>
  <div class="form-group"><label class="form-label">Address</label><input class="form-input" id="qt-client-addr" value="${qt.client_address||''}"/></div>
  <div class="form-group"><label class="form-label">Phone</label><input class="form-input" id="qt-client-phone" value="${qt.client_phone||''}"/></div>
  <div class="form-group"><label class="form-label">Fax</label><input class="form-input" id="qt-client-fax" value="${qt.client_fax||''}"/></div>
</div></div>
<div class="card"><div class="card-header"><span class="card-title">${isCyber()?'Services':'Passengers / Services'}</span></div>
<div class="pax-table-wrap"><table class="pax-table">
<colgroup><col style="width:12%"><col style="width:22%"><col style="width:22%"><col style="width:18%"><col style="width:15%"><col style="width:8%"><col style="width:3%"></colgroup>
<thead><tr><th>${L.colPnr}</th><th>${L.colDest}</th><th>${L.colPassenger}</th><th>${L.colAirline||'Airline'}</th><th>${L.colDate}</th><th>Price</th><th></th></tr></thead>
<tbody id="qt-rows"></tbody>
</table></div>
<button class="btn-add-row" onclick="addQtRow()"><i class="ti ti-plus" style="vertical-align:-2px;margin-right:4px"></i>Add row</button>
${allItems.length?`<select class="form-input" style="display:inline-block;width:auto;margin-left:10px;font-size:12px;padding:6px 8px" onchange="addRowFromCatalog(editQuoteRows,renderQtRows,this.value);this.value=''"><option value="">+ Add from catalog…</option>${allItems.map(it=>`<option value="${it.id}">${it.name} — ${fmt(it.price,it.currency)}</option>`).join('')}</select>`:''}
<div class="totals-box"><div class="totals-row"><span>Subtotal</span><span id="qt-subtotal" style="font-weight:700">0.00</span></div><div class="totals-row"><span>Tax</span><input type="number" class="form-input" id="qt-tax" value="${qt.tax||0}" min="0" step="0.01" oninput="calcQtTotal()"/></div><div class="totals-row total-final"><span>TOTAL</span><span id="qt-total" style="font-size:20px">0.00</span></div></div>
<div class="form-group" style="margin-top:1rem"><label class="form-label">Notes</label><textarea class="form-input" id="qt-notes" rows="2">${qt.notes||''}</textarea></div>
<div class="form-actions"><button class="btn-secondary" onclick="showPage('quotes')">Cancel</button><button class="btn-save" onclick="saveQt()"><i class="ti ti-device-floppy" style="vertical-align:-2px;margin-right:5px"></i>${_editQtId?'Update Quote':'Save Quote'}</button></div>
</div>`;renderQtRows();}

function renderQtRows(){const t=document.getElementById('qt-rows');if(!t)return;const L=dl();t.innerHTML=editQuoteRows.map((r,i)=>`<tr>
<td><input value="${r.pnr||''}" placeholder="${L.phPnr}" oninput="editQuoteRows[${i}].pnr=this.value"/></td>
<td><input value="${r.destination||''}" placeholder="${L.phDest}" oninput="editQuoteRows[${i}].destination=this.value"/></td>
<td><input value="${r.passenger||''}" placeholder="${L.phPassenger}" oninput="editQuoteRows[${i}].passenger=this.value"/></td>
<td><input value="${r.airlineRef||''}" placeholder="${L.phAirline}" oninput="editQuoteRows[${i}].airlineRef=this.value" style="width:100%;padding:5px 7px;font-size:12px;border:1.5px solid #e0e7ef;border-radius:6px;background:#fff;outline:none;color:#1a1a2e"/></td>
<td><input ${isCyber()?'type="date"':''} value="${r.travel_date||''}" placeholder="${L.phDate}" oninput="editQuoteRows[${i}].travel_date=this.value"/></td>
<td><input type="number" value="${r.price||0}" min="0" step="0.01" style="text-align:right" oninput="editQuoteRows[${i}].price=parseFloat(this.value)||0;calcQtTotal()"/></td>
<td><button class="action-btn danger" onclick="removeQtRow(${i})"><i class="ti ti-x"></i></button></td>
</tr>`).join('');calcQtTotal();}
function addQtRow(){editQuoteRows.push({pnr:'',destination:'',passenger:'',airline:'Airline',airlineRef:'',travel_date:'',price:0});renderQtRows();}
function removeQtRow(i){if(editQuoteRows.length===1){toast('At least one row required');return;}editQuoteRows.splice(i,1);renderQtRows();}
function calcQtTotal(){const sub=editQuoteRows.reduce((a,r)=>a+(parseFloat(r.price)||0),0);const tax=parseFloat(document.getElementById('qt-tax')?.value)||0;const cur=document.getElementById('qt-currency')?.value||'KWD';const s=document.getElementById('qt-subtotal');if(s)s.textContent=cur+' '+sub.toFixed(2);const t=document.getElementById('qt-total');if(t)t.textContent=cur+' '+(sub+tax).toFixed(2);}
async function saveQt(){const cname=document.getElementById('qt-client-name')?.value.trim();if(!cname){toast('Client name is required','error');return;}const body={num:document.getElementById('qt-num')?.value.trim(),client_id:document.getElementById('qt-client')?.value||null,client_name:cname,client_address:document.getElementById('qt-client-addr')?.value.trim(),client_phone:document.getElementById('qt-client-phone')?.value.trim(),client_fax:document.getElementById('qt-client-fax')?.value.trim(),status:'draft',date:document.getElementById('qt-date')?.value,valid_until:document.getElementById('qt-valid')?.value,currency:document.getElementById('qt-currency')?.value||'KWD',tax:document.getElementById('qt-tax')?.value||0,notes:document.getElementById('qt-notes')?.value.trim(),rows:editQuoteRows};let r;if(_editQtId){r=await api('PUT',`/api/quotes/${_editQtId}`,body);toast('✅ Quote updated','success');}else{r=await api('POST','/api/quotes',body);toast('✅ Quote saved','success');}if(r&&r.error){toast(r.error,'error');return;}if(_editQtId)viewQuote(_editQtId);else showPage('quotes');}

/* TICKET SALES */
async function pageTickets(mc){const tickets=await api('GET','/api/tickets');const L=dl();const cyber=isCyber();const firstDay=new Date(new Date().getFullYear(),0,1).toISOString().split('T')[0];mc.innerHTML=`<div class="page-header"><div><div class="page-title">${L.ticketsTitle}</div><div class="page-sub">${tickets.length} ${cyber?'service(s)':'ticket(s)'}</div></div><div class="header-actions"><button class="btn-new" onclick="showPage('new-ticket')"><i class="ti ti-plus"></i> ${L.newTicketNav}</button><button class="btn-secondary" onclick="showProfitReport()"><i class="ti ti-chart-bar"></i> ${cyber?'Margin Report':'Profit Report'}</button></div></div><div class="card" style="padding:0;overflow:hidden"><div class="table-wrap"><table><thead><tr><th>#</th><th>${L.passengerHeader}</th><th>${L.airlineHeader}</th><th>${L.colPnr}</th><th>${L.colDest}</th><th>Date</th><th>${L.netLabel}</th><th>${L.sellLabel}</th><th>${cyber?'Margin':'Profit'}</th><th>Status</th><th>Actions</th></tr></thead><tbody>${tickets.length===0?`<tr><td colspan="11"><div class="empty-state"><i class="ti ${cyber?'ti-briefcase':'ti-ticket'}"></i><h3>${cyber?'No services yet':'No tickets'}</h3></div></td></tr>`:tickets.map(t=>`<tr><td style="font-weight:700;cursor:pointer;color:#1A6FB5" onclick="viewTicket(${t.id})">${t.num}</td><td>${t.passenger||'—'}</td><td>${t.airline||'—'}</td><td>${t.pnr||'—'}</td><td>${t.destination||'—'}</td><td>${fmtDate(t.date)}</td><td>${fmt(t.net_price,t.currency)}</td><td>${fmt(t.selling_price,t.currency)}</td><td style="font-weight:700;color:#1a7a3a">${fmt(t.selling_price-t.net_price,t.currency)}</td><td>${t.status==='paid'?'<span class="badge badge-paid">Paid</span>':'<span class="badge badge-pending">Unpaid</span>'}</td><td class="actions-cell"><button class="action-btn edit" onclick="editTicket(${t.id})"><i class="ti ti-edit"></i> Edit</button><button class="action-btn danger" onclick="deleteTicket(${t.id})"><i class="ti ti-trash"></i> Delete</button></td></tr>`).join('')}</tbody></table></div></div><div id="profit-report-section"></div>`;}

function showProfitReport(){const firstDay=new Date(new Date().getFullYear(),0,1).toISOString().split('T')[0];document.getElementById('profit-report-section').innerHTML=`<div class="card" style="margin-top:1rem"><div class="card-header"><span class="card-title"><i class="ti ti-chart-bar"></i> ${isCyber()?'Margin Report':'Profit Report'}</span></div><div class="filter-bar" style="flex-wrap:wrap;gap:10px"><input type="date" class="form-input" id="rpt-tkt-from" value="${firstDay}" style="width:150px"/><span style="color:#aaa;align-self:center">to</span><input type="date" class="form-input" id="rpt-tkt-to" value="${today()}" style="width:150px"/><button class="btn-new" onclick="loadProfitReport()"><i class="ti ti-search"></i> Generate</button></div></div><div id="profit-report-result"></div>`;}

async function loadProfitReport(){const L=dl();const cyber=isCyber();const from=document.getElementById('rpt-tkt-from')?.value;const to=document.getElementById('rpt-tkt-to')?.value;const tickets=await api('GET','/api/tickets');const filtered=tickets.filter(t=>{const iso=t.date?t.date.split('T')[0]:'';return(!from||iso>=from)&&(!to||iso<=to);}).sort((a,b)=>(a.date||'').localeCompare(b.date||''));const totalProfit=filtered.reduce((a,t)=>a+(t.selling_price-t.net_price),0);const totalSelling=filtered.reduce((a,t)=>a+t.selling_price,0);const fmtNum=(n)=>Number(n||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});const rows=filtered.map((t,idx)=>`<tr style="background:${idx%2===0?'#f2f5fa':'#fff'}"><td style="padding:5px 8px;border:1px solid #ddd">${fmtDate(t.date)}</td><td style="padding:5px 8px;border:1px solid #ddd;font-weight:700">${t.num}</td><td style="padding:5px 8px;border:1px solid #ddd">${t.passenger||'—'}</td><td style="padding:5px 8px;border:1px solid #ddd">${t.airline||'—'}</td><td style="padding:5px 8px;border:1px solid #ddd">${t.destination||'—'}</td><td style="padding:5px 8px;border:1px solid #ddd;text-align:right">${fmtNum(t.net_price)}</td><td style="padding:5px 8px;border:1px solid #ddd;text-align:right;font-weight:700">${fmtNum(t.selling_price)}</td><td style="padding:5px 8px;border:1px solid #ddd;text-align:right;font-weight:700;color:#1a7a3a">${fmtNum(t.selling_price-t.net_price)}</td><td style="padding:5px 8px;border:1px solid #ddd">${t.status==='paid'?'<span style="color:#1a7a3a;font-weight:700">Paid</span>':'<span style="color:#888">Unpaid</span>'}</td></tr>`).join('');document.getElementById('profit-report-result').innerHTML=`<div class="card" style="margin-top:.5rem;padding:0;overflow:hidden"><div style="display:flex;justify-content:space-between;align-items:center;padding:.75rem 1rem;border-bottom:1px solid #eee"><span style="font-weight:700;font-size:14px">📊 ${cyber?'Margin Report':'Profit Report'}</span><button class="btn-secondary" onclick="printProfitReport()"><i class="ti ti-printer"></i> Print / PDF</button></div><div id="profit-report-printable" style="padding:1.25rem"><table style="width:100%;border-collapse:collapse;font-size:11.5px"><thead><tr style="background:#0a3258;color:#fff"><th style="padding:7px 8px;border:1px solid #0a3258">Date</th><th style="padding:7px 8px;border:1px solid #0a3258">#</th><th style="padding:7px 8px;border:1px solid #0a3258">${L.passengerHeader}</th><th style="padding:7px 8px;border:1px solid #0a3258">${L.airlineHeader}</th><th style="padding:7px 8px;border:1px solid #0a3258">${L.colDest}</th><th style="padding:7px 8px;border:1px solid #0a3258;text-align:right">${L.netLabel}</th><th style="padding:7px 8px;border:1px solid #0a3258;text-align:right">${L.sellLabel}</th><th style="padding:7px 8px;border:1px solid #0a3258;text-align:right">${cyber?'Margin':'Profit'}</th><th style="padding:7px 8px;border:1px solid #0a3258">Status</th></tr></thead><tbody>${filtered.length===0?`<tr><td colspan="9" style="text-align:center;padding:2rem;color:#aaa;border:1px solid #ddd">${cyber?'No services for this period':'No tickets for this period'}</td></tr>`:rows}</tbody><tfoot><tr style="background:#0a3258;color:#fff"><td colspan="5" style="padding:8px;border:1px solid #0a3258;font-weight:700">TOTAL</td><td style="padding:8px;border:1px solid #0a3258;text-align:right;font-weight:700">${fmtNum(totalSelling-totalProfit)}</td><td style="padding:8px;border:1px solid #0a3258;text-align:right;font-weight:700">${fmtNum(totalSelling)}</td><td style="padding:8px;border:1px solid #0a3258;text-align:right;font-weight:700;color:#90ee90">${fmtNum(totalProfit)}</td><td style="border:1px solid #0a3258"></td></tr></tfoot></table></div></div>`;}

function printProfitReport(){const content=document.getElementById('profit-report-printable')?.innerHTML;if(!content)return;const s=settings;const cyber=isCyber();const logoHtml=s.company_logo?`<img src="${s.company_logo}" style="height:60px;object-fit:contain" alt="Logo"/>`:`<div style="font-size:18px;font-weight:900;color:#0a3258">${s.company_name||(cyber?'M&S CYBER SYSTEMS':'✈ WHITE SKY')}</div>`;const win=window.open('','_blank');win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${cyber?'Margin Report':'Profit Report'}</title><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;font-size:11px;color:#222;background:#fff}.page{padding:20px 25px}.header{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:12px;border-bottom:3px solid #0a3258;margin-bottom:16px}.header-left{display:flex;align-items:center;gap:14px}.company-info{font-size:10px;color:#555;line-height:1.6}.company-name{font-size:13px;font-weight:700;color:#0a3258}.stmt-title{text-align:right}.stmt-title h1{font-size:22px;font-weight:900;color:#0a3258}table{width:100%;border-collapse:collapse;font-size:10.5px}thead tr{background:#0a3258;color:#fff}th{padding:7px 8px;border:1px solid #0a3258;text-align:left;font-weight:700;font-size:10px;text-transform:uppercase}td{padding:5px 8px;border:1px solid #ddd}tbody tr:nth-child(even) td{background:#f5f8fd}tfoot tr{background:#0a3258;color:#fff}tfoot td{border:1px solid #0a3258;font-weight:700}.footer{margin-top:20px;padding-top:10px;border-top:1px solid #ddd;display:flex;justify-content:space-between;font-size:9.5px;color:#aaa}@media print{body{padding:0}.page{padding:10px 15px}button{display:none!important}}</style></head><body><div class="page"><div class="header"><div class="header-left">${logoHtml}<div class="company-info"><div class="company-name">${s.company_name||''}</div><div>${s.company_address||''}</div><div>P: ${s.company_phone_p||''} | M: ${s.company_phone_m||''}</div></div></div><div class="stmt-title"><h1>${cyber?'MARGIN REPORT':'PROFIT REPORT'}</h1><p style="font-size:10px;color:#888;margin-top:4px">Generated on ${new Date().toLocaleDateString('en-GB')}</p></div></div>${content}<div class="footer"><span>${s.company_name||''}</span><span>Generated on ${new Date().toLocaleString('en-GB')}</span></div></div><script>window.onload=()=>window.print()<\/script></body></html>`);win.document.close();}

async function viewTicket(id){const t=await api('GET',`/api/tickets/${id}`);const L=dl();const mc=document.getElementById('main-content');mc.innerHTML=`<div class="page-header"><div><div class="page-title">${t.num}</div><div class="page-sub">${t.passenger||''} — ${t.status==='paid'?'<span class=\'badge badge-paid\'>Paid</span>':'<span class=\'badge badge-pending\'>Unpaid</span>'}</div></div><div class="header-actions"><button class="btn-secondary" onclick="showPage('tickets')"><i class="ti ti-arrow-left"></i> Back</button><button class="btn-secondary" onclick="editTicket(${t.id})"><i class="ti ti-edit"></i> Edit</button>${t.status!=='paid'?`<button class="btn-new" onclick="api('PATCH','/api/tickets/${t.id}/status',{status:'paid'}).then(()=>{toast('✅ Marked as paid','success');viewTicket(${t.id})})"><i class="ti ti-check"></i> Mark Paid</button>`:`<button class="btn-danger" onclick="api('PATCH','/api/tickets/${t.id}/status',{status:'unpaid'}).then(()=>{toast('Marked unpaid','error');viewTicket(${t.id})})"><i class="ti ti-x"></i> Mark Unpaid</button>`}<button class="action-btn" onclick="deleteTicket(${t.id})"><i class="ti ti-trash"></i></button></div></div><div class="card"><div class="form-grid2" style="gap:14px"><div class="form-group"><label class="form-label">${L.ticketNumLabel}</label><div style="padding:9px 12px;background:#f5f5f5;border-radius:7px;font-weight:700">${t.num}</div></div><div class="form-group"><label class="form-label">Date</label><div style="padding:9px 12px;background:#f5f5f5;border-radius:7px">${fmtDate(t.date)}</div></div><div class="form-group"><label class="form-label">${L.tktRefLabel}</label><div style="padding:9px 12px;background:#f5f5f5;border-radius:7px;font-weight:700">${t.pnr||'—'}</div></div><div class="form-group"><label class="form-label">${L.tktSysPnrLabel}</label><div style="padding:9px 12px;background:#f5f5f5;border-radius:7px">${t.company||'—'}</div></div><div class="form-group"><label class="form-label">${L.tktCategoryLabel}</label><div style="padding:9px 12px;background:#f5f5f5;border-radius:7px">${t.airline||'—'}</div></div><div class="form-group"><label class="form-label">${L.tktProjectLabel}</label><div style="padding:9px 12px;background:#f5f5f5;border-radius:7px">${t.destination||'—'}</div></div><div class="form-group"><label class="form-label">${L.tktContactLabel}</label><div style="padding:9px 12px;background:#f5f5f5;border-radius:7px">${t.passenger||'—'}</div></div><div class="form-group"><label class="form-label">${L.tktDeliveryLabel}</label><div style="padding:9px 12px;background:#f5f5f5;border-radius:7px">${t.system_issue||'—'}</div></div><div class="form-group"><label class="form-label">${L.netLabel}</label><div style="padding:9px 12px;background:#f5f5f5;border-radius:7px">${fmt(t.net_price,t.currency)}</div></div><div class="form-group"><label class="form-label">${L.sellLabel}</label><div style="padding:9px 12px;background:#f5f5f5;border-radius:7px;font-weight:700">${fmt(t.selling_price,t.currency)}</div></div><div class="form-group full"><label class="form-label">${isCyber()?'Margin':'Profit'}</label><div style="padding:9px 12px;background:#e6f9ee;border-radius:7px;font-weight:700;color:#1a7a3a;font-size:18px">${fmt(t.selling_price-t.net_price,t.currency)}</div></div>${t.notes?`<div class="form-group full"><label class="form-label">Notes</label><div style="padding:9px 12px;background:#f5f5f5;border-radius:7px">${t.notes}</div></div>`:''}</div></div>`;}
let _editTicketId=null;
async function pageNewTicket(mc){_editTicketId=null;allClients=await api('GET','/api/clients');const{num}=await api('GET','/api/tickets/next-num');renderTicketForm(mc,{num,date:today(),status:'unpaid',ticket_type:'individual'});}
async function editTicket(id){_editTicketId=id;const t=await api('GET',`/api/tickets/${id}`);allClients=await api('GET','/api/clients');const mc=document.getElementById('main-content');document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));renderTicketForm(mc,t);}
function renderTicketForm(mc,t){
  const isCompany=t.ticket_type==='company';
  const L=dl();
  mc.innerHTML=`<div class="page-header"><div><div class="page-title">${_editTicketId?(isCyber()?'Edit Service':'Edit Ticket'):L.newTicketTitle}</div></div><button class="btn-secondary" onclick="showPage('tickets')"><i class="ti ti-arrow-left"></i> Cancel</button></div>
<div class="card">
  <div style="display:flex;gap:8px;margin-bottom:1.2rem">
    <button id="tkt-type-indiv" onclick="switchTktType('individual')" class="${!isCompany?'btn-new':'btn-secondary'}" style="border-radius:8px"><i class="ti ti-user"></i> Individual</button>
    <button id="tkt-type-company" onclick="switchTktType('company')" class="${isCompany?'btn-new':'btn-secondary'}" style="border-radius:8px"><i class="ti ti-building"></i> Company</button>
  </div>
  <input type="hidden" id="tkt-type" value="${t.ticket_type||'individual'}"/>
  <div class="form-grid2" style="gap:14px">
    <div class="form-group"><label class="form-label">${L.ticketNumLabel}</label><input class="form-input" id="tkt-num" value="${t.num||''}" ${_editTicketId?'readonly style="background:#f5f5f5"':''}/></div>
    <div class="form-group"><label class="form-label">Date</label><input type="date" class="form-input" id="tkt-date" value="${t.date||today()}"/></div>
    <div class="form-group full" id="tkt-company-row" style="display:${isCompany?'block':'none'}">
      <label class="form-label">${L.tktCompanyRow}</label>
      <select class="form-input" id="tkt-client-id" onchange="fillTktCompany(this)">
        <option value="">-- Select Company --</option>
        ${allClients.map(c=>`<option value="${c.id}" data-name="${c.name}" ${t.client_id==c.id?'selected':''}>${c.name}</option>`).join('')}
      </select>
    </div>
    <div class="form-group" id="tkt-passenger-row" style="display:${!isCompany?'block':'none'}">
      <label class="form-label">${L.tktContactLabel}</label>
      <input class="form-input" id="tkt-passenger" value="${t.passenger||''}" placeholder="${L.tktContactPh}"/>
    </div>
    <div class="form-group"><label class="form-label">${L.tktRefLabel}</label><input class="form-input" id="tkt-pnr" value="${t.pnr||''}" placeholder="${L.tktRefPh}"/></div>
    <div class="form-group"><label class="form-label">${L.tktSysPnrLabel}</label><input class="form-input" id="tkt-company" value="${t.company||''}" placeholder="${L.tktSysPnrPh}"/></div>
    <div class="form-group"><label class="form-label">${L.tktCategoryLabel}</label><input class="form-input" id="tkt-airline" value="${t.airline||''}" placeholder="${L.tktCategoryPh}"/></div>
    <div class="form-group"><label class="form-label">${L.tktProjectLabel}</label><input class="form-input" id="tkt-destination" value="${t.destination||''}" placeholder="${L.tktProjectPh}"/></div>
    <div class="form-group"><label class="form-label">${L.tktDeliveryLabel}</label><input ${isCyber()?'type="date"':''} class="form-input" id="tkt-system" value="${t.system_issue||''}" placeholder="${L.tktDeliveryPh}"/></div>
    <div class="form-group"><label class="form-label">Currency</label><select class="form-input" id="tkt-currency"><option ${(t.currency||'KWD')==='KWD'?'selected':''}>KWD</option><option ${t.currency==='USD'?'selected':''}>USD</option><option ${t.currency==='EUR'?'selected':''}>EUR</option><option ${t.currency==='LBP'?'selected':''}>LBP</option><option ${t.currency==='AED'?'selected':''}>AED</option><option ${t.currency==='SAR'?'selected':''}>SAR</option></select></div>
    <div class="form-group"><label class="form-label">${L.netLabel}</label><input type="number" class="form-input" id="tkt-net" value="${t.net_price||0}" min="0" step="0.01" oninput="calcProfit()"/></div>
    <div class="form-group"><label class="form-label">${L.sellLabel}</label><input type="number" class="form-input" id="tkt-selling" value="${t.selling_price||0}" min="0" step="0.01" oninput="calcProfit()"/></div>
    <div class="form-group full"><label class="form-label">${isCyber()?'Margin':'Profit'}</label><div id="tkt-profit" style="padding:9px 12px;background:#e6f9ee;border-radius:7px;font-weight:700;color:#1a7a3a;font-size:16px">${fmt((t.selling_price||0)-(t.net_price||0))}</div></div>
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

/* HOTELS */
async function pageHotels(mc){const hotels=await api('GET','/api/hotels');mc.innerHTML=`<div class="page-header"><div><div class="page-title">Hotels</div><div class="page-sub">${hotels.length} booking(s)</div></div><div class="header-actions"><button class="btn-new" onclick="showPage('new-hotel')"><i class="ti ti-plus"></i> New Hotel Booking</button></div></div><div class="card" style="padding:0;overflow:hidden"><div class="table-wrap"><table><thead><tr><th>#</th><th>Guest</th><th>Hotel</th><th>Destination</th><th>Check-in</th><th>Check-out</th><th>Net</th><th>Sell</th><th>Profit</th><th>Status</th><th>Actions</th></tr></thead><tbody>${hotels.length===0?`<tr><td colspan="11"><div class="empty-state"><i class="ti ti-building-skyscraper"></i><h3>No hotel bookings</h3></div></td></tr>`:hotels.map(h=>`<tr><td style="font-weight:700;cursor:pointer;color:#1A6FB5" onclick="viewHotel(${h.id})">${h.num}</td><td>${h.passenger||'—'}</td><td>${h.hotel_name||'—'}</td><td>${h.destination||'—'}</td><td>${fmtDate(h.checkin_date)}</td><td>${fmtDate(h.checkout_date)}</td><td>${fmt(h.net_price,h.currency)}</td><td>${fmt(h.selling_price,h.currency)}</td><td style="font-weight:700;color:#1a7a3a">${fmt(h.selling_price-h.net_price,h.currency)}</td><td>${h.status==='paid'?'<span class="badge badge-paid">Paid</span>':'<span class="badge badge-pending">Unpaid</span>'}</td><td class="actions-cell"><button class="action-btn edit" onclick="editHotel(${h.id})"><i class="ti ti-edit"></i> Edit</button><button class="action-btn danger" onclick="deleteHotel(${h.id})"><i class="ti ti-trash"></i> Delete</button></td></tr>`).join('')}</tbody></table></div></div>`;}
async function viewHotel(id){const h=await api('GET',`/api/hotels/${id}`);const mc=document.getElementById('main-content');mc.innerHTML=`<div class="page-header"><div><div class="page-title">${h.num}</div><div class="page-sub">${h.passenger||''} — ${h.status==='paid'?'<span class=\'badge badge-paid\'>Paid</span>':'<span class=\'badge badge-pending\'>Unpaid</span>'}</div></div><div class="header-actions"><button class="btn-secondary" onclick="showPage('hotels')"><i class="ti ti-arrow-left"></i> Back</button><button class="btn-secondary" onclick="editHotel(${h.id})"><i class="ti ti-edit"></i> Edit</button>${h.status!=='paid'?`<button class="btn-new" onclick="api('PATCH','/api/hotels/${h.id}/status',{status:'paid'}).then(()=>{toast('✅ Marked as paid','success');viewHotel(${h.id})})"><i class="ti ti-check"></i> Mark Paid</button>`:`<button class="btn-danger" onclick="api('PATCH','/api/hotels/${h.id}/status',{status:'unpaid'}).then(()=>{toast('Marked unpaid','error');viewHotel(${h.id})})"><i class="ti ti-x"></i> Mark Unpaid</button>`}<button class="action-btn" onclick="deleteHotel(${h.id})"><i class="ti ti-trash"></i></button></div></div><div class="card"><div class="form-grid2" style="gap:14px"><div class="form-group"><label class="form-label">Booking #</label><div style="padding:9px 12px;background:#f5f5f5;border-radius:7px;font-weight:700">${h.num}</div></div><div class="form-group"><label class="form-label">Hotel</label><div style="padding:9px 12px;background:#f5f5f5;border-radius:7px">${h.hotel_name||'—'}</div></div><div class="form-group"><label class="form-label">Confirmation #</label><div style="padding:9px 12px;background:#f5f5f5;border-radius:7px">${h.confirmation_num||'—'}</div></div><div class="form-group"><label class="form-label">Destination</label><div style="padding:9px 12px;background:#f5f5f5;border-radius:7px">${h.destination||'—'}</div></div><div class="form-group"><label class="form-label">Room Type</label><div style="padding:9px 12px;background:#f5f5f5;border-radius:7px">${h.room_type||'—'}</div></div><div class="form-group"><label class="form-label">Guest</label><div style="padding:9px 12px;background:#f5f5f5;border-radius:7px">${h.passenger||'—'}</div></div><div class="form-group"><label class="form-label">Check-in</label><div style="padding:9px 12px;background:#f5f5f5;border-radius:7px">${fmtDate(h.checkin_date)}</div></div><div class="form-group"><label class="form-label">Check-out</label><div style="padding:9px 12px;background:#f5f5f5;border-radius:7px">${fmtDate(h.checkout_date)}</div></div><div class="form-group"><label class="form-label">Net Price</label><div style="padding:9px 12px;background:#f5f5f5;border-radius:7px">${fmt(h.net_price,h.currency)}</div></div><div class="form-group"><label class="form-label">Selling Price</label><div style="padding:9px 12px;background:#f5f5f5;border-radius:7px;font-weight:700">${fmt(h.selling_price,h.currency)}</div></div><div class="form-group full"><label class="form-label">Profit</label><div style="padding:9px 12px;background:#e6f9ee;border-radius:7px;font-weight:700;color:#1a7a3a;font-size:18px">${fmt(h.selling_price-h.net_price,h.currency)}</div></div>${h.notes?`<div class="form-group full"><label class="form-label">Notes</label><div style="padding:9px 12px;background:#f5f5f5;border-radius:7px">${h.notes}</div></div>`:''}</div></div>`;}
async function pageNewHotel(mc){_editHotelId=null;allClients=await api('GET','/api/clients');const{num}=await api('GET','/api/hotels/next-num');renderHotelForm(mc,{num,checkin_date:today(),status:'unpaid',booking_type:'individual'});}
async function editHotel(id){_editHotelId=id;const h=await api('GET',`/api/hotels/${id}`);allClients=await api('GET','/api/clients');const mc=document.getElementById('main-content');document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));renderHotelForm(mc,h);}
function renderHotelForm(mc,h){
  const isCompany=h.booking_type==='company';
  mc.innerHTML=`<div class="page-header"><div><div class="page-title">${_editHotelId?'Edit Hotel Booking':'New Hotel Booking'}</div></div><button class="btn-secondary" onclick="showPage('hotels')"><i class="ti ti-arrow-left"></i> Cancel</button></div>
<div class="card">
  <div style="display:flex;gap:8px;margin-bottom:1.2rem">
    <button id="htl-type-indiv" onclick="switchHtlType('individual')" class="${!isCompany?'btn-new':'btn-secondary'}" style="border-radius:8px"><i class="ti ti-user"></i> Individual</button>
    <button id="htl-type-company" onclick="switchHtlType('company')" class="${isCompany?'btn-new':'btn-secondary'}" style="border-radius:8px"><i class="ti ti-building"></i> Company</button>
  </div>
  <input type="hidden" id="htl-type" value="${h.booking_type||'individual'}"/>
  <div class="form-grid2" style="gap:14px">
    <div class="form-group"><label class="form-label">Booking #</label><input class="form-input" id="htl-num" value="${h.num||''}" ${_editHotelId?'readonly style="background:#f5f5f5"':''}/></div>
    <div class="form-group"><label class="form-label">Hotel</label><input class="form-input" id="htl-hotel-name" value="${h.hotel_name||''}" placeholder="e.g. Lancaster Beirut"/></div>
    <div class="form-group full" id="htl-company-row" style="display:${isCompany?'block':'none'}">
      <label class="form-label">Company (Client)</label>
      <select class="form-input" id="htl-client-id" onchange="fillHtlCompany(this)">
        <option value="">-- Select Company --</option>
        ${allClients.map(c=>`<option value="${c.id}" data-name="${c.name}" ${h.client_id==c.id?'selected':''}>${c.name}</option>`).join('')}
      </select>
    </div>
    <div class="form-group" id="htl-passenger-row" style="display:${!isCompany?'block':'none'}">
      <label class="form-label">Guest Name</label>
      <input class="form-input" id="htl-passenger" value="${h.passenger||''}" placeholder="FULL NAME"/>
    </div>
    <div class="form-group"><label class="form-label">Confirmation #</label><input class="form-input" id="htl-confirmation" value="${h.confirmation_num||''}"/></div>
    <div class="form-group"><label class="form-label">Destination / City</label><input class="form-input" id="htl-destination" value="${h.destination||''}"/></div>
    <div class="form-group"><label class="form-label">Room Type</label><input class="form-input" id="htl-room" value="${h.room_type||''}" placeholder="e.g. Double, Suite"/></div>
    <div class="form-group"><label class="form-label">Check-in</label><input type="date" class="form-input" id="htl-checkin" value="${h.checkin_date||today()}"/></div>
    <div class="form-group"><label class="form-label">Check-out</label><input type="date" class="form-input" id="htl-checkout" value="${h.checkout_date||''}"/></div>
    <div class="form-group"><label class="form-label">Currency</label><select class="form-input" id="htl-currency"><option ${(h.currency||'KWD')==='KWD'?'selected':''}>KWD</option><option ${h.currency==='USD'?'selected':''}>USD</option><option ${h.currency==='EUR'?'selected':''}>EUR</option><option ${h.currency==='LBP'?'selected':''}>LBP</option><option ${h.currency==='AED'?'selected':''}>AED</option><option ${h.currency==='SAR'?'selected':''}>SAR</option></select></div>
    <div class="form-group"><label class="form-label">Net Price</label><input type="number" class="form-input" id="htl-net" value="${h.net_price||0}" min="0" step="0.01" oninput="calcHtlProfit()"/></div>
    <div class="form-group"><label class="form-label">Selling Price</label><input type="number" class="form-input" id="htl-selling" value="${h.selling_price||0}" min="0" step="0.01" oninput="calcHtlProfit()"/></div>
    <div class="form-group full"><label class="form-label">Profit</label><div id="htl-profit" style="padding:9px 12px;background:#e6f9ee;border-radius:7px;font-weight:700;color:#1a7a3a;font-size:16px">${fmt((h.selling_price||0)-(h.net_price||0))}</div></div>
    <div class="form-group"><label class="form-label">Status</label><select class="form-input" id="htl-status"><option value="unpaid" ${(h.status||'unpaid')==='unpaid'?'selected':''}>Unpaid</option><option value="paid" ${h.status==='paid'?'selected':''}>Paid</option></select></div>
    <div class="form-group full"><label class="form-label">Notes</label><textarea class="form-input" id="htl-notes" rows="2">${h.notes||''}</textarea></div>
  </div>
  <div class="form-actions"><button class="btn-secondary" onclick="showPage('hotels')">Cancel</button><button class="btn-save" onclick="saveHotel()"><i class="ti ti-send" style="vertical-align:-2px;margin-right:5px"></i>${_editHotelId?'Update':'Save Booking'}</button></div>
</div>`;calcHtlProfit();}
function switchHtlType(type){document.getElementById('htl-type').value=type;const isCompany=type==='company';document.getElementById('htl-type-indiv').className=!isCompany?'btn-new':'btn-secondary';document.getElementById('htl-type-indiv').style.borderRadius='8px';document.getElementById('htl-type-company').className=isCompany?'btn-new':'btn-secondary';document.getElementById('htl-type-company').style.borderRadius='8px';document.getElementById('htl-company-row').style.display=isCompany?'block':'none';document.getElementById('htl-passenger-row').style.display=!isCompany?'block':'none';}
function fillHtlCompany(sel){const o=sel.querySelector(`option[value="${sel.value}"]`);if(o&&sel.value){document.getElementById('htl-passenger').value=o.dataset.name||o.textContent;}}
function calcHtlProfit(){const net=parseFloat(document.getElementById('htl-net')?.value)||0;const sell=parseFloat(document.getElementById('htl-selling')?.value)||0;const el=document.getElementById('htl-profit');if(el)el.textContent=fmt(sell-net);}
async function saveHotel(){const type=document.getElementById('htl-type')?.value||'individual';const clientId=type==='company'?document.getElementById('htl-client-id')?.value||null:null;const passenger=document.getElementById('htl-passenger')?.value.trim()||'';const body={num:document.getElementById('htl-num')?.value.trim(),hotel_name:document.getElementById('htl-hotel-name')?.value.trim(),confirmation_num:document.getElementById('htl-confirmation')?.value.trim(),destination:document.getElementById('htl-destination')?.value.trim(),room_type:document.getElementById('htl-room')?.value.trim(),passenger,checkin_date:document.getElementById('htl-checkin')?.value,checkout_date:document.getElementById('htl-checkout')?.value,currency:document.getElementById('htl-currency')?.value||'KWD',net_price:document.getElementById('htl-net')?.value||0,selling_price:document.getElementById('htl-selling')?.value||0,status:document.getElementById('htl-status')?.value||'unpaid',notes:document.getElementById('htl-notes')?.value.trim(),booking_type:type,client_id:clientId};let r;if(_editHotelId){r=await api('PUT',`/api/hotels/${_editHotelId}`,body);toast('✅ Booking updated','success');}else{r=await api('POST','/api/hotels',body);toast('✅ Booking saved','success');}if(r&&r.error){toast(r.error,'error');return;}if(_editHotelId)viewHotel(_editHotelId);else showPage('hotels');}
async function deleteHotel(id){if(!confirm('Delete this hotel booking?'))return;await api('DELETE',`/api/hotels/${id}`);toast('Booking deleted');showPage('hotels');}

/* VISAS */
async function pageVisas(mc){const visas=await api('GET','/api/visas');const stBadge={submitted:'<span class="badge badge-pending">Submitted</span>',approved:'<span class="badge badge-paid">Approved</span>',rejected:'<span class="badge badge-overdue">Rejected</span>'};mc.innerHTML=`<div class="page-header"><div><div class="page-title">Visas</div><div class="page-sub">${visas.length} application(s)</div></div><div class="header-actions"><button class="btn-new" onclick="showPage('new-visa')"><i class="ti ti-plus"></i> New Visa</button></div></div><div class="card" style="padding:0;overflow:hidden"><div class="table-wrap"><table><thead><tr><th>#</th><th>Client</th><th>Visa Type</th><th>Country</th><th>Appointment</th><th>Net</th><th>Sell</th><th>Status</th><th>Actions</th></tr></thead><tbody>${visas.length===0?`<tr><td colspan="9"><div class="empty-state"><i class="ti ti-id"></i><h3>No visa applications</h3></div></td></tr>`:visas.map(v=>`<tr><td style="font-weight:700;cursor:pointer;color:#1A6FB5" onclick="viewVisa(${v.id})">${v.num}</td><td>${v.passenger||'—'}</td><td>${v.visa_type||'—'}</td><td>${v.country||'—'}</td><td>${fmtDate(v.appointment_date)}</td><td>${fmt(v.net_price,v.currency)}</td><td>${fmt(v.selling_price,v.currency)}</td><td>${stBadge[v.status]||stBadge.submitted}</td><td class="actions-cell"><button class="action-btn edit" onclick="editVisa(${v.id})"><i class="ti ti-edit"></i> Edit</button><button class="action-btn danger" onclick="deleteVisa(${v.id})"><i class="ti ti-trash"></i> Delete</button></td></tr>`).join('')}</tbody></table></div></div>`;}
async function viewVisa(id){const v=await api('GET',`/api/visas/${id}`);const mc=document.getElementById('main-content');const stBadge={submitted:'<span class="badge badge-pending">Submitted</span>',approved:'<span class="badge badge-paid">Approved</span>',rejected:'<span class="badge badge-overdue">Rejected</span>'};mc.innerHTML=`<div class="page-header"><div><div class="page-title">${v.num}</div><div class="page-sub">${v.passenger||''} — ${stBadge[v.status]||stBadge.submitted}</div></div><div class="header-actions"><button class="btn-secondary" onclick="showPage('visas')"><i class="ti ti-arrow-left"></i> Back</button><button class="btn-secondary" onclick="editVisa(${v.id})"><i class="ti ti-edit"></i> Edit</button><select class="form-input" style="width:auto;display:inline-block" onchange="api('PATCH','/api/visas/${v.id}/status',{status:this.value}).then(()=>{toast('Status updated','success');viewVisa(${v.id})})"><option value="submitted" ${v.status==='submitted'?'selected':''}>Submitted</option><option value="approved" ${v.status==='approved'?'selected':''}>Approved</option><option value="rejected" ${v.status==='rejected'?'selected':''}>Rejected</option></select><button class="action-btn" onclick="deleteVisa(${v.id})"><i class="ti ti-trash"></i></button></div></div><div class="card"><div class="form-grid2" style="gap:14px"><div class="form-group"><label class="form-label">Application #</label><div style="padding:9px 12px;background:#f5f5f5;border-radius:7px;font-weight:700">${v.num}</div></div><div class="form-group"><label class="form-label">Visa Type</label><div style="padding:9px 12px;background:#f5f5f5;border-radius:7px">${v.visa_type||'—'}</div></div><div class="form-group"><label class="form-label">Country</label><div style="padding:9px 12px;background:#f5f5f5;border-radius:7px">${v.country||'—'}</div></div><div class="form-group"><label class="form-label">Client</label><div style="padding:9px 12px;background:#f5f5f5;border-radius:7px">${v.passenger||'—'}</div></div><div class="form-group"><label class="form-label">Passport #</label><div style="padding:9px 12px;background:#f5f5f5;border-radius:7px">${v.passport_num||'—'}</div></div><div class="form-group"><label class="form-label">Embassy Appointment</label><div style="padding:9px 12px;background:#f5f5f5;border-radius:7px">${fmtDate(v.appointment_date)}</div></div><div class="form-group"><label class="form-label">Net Price</label><div style="padding:9px 12px;background:#f5f5f5;border-radius:7px">${fmt(v.net_price,v.currency)}</div></div><div class="form-group"><label class="form-label">Selling Price</label><div style="padding:9px 12px;background:#f5f5f5;border-radius:7px;font-weight:700">${fmt(v.selling_price,v.currency)}</div></div>${v.visa_file?`<div class="form-group full"><label class="form-label">Visa Document</label><div style="padding:9px 12px;background:#f5f5f5;border-radius:7px"><a href="${v.visa_file}" target="_blank" style="color:#1A6FB5;font-weight:700"><i class="ti ti-file-check"></i> View / Download</a></div></div>`:''}${v.notes?`<div class="form-group full"><label class="form-label">Notes</label><div style="padding:9px 12px;background:#f5f5f5;border-radius:7px">${v.notes}</div></div>`:''}</div></div>`;}
async function pageNewVisa(mc){_editVisaId=null;_editVisaFile=null;allClients=await api('GET','/api/clients');const{num}=await api('GET','/api/visas/next-num');renderVisaForm(mc,{num,date:today(),status:'submitted',booking_type:'individual'});}
async function editVisa(id){_editVisaId=id;const v=await api('GET',`/api/visas/${id}`);_editVisaFile=v.visa_file||null;allClients=await api('GET','/api/clients');const mc=document.getElementById('main-content');document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));renderVisaForm(mc,v);}
function renderVisaForm(mc,v){
  const isCompany=v.booking_type==='company';
  mc.innerHTML=`<div class="page-header"><div><div class="page-title">${_editVisaId?'Edit Visa':'New Visa'}</div></div><button class="btn-secondary" onclick="showPage('visas')"><i class="ti ti-arrow-left"></i> Cancel</button></div>
<div class="card">
  <div style="display:flex;gap:8px;margin-bottom:1.2rem">
    <button id="visa-type-indiv" onclick="switchVisaType('individual')" class="${!isCompany?'btn-new':'btn-secondary'}" style="border-radius:8px"><i class="ti ti-user"></i> Individual</button>
    <button id="visa-type-company" onclick="switchVisaType('company')" class="${isCompany?'btn-new':'btn-secondary'}" style="border-radius:8px"><i class="ti ti-building"></i> Company</button>
  </div>
  <input type="hidden" id="visa-type" value="${v.booking_type||'individual'}"/>
  <div class="form-grid2" style="gap:14px">
    <div class="form-group"><label class="form-label">Application #</label><input class="form-input" id="visa-num" value="${v.num||''}" ${_editVisaId?'readonly style="background:#f5f5f5"':''}/></div>
    <div class="form-group"><label class="form-label">Date</label><input type="date" class="form-input" id="visa-date" value="${v.date||today()}"/></div>
    <div class="form-group full" id="visa-company-row" style="display:${isCompany?'block':'none'}">
      <label class="form-label">Company (Client)</label>
      <select class="form-input" id="visa-client-id" onchange="fillVisaCompany(this)">
        <option value="">-- Select Company --</option>
        ${allClients.map(c=>`<option value="${c.id}" data-name="${c.name}" ${v.client_id==c.id?'selected':''}>${c.name}</option>`).join('')}
      </select>
    </div>
    <div class="form-group" id="visa-passenger-row" style="display:${!isCompany?'block':'none'}">
      <label class="form-label">Client Name</label>
      <input class="form-input" id="visa-passenger" value="${v.passenger||''}" placeholder="FULL NAME"/>
    </div>
    <div class="form-group"><label class="form-label">Passport #</label><input class="form-input" id="visa-passport" value="${v.passport_num||''}"/></div>
    <div class="form-group"><label class="form-label">Visa Type</label><input class="form-input" id="visa-vtype" value="${v.visa_type||''}" placeholder="e.g. Tourist, Business, Umrah"/></div>
    <div class="form-group"><label class="form-label">Country</label><input class="form-input" id="visa-country" value="${v.country||''}"/></div>
    <div class="form-group"><label class="form-label">Embassy Appointment</label><input type="date" class="form-input" id="visa-appointment" value="${v.appointment_date||''}"/></div>
    <div class="form-group"><label class="form-label">Currency</label><select class="form-input" id="visa-currency"><option ${(v.currency||'KWD')==='KWD'?'selected':''}>KWD</option><option ${v.currency==='USD'?'selected':''}>USD</option><option ${v.currency==='EUR'?'selected':''}>EUR</option><option ${v.currency==='LBP'?'selected':''}>LBP</option><option ${v.currency==='AED'?'selected':''}>AED</option><option ${v.currency==='SAR'?'selected':''}>SAR</option></select></div>
    <div class="form-group"><label class="form-label">Net Price (embassy/processing cost)</label><input type="number" class="form-input" id="visa-net" value="${v.net_price||0}" min="0" step="0.01"/></div>
    <div class="form-group"><label class="form-label">Selling Price (fee charged)</label><input type="number" class="form-input" id="visa-selling" value="${v.selling_price||0}" min="0" step="0.01"/></div>
    <div class="form-group"><label class="form-label">Status</label><select class="form-input" id="visa-status"><option value="submitted" ${(v.status||'submitted')==='submitted'?'selected':''}>Submitted</option><option value="approved" ${v.status==='approved'?'selected':''}>Approved</option><option value="rejected" ${v.status==='rejected'?'selected':''}>Rejected</option></select></div>
    <div class="form-group full"><label class="form-label">Visa Document</label><input type="file" accept="image/*,.pdf" class="form-input" onchange="uploadVisaFile(this)"/><div id="visa-file-preview" style="margin-top:8px">${v.visa_file?`<a href="${v.visa_file}" target="_blank" style="font-size:12px;color:#1A6FB5;font-weight:700"><i class="ti ti-file-check"></i> View uploaded document</a>`:'<span style="font-size:12px;color:#aaa">No document uploaded</span>'}</div></div>
    <div class="form-group full"><label class="form-label">Notes</label><textarea class="form-input" id="visa-notes" rows="2">${v.notes||''}</textarea></div>
  </div>
  <div class="form-actions"><button class="btn-secondary" onclick="showPage('visas')">Cancel</button><button class="btn-save" onclick="saveVisa()"><i class="ti ti-send" style="vertical-align:-2px;margin-right:5px"></i>${_editVisaId?'Update':'Save Visa'}</button></div>
</div>`;}
function uploadVisaFile(input){const file=input.files[0];if(!file)return;const reader=new FileReader();reader.onload=(e)=>{_editVisaFile=e.target.result;const prev=document.getElementById('visa-file-preview');if(prev)prev.innerHTML=`<a href="${_editVisaFile}" target="_blank" style="font-size:12px;color:#1A6FB5;font-weight:700"><i class="ti ti-file-check"></i> View uploaded document</a>`;toast('Document ready — click Save to attach it','success');};reader.readAsDataURL(file);}
function switchVisaType(type){document.getElementById('visa-type').value=type;const isCompany=type==='company';document.getElementById('visa-type-indiv').className=!isCompany?'btn-new':'btn-secondary';document.getElementById('visa-type-indiv').style.borderRadius='8px';document.getElementById('visa-type-company').className=isCompany?'btn-new':'btn-secondary';document.getElementById('visa-type-company').style.borderRadius='8px';document.getElementById('visa-company-row').style.display=isCompany?'block':'none';document.getElementById('visa-passenger-row').style.display=!isCompany?'block':'none';}
function fillVisaCompany(sel){const o=sel.querySelector(`option[value="${sel.value}"]`);if(o&&sel.value){document.getElementById('visa-passenger').value=o.dataset.name||o.textContent;}}
async function saveVisa(){const type=document.getElementById('visa-type')?.value||'individual';const clientId=type==='company'?document.getElementById('visa-client-id')?.value||null:null;const passenger=document.getElementById('visa-passenger')?.value.trim()||'';const body={num:document.getElementById('visa-num')?.value.trim(),date:document.getElementById('visa-date')?.value,passport_num:document.getElementById('visa-passport')?.value.trim(),visa_type:document.getElementById('visa-vtype')?.value.trim(),country:document.getElementById('visa-country')?.value.trim(),appointment_date:document.getElementById('visa-appointment')?.value,passenger,currency:document.getElementById('visa-currency')?.value||'KWD',net_price:document.getElementById('visa-net')?.value||0,selling_price:document.getElementById('visa-selling')?.value||0,status:document.getElementById('visa-status')?.value||'submitted',notes:document.getElementById('visa-notes')?.value.trim(),booking_type:type,client_id:clientId,visa_file:_editVisaFile};let r;if(_editVisaId){r=await api('PUT',`/api/visas/${_editVisaId}`,body);toast('✅ Visa updated','success');}else{r=await api('POST','/api/visas',body);toast('✅ Visa saved','success');}if(r&&r.error){toast(r.error,'error');return;}if(_editVisaId)viewVisa(_editVisaId);else showPage('visas');}
async function deleteVisa(id){if(!confirm('Delete this visa application?'))return;await api('DELETE',`/api/visas/${id}`);toast('Visa deleted');showPage('visas');}

/* GROUPS */
async function pageGroups(mc){const groups=await api('GET','/api/groups');const stBadge={draft:'<span class="badge badge-draft">Draft</span>',confirmed:'<span class="badge badge-paid">Confirmed</span>',completed:'<span class="badge badge-sent">Completed</span>',cancelled:'<span class="badge badge-overdue">Cancelled</span>'};mc.innerHTML=`<div class="page-header"><div><div class="page-title">Groups</div><div class="page-sub">${groups.length} group(s)</div></div><div class="header-actions"><button class="btn-new" onclick="showPage('new-group')"><i class="ti ti-plus"></i> New Group</button></div></div><div class="card" style="padding:0;overflow:hidden"><div class="table-wrap"><table><thead><tr><th>#</th><th>Group Name</th><th>Destination</th><th>Departure</th><th>Return</th><th>Travelers</th><th>Collected / Expected</th><th>Status</th><th>Actions</th></tr></thead><tbody>${groups.length===0?`<tr><td colspan="9"><div class="empty-state"><i class="ti ti-users-group"></i><h3>No groups yet</h3></div></td></tr>`:groups.map(g=>`<tr><td style="font-weight:700;cursor:pointer;color:#1A6FB5" onclick="viewGroup(${g.id})">${g.num}</td><td>${g.name||'—'}</td><td>${g.destination||'—'}</td><td>${fmtDate(g.departure_date)}</td><td>${fmtDate(g.return_date)}</td><td>${g.travelerCount||0}</td><td>${fmt(g.totalCollected,g.currency)} / ${fmt(g.totalExpected,g.currency)}</td><td>${stBadge[g.status]||stBadge.draft}</td><td class="actions-cell"><button class="action-btn edit" onclick="editGroup(${g.id})"><i class="ti ti-edit"></i> Edit</button><button class="action-btn danger" onclick="deleteGroup(${g.id})"><i class="ti ti-trash"></i> Delete</button></td></tr>`).join('')}</tbody></table></div></div>`;}
async function viewGroup(id){const g=await api('GET',`/api/groups/${id}`);const mc=document.getElementById('main-content');const stBadge={draft:'<span class="badge badge-draft">Draft</span>',confirmed:'<span class="badge badge-paid">Confirmed</span>',completed:'<span class="badge badge-sent">Completed</span>',cancelled:'<span class="badge badge-overdue">Cancelled</span>'};const travelers=g.travelers||[];const collected=travelers.reduce((a,t)=>a+(t.paid?(parseFloat(t.amount)||0):0),0);const expected=travelers.reduce((a,t)=>a+(parseFloat(t.amount)||0),0);mc.innerHTML=`<div class="page-header"><div><div class="page-title">${g.num} — ${g.name||''}</div><div class="page-sub">${g.destination||''} — ${stBadge[g.status]||stBadge.draft}</div></div><div class="header-actions"><button class="btn-secondary" onclick="showPage('groups')"><i class="ti ti-arrow-left"></i> Back</button><button class="btn-secondary" onclick="editGroup(${g.id})"><i class="ti ti-edit"></i> Edit</button><button class="action-btn" onclick="deleteGroup(${g.id})"><i class="ti ti-trash"></i></button></div></div>
<div class="card" style="margin-bottom:1rem"><div class="form-grid2" style="gap:14px"><div class="form-group"><label class="form-label">Departure</label><div style="padding:9px 12px;background:#f5f5f5;border-radius:7px">${fmtDate(g.departure_date)}</div></div><div class="form-group"><label class="form-label">Return</label><div style="padding:9px 12px;background:#f5f5f5;border-radius:7px">${fmtDate(g.return_date)}</div></div><div class="form-group"><label class="form-label">Collected</label><div style="padding:9px 12px;background:#e6f9ee;border-radius:7px;font-weight:700;color:#1a7a3a">${fmt(collected,g.currency)}</div></div><div class="form-group"><label class="form-label">Expected Total</label><div style="padding:9px 12px;background:#f5f5f5;border-radius:7px;font-weight:700">${fmt(expected,g.currency)}</div></div>${g.notes?`<div class="form-group full"><label class="form-label">Notes</label><div style="padding:9px 12px;background:#f5f5f5;border-radius:7px">${g.notes}</div></div>`:''}</div></div>
<div class="card" style="padding:0;overflow:hidden"><div class="card-header" style="padding:1rem"><span class="card-title">Travelers (${travelers.length})</span></div><div class="table-wrap"><table><thead><tr><th>Name</th><th>Phone</th><th>Room</th><th>Amount</th><th>Payment</th><th>Notes</th></tr></thead><tbody>${travelers.length===0?`<tr><td colspan="6"><div class="empty-state"><i class="ti ti-users"></i><h3>No travelers added</h3></div></td></tr>`:travelers.map(t=>`<tr><td style="font-weight:700">${t.name||'—'}</td><td>${t.phone||'—'}</td><td>${t.room_no||'—'}</td><td>${fmt(t.amount,g.currency)}</td><td>${t.paid?'<span class="badge badge-paid">Paid</span>':'<span class="badge badge-pending">Unpaid</span>'}</td><td>${t.notes||'—'}</td></tr>`).join('')}</tbody></table></div></div>`;}
async function pageNewGroup(mc){_editGroupId=null;editGroupTravelers=[];const{num}=await api('GET','/api/groups/next-num');renderGroupForm(mc,{num,departure_date:today(),status:'draft',currency:settings.invoice_currency||'KWD'});}
async function editGroup(id){_editGroupId=id;const g=await api('GET',`/api/groups/${id}`);editGroupTravelers=(g.travelers||[]).map(t=>({...t}));const mc=document.getElementById('main-content');document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));renderGroupForm(mc,g);}
function renderGroupForm(mc,g){
  mc.innerHTML=`<div class="page-header"><div><div class="page-title">${_editGroupId?'Edit Group':'New Group'}</div></div><button class="btn-secondary" onclick="showPage('groups')"><i class="ti ti-arrow-left"></i> Cancel</button></div>
<div class="card">
  <div class="form-grid2" style="gap:14px">
    <div class="form-group"><label class="form-label">Group #</label><input class="form-input" id="grp-num" value="${g.num||''}" ${_editGroupId?'readonly style="background:#f5f5f5"':''}/></div>
    <div class="form-group"><label class="form-label">Group Name</label><input class="form-input" id="grp-name" value="${g.name||''}" placeholder="e.g. Family Trip, Corporate Retreat"/></div>
    <div class="form-group"><label class="form-label">Destination</label><input class="form-input" id="grp-destination" value="${g.destination||''}"/></div>
    <div class="form-group"><label class="form-label">Currency</label><select class="form-input" id="grp-currency"><option ${(g.currency||'KWD')==='KWD'?'selected':''}>KWD</option><option ${g.currency==='USD'?'selected':''}>USD</option><option ${g.currency==='EUR'?'selected':''}>EUR</option><option ${g.currency==='LBP'?'selected':''}>LBP</option><option ${g.currency==='AED'?'selected':''}>AED</option><option ${g.currency==='SAR'?'selected':''}>SAR</option></select></div>
    <div class="form-group"><label class="form-label">Departure Date</label><input type="date" class="form-input" id="grp-departure" value="${g.departure_date||today()}"/></div>
    <div class="form-group"><label class="form-label">Return Date</label><input type="date" class="form-input" id="grp-return" value="${g.return_date||''}"/></div>
    <div class="form-group"><label class="form-label">Status</label><select class="form-input" id="grp-status"><option value="draft" ${(g.status||'draft')==='draft'?'selected':''}>Draft</option><option value="confirmed" ${g.status==='confirmed'?'selected':''}>Confirmed</option><option value="completed" ${g.status==='completed'?'selected':''}>Completed</option><option value="cancelled" ${g.status==='cancelled'?'selected':''}>Cancelled</option></select></div>
    <div class="form-group full"><label class="form-label">Notes</label><textarea class="form-input" id="grp-notes" rows="2">${g.notes||''}</textarea></div>
  </div>
  <div style="margin-top:1.2rem"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.6rem"><span style="font-weight:700;font-size:13px">Travelers</span><button class="btn-secondary" onclick="addGroupTraveler()" style="font-size:12px;padding:6px 10px"><i class="ti ti-plus"></i> Add Traveler</button></div>
  <div class="table-wrap"><table><thead><tr><th>Name</th><th>Phone</th><th>Room</th><th>Amount</th><th>Paid</th><th></th></tr></thead><tbody id="grp-travelers"></tbody></table></div></div>
  <div class="form-actions"><button class="btn-secondary" onclick="showPage('groups')">Cancel</button><button class="btn-save" onclick="saveGroup()"><i class="ti ti-send" style="vertical-align:-2px;margin-right:5px"></i>${_editGroupId?'Update':'Save Group'}</button></div>
</div>`;renderGroupTravelers();}
function renderGroupTravelers(){const t=document.getElementById('grp-travelers');if(!t)return;t.innerHTML=editGroupTravelers.length===0?`<tr><td colspan="6" style="text-align:center;color:#aaa;padding:1rem">No travelers yet — click "Add Traveler"</td></tr>`:editGroupTravelers.map((tr,i)=>`<tr>
<td><input value="${tr.name||''}" placeholder="Full name" oninput="editGroupTravelers[${i}].name=this.value"/></td>
<td><input value="${tr.phone||''}" placeholder="Phone" oninput="editGroupTravelers[${i}].phone=this.value"/></td>
<td><input value="${tr.room_no||''}" placeholder="Room #" oninput="editGroupTravelers[${i}].room_no=this.value" style="width:80px"/></td>
<td><input type="number" value="${tr.amount||0}" min="0" step="0.01" style="width:100px;text-align:right" oninput="editGroupTravelers[${i}].amount=parseFloat(this.value)||0"/></td>
<td style="text-align:center"><input type="checkbox" ${tr.paid?'checked':''} onchange="editGroupTravelers[${i}].paid=this.checked"/></td>
<td><button class="action-btn danger" onclick="removeGroupTraveler(${i})"><i class="ti ti-trash"></i></button></td>
</tr>`).join('');}
function addGroupTraveler(){editGroupTravelers.push({name:'',phone:'',room_no:'',amount:0,paid:false,notes:''});renderGroupTravelers();}
function removeGroupTraveler(i){editGroupTravelers.splice(i,1);renderGroupTravelers();}
async function saveGroup(){const name=document.getElementById('grp-name')?.value.trim();if(!name){toast('Group name is required','error');return;}const body={num:document.getElementById('grp-num')?.value.trim(),name,destination:document.getElementById('grp-destination')?.value.trim(),departure_date:document.getElementById('grp-departure')?.value,return_date:document.getElementById('grp-return')?.value,currency:document.getElementById('grp-currency')?.value||'KWD',status:document.getElementById('grp-status')?.value||'draft',notes:document.getElementById('grp-notes')?.value.trim(),travelers:editGroupTravelers};let r;if(_editGroupId){r=await api('PUT',`/api/groups/${_editGroupId}`,body);toast('✅ Group updated','success');}else{r=await api('POST','/api/groups',body);toast('✅ Group saved','success');}if(r&&r.error){toast(r.error,'error');return;}if(_editGroupId)viewGroup(_editGroupId);else showPage('groups');}
async function deleteGroup(id){if(!confirm('Delete this group?'))return;await api('DELETE',`/api/groups/${id}`);toast('Group deleted');showPage('groups');}

/* CLIENT PASSPORTS */
async function pagePassports(mc){const docs=await api('GET','/api/passports');mc.innerHTML=`<div class="page-header"><div><div class="page-title">Client Passports</div><div class="page-sub">${docs.length} document(s)</div></div><div class="header-actions"><button class="btn-new" onclick="showPage('new-passport')"><i class="ti ti-plus"></i> New Passport</button></div></div><div class="card" style="padding:0;overflow:hidden"><div class="table-wrap"><table><thead><tr><th>Client</th><th>Passport #</th><th>Expiry</th><th>Document</th><th>Notes</th><th>Actions</th></tr></thead><tbody>${docs.length===0?`<tr><td colspan="6"><div class="empty-state"><i class="ti ti-file-certificate"></i><h3>No passports on file</h3></div></td></tr>`:docs.map(d=>`<tr><td style="font-weight:700;cursor:pointer;color:#1A6FB5" onclick="editPassport(${d.id})">${d.client_name}</td><td>${d.passport_num||'—'}</td><td>${d.passport_expiry?fmtDate(d.passport_expiry):'—'}</td><td>${d.passport_file?`<a href="${d.passport_file}" target="_blank" onclick="event.stopPropagation()" style="color:#1A6FB5;font-weight:700"><i class="ti ti-file-check"></i> View</a>`:'<span style="color:#aaa">None</span>'}</td><td>${d.notes||'—'}</td><td class="actions-cell"><button class="action-btn edit" onclick="editPassport(${d.id})"><i class="ti ti-edit"></i> Edit</button><button class="action-btn danger" onclick="deletePassport(${d.id})"><i class="ti ti-trash"></i> Delete</button></td></tr>`).join('')}</tbody></table></div></div>`;}
async function pageNewPassport(mc){_editPassportId=null;_editPassportFile=null;renderPassportForm(mc,{});}
async function editPassport(id){_editPassportId=id;const d=await api('GET',`/api/passports/${id}`);_editPassportFile=d.passport_file||null;const mc=document.getElementById('main-content');document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));renderPassportForm(mc,d);}
function renderPassportForm(mc,d){
  mc.innerHTML=`<div class="page-header"><div><div class="page-title">${_editPassportId?'Edit Passport':'New Passport'}</div></div><button class="btn-secondary" onclick="showPage('passports')"><i class="ti ti-arrow-left"></i> Cancel</button></div>
<div class="card">
  <div class="form-grid2" style="gap:14px">
    <div class="form-group full"><label class="form-label">Client Name</label><input class="form-input" id="pp-client-name" value="${d.client_name||''}" placeholder="FULL NAME"/></div>
    <div class="form-group"><label class="form-label">Passport #</label><input class="form-input" id="pp-passport-num" value="${d.passport_num||''}"/></div>
    <div class="form-group"><label class="form-label">Expiry Date</label><input type="date" class="form-input" id="pp-expiry" value="${d.passport_expiry||''}"/></div>
    <div class="form-group full"><label class="form-label">Passport Document</label><input type="file" accept="image/*,.pdf" class="form-input" onchange="uploadPassportFile(this)"/><div id="pp-file-preview" style="margin-top:8px">${d.passport_file?`<a href="${d.passport_file}" target="_blank" style="font-size:12px;color:#1A6FB5;font-weight:700"><i class="ti ti-file-check"></i> View uploaded document</a>`:'<span style="font-size:12px;color:#aaa">No document uploaded</span>'}</div></div>
    <div class="form-group full"><label class="form-label">Notes</label><textarea class="form-input" id="pp-notes" rows="2">${d.notes||''}</textarea></div>
  </div>
  <div class="form-actions"><button class="btn-secondary" onclick="showPage('passports')">Cancel</button><button class="btn-save" onclick="savePassport()"><i class="ti ti-send" style="vertical-align:-2px;margin-right:5px"></i>${_editPassportId?'Update':'Save Passport'}</button></div>
</div>`;}
function uploadPassportFile(input){const file=input.files[0];if(!file)return;const reader=new FileReader();reader.onload=(e)=>{_editPassportFile=e.target.result;const prev=document.getElementById('pp-file-preview');if(prev)prev.innerHTML=`<a href="${_editPassportFile}" target="_blank" style="font-size:12px;color:#1A6FB5;font-weight:700"><i class="ti ti-file-check"></i> View uploaded document</a>`;toast('Document ready — click Save to attach it','success');};reader.readAsDataURL(file);}
async function savePassport(){const clientName=document.getElementById('pp-client-name')?.value.trim();if(!clientName){toast('Client name is required','error');return;}const body={client_name:clientName,passport_num:document.getElementById('pp-passport-num')?.value.trim(),passport_expiry:document.getElementById('pp-expiry')?.value,passport_file:_editPassportFile,notes:document.getElementById('pp-notes')?.value.trim()};let r;if(_editPassportId){r=await api('PUT',`/api/passports/${_editPassportId}`,body);toast('✅ Passport updated','success');}else{r=await api('POST','/api/passports',body);toast('✅ Passport saved','success');}if(r&&r.error){toast(r.error,'error');return;}showPage('passports');}
async function deletePassport(id){if(!confirm('Delete this passport record?'))return;await api('DELETE',`/api/passports/${id}`);toast('Passport deleted');showPage('passports');}

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



function printStmt(){const content=document.getElementById('stmt-printable')?.innerHTML;if(!content)return;const s=settings;const logoHtml=s.company_logo?`<img src="${s.company_logo}" style="height:60px;object-fit:contain" alt="Logo"/>`:`<div style="font-size:18px;font-weight:900;color:#0a3258">${s.company_name||(isCyber()?'M&S CYBER SYSTEMS':'✈ WHITE SKY')}</div>`;const win=window.open('','_blank');win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Statement of Account</title><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;font-size:11px;color:#222;background:#fff}.page{padding:20px 25px}.header{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:12px;border-bottom:3px solid #0a3258;margin-bottom:16px}.header-left{display:flex;align-items:center;gap:14px}.company-info{font-size:10px;color:#555;line-height:1.6}.company-name{font-size:13px;font-weight:700;color:#0a3258;margin-bottom:2px}.stmt-title{text-align:right}.stmt-title h1{font-size:22px;font-weight:900;color:#0a3258;letter-spacing:.04em}.stmt-title p{font-size:10px;color:#888;margin-top:2px}table{width:100%;border-collapse:collapse;font-size:10.5px}thead tr{background:#0a3258;color:#fff}th{padding:7px 8px;border:1px solid #0a3258;text-align:left;font-weight:700;font-size:10px;text-transform:uppercase;letter-spacing:.03em}td{padding:5px 8px;border:1px solid #ddd}tbody tr:nth-child(even) td{background:#f5f8fd}tfoot tr td{background:#e8eef5;font-weight:700;border:1px solid #bbb}.footer{margin-top:20px;padding-top:10px;border-top:1px solid #ddd;display:flex;justify-content:space-between;font-size:9.5px;color:#aaa}@media print{body{padding:0}.page{padding:10px 15px}button{display:none!important}}</style></head><body><div class="page"><div class="header"><div class="header-left">${logoHtml}<div class="company-info"><div class="company-name">${s.company_name||''}</div><div>${s.company_address||''}</div><div>P: ${s.company_phone_p||''} | M: ${s.company_phone_m||''}</div><div>${s.company_email||''}</div></div></div><div class="stmt-title"><h1>STATEMENT</h1><p>OF ACCOUNT</p><p style="margin-top:6px;color:#555">Date: ${new Date().toLocaleDateString('en-GB')}</p></div></div>${content}<div class="footer"><span>${s.company_name||''} — ${s.company_email||''}</span><span>Generated on ${new Date().toLocaleString('en-GB')}</span></div></div><script>window.onload=()=>window.print()<\/script></body></html>`);win.document.close();}

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
  const logoHtml=s.company_logo?`<img src="${s.company_logo}" style="height:60px;object-fit:contain" alt="Logo"/>`:`<div style="font-size:18px;font-weight:900;color:#0a3258">${s.company_name||(isCyber()?'M&S CYBER SYSTEMS':'✈ WHITE SKY')}</div>`;
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
        <div class="company-name">${s.company_name||''}</div>
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
    <span>${s.company_name||''} — ${s.company_email||''}</span>
    <span>Generated on ${new Date().toLocaleString('en-GB')}</span>
  </div>
</div><script>window.onload=()=>window.print()<\/script></body></html>`);
  win.document.close();
}

/* PAYMENTS */
async function pagePayments(mc){const[allPay,allInv]=await Promise.all([api('GET','/api/payments'),api('GET','/api/invoices')]);const paidInv=allInv.filter(i=>i.status==='paid'||i.status==='partial'||i.status==='refunded');const total=allPay.reduce((a,p)=>a+(parseFloat(p.amount)||0),0);mc.innerHTML=`<div class="page-header"><div><div class="page-title">Payments</div><div class="page-sub">${paidInv.length} invoice(s) — Collected: <strong>${fmt(total)}</strong></div></div></div><div class="card" style="padding:0;overflow:hidden"><div class="table-wrap"><table><thead><tr><th>#</th><th>Client</th><th>Date</th><th>Total</th><th>Paid</th><th>Method</th><th>Status</th><th>Actions</th></tr></thead><tbody>${paidInv.length===0?`<tr><td colspan="8"><div class="empty-state"><i class="ti ti-cash-off"></i><h3>No paid invoices</h3></div></td></tr>`:paidInv.map(i=>{const invPays=allPay.filter(p=>p.invoice_id===i.id);const paidSoFar=invPays.reduce((a,p)=>a+(parseFloat(p.amount)||0),0);const isRefunded=i.status==='refunded';const methodLabel=invPays.length===0?'—':invPays.length===1?`<span class="pay-method-badge">${invPays[0].method}</span>`:`<span class="pay-method-badge">${invPays.length} payments</span>`;return`<tr style="${isRefunded?'background:#fffbe6':''}"><td style="font-weight:700;cursor:pointer;color:#1A6FB5" onclick="viewInvoice(${i.id})">${i.num}</td><td>${i.client_name}</td><td>${fmtDate(i.date)}</td><td style="font-weight:700;color:${isRefunded?'#b8860b':'#1a7a3a'}">${fmt(i.total,i.currency)}</td><td style="font-weight:700">${fmt(paidSoFar,i.currency)}</td><td>${methodLabel}</td><td>${statusBadge(i.status)}</td><td class="actions-cell">${!isRefunded?`<button class="btn-secondary" title="Mark as Refunded" onclick="markRefunded(${i.id})" style="color:#b8860b;border-color:#b8860b;font-size:11px;padding:4px 8px"><i class="ti ti-rotate-clockwise"></i> Refund</button>`:'<span style="background:#fffbe6;color:#b8860b;font-size:11px;font-weight:700;padding:3px 8px;border-radius:5px;border:1px solid #b8860b">✓ Refunded</span>'}<button class="btn-secondary" title="Mark unpaid" onclick="markUnpaidFromList(${i.id})" style="color:#c0392b;border-color:#f5c6c6;font-size:11px;padding:4px 8px"><i class="ti ti-x"></i> Unpaid</button></td></tr>`;}).join('')}</tbody></table></div></div>`;}
async function markRefunded(id){if(!confirm('Mark this invoice as refunded?'))return;await api('PATCH',`/api/invoices/${id}/status`,{status:'refunded'});toast('✅ Invoice marked as refunded','success');showPage('payments');}
async function markUnpaidFromList(id){if(!confirm('Mark this invoice as unpaid?\nThe payment will be deleted.'))return;await api('PATCH',`/api/invoices/${id}/status`,{status:'pending'});toast('Invoice marked as unpaid','error');showPage('payments');}

/* CREDIT NOTES */
let allCreditNotes=[];
async function pageCreditNotes(mc){allCreditNotes=await api('GET','/api/credit-notes');mc.innerHTML=`
<div class="page-header"><div><div class="page-title">Credit Notes</div><div class="page-sub">${allCreditNotes.length} credit note(s)</div></div><button class="btn-new" onclick="openCreditNoteModal()"><i class="ti ti-plus"></i> New Credit Note</button></div>
<div class="card" style="padding:0;overflow:hidden"><div class="table-wrap"><table><thead><tr><th>#</th><th>Client</th><th>Invoice</th><th>Date</th><th>Amount</th><th>Actions</th></tr></thead><tbody>${allCreditNotes.length===0?`<tr><td colspan="6"><div class="empty-state"><i class="ti ti-receipt-refund"></i><h3>No credit notes</h3></div></td></tr>`:allCreditNotes.map(cn=>`<tr><td style="font-weight:700;cursor:pointer;color:#1A6FB5" onclick="viewCreditNote(${cn.id})">${cn.num}</td><td>${cn.client_name}</td><td>${cn.invoice_num?`<span style="color:#1A6FB5;cursor:pointer" onclick="showPage('invoices');setTimeout(()=>viewInvoice(${cn.invoice_id}),150)">${cn.invoice_num}</span>`:'—'}</td><td>${fmtDate(cn.date)}</td><td style="font-weight:700;color:#b8860b">${fmt(cn.amount,cn.currency)}</td><td class="actions-cell"><button class="action-btn danger" onclick="deleteCreditNote(${cn.id})"><i class="ti ti-trash"></i> Delete</button></td></tr>`).join('')}</tbody></table></div></div>`;}

async function openCreditNoteModal(invoiceId){
  const invs=await api('GET','/api/invoices');
  const sel=document.getElementById('cn-invoice');
  sel.innerHTML='<option value="">-- None / manual entry --</option>'+invs.map(i=>`<option value="${i.id}" data-num="${i.num}" data-client="${i.client_name}" data-total="${i.total}" data-currency="${i.currency||'KWD'}" ${invoiceId==i.id?'selected':''}>${i.num} — ${i.client_name}</option>`).join('');
  document.getElementById('cn-client').value='';
  document.getElementById('cn-amount').value='';
  document.getElementById('cn-currency').value=settings.invoice_currency||'KWD';
  document.getElementById('cn-date').value=today();
  document.getElementById('cn-reason').value='';
  if(invoiceId)fillCnFromInvoice(sel);
  openModal('modal-cn');
}
function fillCnFromInvoice(sel){const o=sel.querySelector(`option[value="${sel.value}"]`);if(!o||!sel.value)return;document.getElementById('cn-client').value=o.dataset.client||'';document.getElementById('cn-amount').value=o.dataset.total||'';document.getElementById('cn-currency').value=o.dataset.currency||'KWD';}
document.getElementById('btn-save-cn').addEventListener('click',async()=>{
  const client=document.getElementById('cn-client').value.trim();
  if(!client){toast('Client name is required','error');return;}
  const amount=parseFloat(document.getElementById('cn-amount').value)||0;
  if(amount<=0){toast('Enter an amount greater than 0','error');return;}
  const sel=document.getElementById('cn-invoice');
  const o=sel.querySelector(`option[value="${sel.value}"]`);
  const{num}=await api('GET','/api/credit-notes/next-num');
  const body={num,invoice_id:sel.value||null,invoice_num:o?.dataset.num||'',client_name:client,date:document.getElementById('cn-date').value,reason:document.getElementById('cn-reason').value.trim(),amount,currency:document.getElementById('cn-currency').value};
  const r=await api('POST','/api/credit-notes',body);
  if(r&&r.error){toast(r.error,'error');return;}
  toast('✅ Credit note issued','success');
  closeModal('modal-cn');
  showPage('credit-notes');
});
async function deleteCreditNote(id){if(!confirm('Delete this credit note?'))return;await api('DELETE',`/api/credit-notes/${id}`);toast('Credit note deleted');showPage('credit-notes');}
async function viewCreditNote(id){
  const cn=await api('GET',`/api/credit-notes/${id}`);
  const s=settings;
  const logoHtml=s.company_logo?`<img src="${s.company_logo}" class="inv-logo" alt="Logo"/>`:`<div class="inv-logo-placeholder"><i class="${isCyber()?'ti ti-shield-lock':'ti ti-plane'}"></i></div>`;
  const mc=document.getElementById('main-content');
  mc.innerHTML=`
<div class="page-header"><div><div class="page-title">${cn.num}</div><div class="page-sub">${cn.client_name}</div></div>
<div class="header-actions"><button class="btn-secondary" onclick="showPage('credit-notes')"><i class="ti ti-arrow-left"></i> Back</button><button class="btn-secondary" onclick="printCreditNote()"><i class="ti ti-printer"></i> Print / PDF</button></div></div>
<div id="printable"><div class="inv-wrap card">
  <div class="inv-head">
    <div class="inv-head-left"><div style="display:flex;flex-direction:column;align-items:flex-start;gap:8px">${logoHtml}<div class="inv-company-name">${s.company_name||''}</div></div></div>
    <div class="inv-head-right"><div class="inv-title" style="color:#b8860b">CREDIT NOTE</div><div class="inv-meta-grid"><span class="inv-meta-label">Credit note #:</span><span class="inv-meta-val">${cn.num}</span><span class="inv-meta-label">Date:</span><span class="inv-meta-val">${fmtDate(cn.date)}</span>${cn.invoice_num?`<span class="inv-meta-label">Original invoice:</span><span class="inv-meta-val">${cn.invoice_num}</span>`:''}</div></div>
  </div>
  <div class="inv-bill">
    <div><div class="inv-bill-label">From</div><div class="inv-bill-name">${s.company_name||'—'}</div><div class="inv-bill-meta">${s.company_address||''}<br>P: ${s.company_phone_p||''}<br>M: ${s.company_phone_m||''}<br>${s.company_email||''}</div></div>
    <div><div class="inv-bill-label">Issued to</div><div class="inv-bill-name">${cn.client_name}</div></div>
  </div>
  <div class="inv-pax" style="padding:1.25rem 2rem"><div class="inv-bill-label">Reason</div><div style="font-size:13px;color:#333;margin-top:6px">${cn.reason?cn.reason.replace(/\n/g,'<br>'):'—'}</div></div>
  <div class="inv-totals"><div class="inv-totals-inner">
    <div class="inv-tot-row inv-tot-final" style="background:#b8860b"><span class="lbl"><strong>CREDIT AMOUNT</strong></span><span class="val"><strong>${cn.currency||'KWD'} ${Number(cn.amount).toLocaleString('en-US',{minimumFractionDigits:2})}</strong></span></div>
  </div></div>
</div></div>`;}
function printCreditNote(){
  const content=document.getElementById('printable').innerHTML;
  const win=window.open('','_blank');
  win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Credit Note</title><style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',Arial,sans-serif;font-size:12px;color:#1a1a2e;background:#fff}
.inv-wrap{padding:0}
.inv-head{display:flex;justify-content:space-between;align-items:flex-start;padding:24px 30px 16px;border-bottom:3px solid #0a3258}
.inv-head-left{display:flex;align-items:center;gap:14px}
.inv-logo{width:80px;height:80px;object-fit:contain}
.inv-logo-placeholder{width:80px;height:80px;display:flex;align-items:center;justify-content:center;font-size:10px;color:#999}
.inv-company-name{font-size:15px;font-weight:800;color:#0a3258}
.inv-head-right{text-align:right}
.inv-title{font-size:44px;font-weight:900;letter-spacing:.06em;line-height:1;margin-bottom:10px}
.inv-meta-grid{display:grid;grid-template-columns:auto auto;gap:3px 16px;font-size:11px}
.inv-meta-label{color:#999;font-weight:700;text-transform:uppercase;font-size:10px;text-align:right}
.inv-meta-val{color:#1a1a2e;font-weight:600;text-align:left}
.inv-bill{display:grid;grid-template-columns:1fr 1fr;gap:30px;padding:16px 30px;border-bottom:1px solid #e5eaf2}
.inv-bill-label{font-size:9px;font-weight:700;color:#aaa;text-transform:uppercase;letter-spacing:.06em;margin-bottom:5px}
.inv-bill-name{font-size:13px;font-weight:700;color:#0a3258;margin-bottom:3px}
.inv-totals{display:flex;justify-content:flex-end;padding:16px 30px}
.inv-totals-inner{min-width:260px;border:1px solid #e5eaf2;border-radius:6px;overflow:hidden;font-size:12px}
.inv-tot-row{display:flex;justify-content:space-between;padding:10px 14px}
.inv-tot-final .lbl,.inv-tot-final .val{color:#fff!important;font-weight:700}
@page{margin:10mm;size:A4}
@media print{body{padding:0}button{display:none!important}}
  </style></head><body>${content}<script>window.onload=()=>window.print()<\/script></body></html>`);
  win.document.close();
}

/* REPORTS */
async function pageReports(mc){const firstDay=new Date(new Date().getFullYear(),0,1).toISOString().split('T')[0];mc.innerHTML=`<div class="page-header"><div><div class="page-title">Reports</div><div class="page-sub">Invoice list by period</div></div></div><div class="card"><div class="card-header"><span class="card-title">Period</span></div><div class="filter-bar"><input type="date" id="rpt-from" value="${firstDay}"/><span style="color:#aaa">to</span><input type="date" id="rpt-to" value="${today()}"/><button class="btn-new" onclick="loadReport()"><i class="ti ti-search"></i> Generate</button><button class="btn-secondary" onclick="document.getElementById('rpt-from').value='';document.getElementById('rpt-to').value='';loadReport()">All periods</button></div></div><div id="report-content"><div class="loading-page"><i class="ti ti-loader spin"></i></div></div>`;loadReport();}
async function loadReport(){
  const from=document.getElementById('rpt-from')?.value;
  const to=document.getElementById('rpt-to')?.value;
  const qs=[];if(from)qs.push('from='+from);if(to)qs.push('to='+to);
  const q=qs.length?'?'+qs.join('&'):'';
  const[list,rpt]=await Promise.all([api('GET','/api/invoices'+q),api('GET','/api/reports/summary'+q)]);
  const rc=document.getElementById('report-content');if(!rc)return;
  const total=list.reduce((a,i)=>a+i.total,0);

  const months=Object.keys(rpt.byMonth||{}).sort();
  const maxMonth=Math.max(1,...months.map(m=>rpt.byMonth[m]));
  const monthNames=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const chartHtml=months.length===0?`<div class="empty-state" style="padding:2rem"><i class="ti ti-chart-bar"></i><h3>No revenue data for this period</h3></div>`:`<div class="month-chart">${months.map(m=>{const val=rpt.byMonth[m]||0;const h=Math.round((val/maxMonth)*100);const[y,mo]=m.split('-');return`<div class="month-bar-wrap" title="${fmt(val)}"><div class="month-val">${val>=1000?(val/1000).toFixed(1)+'k':Math.round(val)}</div><div class="month-bar" style="height:${Math.max(h,2)}%"></div><div class="month-label">${monthNames[parseInt(mo,10)-1]} ${y.slice(2)}</div></div>`;}).join('')}</div>`;

  const topClients=rpt.topClients||[];
  const topClientsHtml=topClients.length===0?'':`<table class="top-clients-table" style="width:100%;border-collapse:collapse">${topClients.map(([name,amt],idx)=>`<tr><td style="width:26px;color:#bbb;font-weight:700">#${idx+1}</td><td style="font-weight:600">${name}</td><td style="text-align:right;font-weight:700;color:#0a3258">${fmt(amt)}</td></tr>`).join('')}</table>`;

  rc.innerHTML=`
<div class="reports-grid">
  <div class="card">
    <div class="card-header"><span class="card-title"><i class="ti ti-chart-histogram" style="vertical-align:-2px;margin-right:6px;color:#1A6FB5"></i>Revenue by month</span></div>
    ${chartHtml}
  </div>
  <div class="card">
    <div class="card-header"><span class="card-title"><i class="ti ti-crown" style="vertical-align:-2px;margin-right:6px;color:#a05c00"></i>Top clients</span></div>
    ${topClientsHtml||`<div class="empty-state" style="padding:2rem"><i class="ti ti-users"></i><h3>No client data yet</h3></div>`}
  </div>
</div>
<div class="card" style="padding:0;overflow:hidden"><div class="card-header" style="padding:1rem 1.25rem"><span class="card-title">${list.length} invoice(s) — Total: <strong>${fmt(total)}</strong></span></div><div class="table-wrap"><table><thead><tr><th>#</th><th>Client</th><th>Date</th><th>Due</th><th>Total</th><th>Status</th><th>Created by</th></tr></thead><tbody>${list.length===0?`<tr><td colspan="7"><div class="empty-state"><i class="ti ti-file-off"></i><h3>No invoices for this period</h3></div></td></tr>`:list.map(i=>`<tr><td style="font-weight:700;cursor:pointer;color:#1A6FB5" onclick="viewInvoice(${i.id})">${i.num}</td><td>${i.client_name}</td><td>${fmtDate(i.date)}</td><td>${fmtDate(i.due_date)}</td><td style="font-weight:700">${fmt(i.total,i.currency)}</td><td>${statusBadge(i.status)}</td><td style="color:#aaa;font-size:12px">${i.owner_name||'—'}</td></tr>`).join('')}</tbody></table></div></div>`;}

/* SETTINGS */
async function pageSettings(mc){const isP=currentUser.role==='patron';const canEdit=isP||isCyber()||isClient();settings=await api('GET','/api/settings');let users=[];if(isP)users=await api('GET','/api/users');const currencies=['KWD','USD','EUR','LBP','AED','SAR'];mc.innerHTML=`<div class="page-header"><div><div class="page-title">Settings</div></div></div>
<div class="card" style="max-width:640px">
  <div class="settings-label">Company Logo</div>
  <div class="logo-upload-area" id="logo-drop" onclick="document.getElementById('logo-file').click()">
    ${settings.company_logo?`<img src="${settings.company_logo}" alt="Logo"/>`:`<div class="logo-placeholder"><i class="ti ti-photo"></i>Click to upload logo<br><span style="font-size:11px;color:#ccc">PNG, JPG — appears on invoices</span></div>`}
    <input type="file" id="logo-file" accept="image/*" ${!canEdit?'disabled':''} onchange="uploadLogo(this)"/>
  </div>
  ${settings.company_logo?`<button class="btn-danger" style="margin-top:8px;font-size:12px;padding:5px 10px" onclick="removeLogo()"><i class="ti ti-trash" style="vertical-align:-2px;margin-right:4px"></i>Remove logo</button>`:''}
  <div class="settings-label" style="margin-top:1.5rem">Signature Image</div>
  <div class="logo-upload-area" onclick="document.getElementById('sig-file').click()">
    ${settings.company_signature?`<img src="${settings.company_signature}" style="height:80px" alt="Signature"/>`:`<div class="logo-placeholder"><i class="ti ti-writing"></i>Click to upload signature<br><span style="font-size:11px;color:#ccc">PNG, JPG — appears on invoices</span></div>`}
    <input type="file" id="sig-file" accept="image/*" ${!canEdit?'disabled':''} onchange="uploadSignature(this)"/>
  </div>
  ${settings.company_signature?`<button class="btn-danger" style="margin-top:8px;font-size:12px;padding:5px 10px" onclick="removeSignature()"><i class="ti ti-trash" style="vertical-align:-2px;margin-right:4px"></i>Remove signature</button>`:''}
  <div class="settings-label" style="margin-top:1.5rem">Stamp Image</div>
  <div class="logo-upload-area" onclick="document.getElementById('stamp-file').click()">
    ${settings.company_stamp?`<img src="${settings.company_stamp}" style="height:80px" alt="Stamp"/>`:`<div class="logo-placeholder"><i class="ti ti-circle-check"></i>Click to upload stamp<br><span style="font-size:11px;color:#ccc">PNG, JPG — appears on invoices</span></div>`}
    <input type="file" id="stamp-file" accept="image/*" ${!canEdit?'disabled':''} onchange="uploadStamp(this)"/>
  </div>
  ${settings.company_stamp?`<button class="btn-danger" style="margin-top:8px;font-size:12px;padding:5px 10px" onclick="removeStamp()"><i class="ti ti-trash" style="vertical-align:-2px;margin-right:4px"></i>Remove stamp</button>`:''}
  <div class="settings-label" style="margin-top:1.5rem">Company Information</div>
  <div class="form-grid2" style="gap:14px">
    <div class="form-group full"><label class="form-label">Name</label><input class="form-input" id="s-name" value="${settings.company_name||''}" ${!canEdit?'disabled':''}/></div>
    <div class="form-group full"><label class="form-label">Address</label><input class="form-input" id="s-addr" value="${settings.company_address||''}" ${!canEdit?'disabled':''}/></div>
    <div class="form-group"><label class="form-label">Phone P</label><input class="form-input" id="s-phone-p" value="${settings.company_phone_p||''}" ${!canEdit?'disabled':''}/></div>
    <div class="form-group"><label class="form-label">Phone M</label><input class="form-input" id="s-phone-m" value="${settings.company_phone_m||''}" ${!canEdit?'disabled':''}/></div>
    <div class="form-group full"><label class="form-label">Email</label><input class="form-input" id="s-email" value="${settings.company_email||''}" ${!canEdit?'disabled':''}/></div>
  </div>
  <div class="settings-label">Default Billing</div>
  <div class="form-grid2" style="gap:14px">
    <div class="form-group"><label class="form-label">Currency</label><select class="form-input" id="s-currency" ${!canEdit?'disabled':''}>${currencies.map(c=>`<option ${settings.invoice_currency===c?'selected':''}>${c}</option>`).join('')}</select></div>
    <div class="form-group"><label class="form-label">Payment terms (days)</label><input type="number" class="form-input" id="s-due-days" value="${settings.invoice_due_days||7}" ${!canEdit?'disabled':''}/></div>
    <div class="form-group"><label class="form-label">Language</label><select class="form-input" id="s-lang" ${!canEdit?'disabled':''} onchange="applyLanguage(this.value)"><option value="en" ${(settings.lang||'en')==='en'?'selected':''}>English</option><option value="fr" ${settings.lang==='fr'?'selected':''}>Français</option><option value="ar" ${settings.lang==='ar'?'selected':''}>العربية</option></select></div>
    <div class="form-group full"><label class="form-label">Invoice footer</label><textarea class="form-input" id="s-footer" rows="3" ${!canEdit?'disabled':''}>${settings.invoice_footer||''}</textarea></div>
  </div>
  ${canEdit?`<button class="btn-save" onclick="saveSettings()">Save Settings</button>`:`<div class="info-box"><i class="ti ti-lock"></i> Only the owner can modify these settings.</div>`}
</div>
${canEdit?`<div class="card" style="max-width:640px"><div class="card-header"><span class="card-title"><i class="ti ti-mail" style="vertical-align:-2px;margin-right:6px;color:#1A6FB5"></i>Email Sending</span></div><p style="font-size:13px;color:#888;margin-bottom:1rem;line-height:1.6">Lets you send invoices to clients by email. Use your email provider's SMTP details — for Gmail, that's an <a href="https://support.google.com/accounts/answer/185833" target="_blank" style="color:#1A6FB5">app password</a>, not your normal password.</p><div class="form-grid2" style="gap:14px"><div class="form-group"><label class="form-label">SMTP host</label><input class="form-input" id="s-smtp-host" value="${settings.smtp_host||''}" placeholder="smtp.gmail.com"/></div><div class="form-group"><label class="form-label">Port</label><input type="number" class="form-input" id="s-smtp-port" value="${settings.smtp_port||587}"/></div><div class="form-group"><label class="form-label">Username</label><input class="form-input" id="s-smtp-user" value="${settings.smtp_user||''}" placeholder="you@yourcompany.com"/></div><div class="form-group"><label class="form-label">Password</label><input type="password" class="form-input" id="s-smtp-pass" value="${settings.smtp_pass||''}"/></div><div class="form-group full"><label class="form-label">"From" address <span style="color:#aaa;font-weight:400">(optional, defaults to username)</span></label><input class="form-input" id="s-smtp-from" value="${settings.smtp_from||''}"/></div></div><button class="btn-save" onclick="saveSmtpSettings()">Save Email Settings</button></div>`:''}
${isP?`<div class="card" style="max-width:640px"><div class="card-header"><span class="card-title">Users</span><button class="btn-new" onclick="openUserModal()"><i class="ti ti-plus"></i> Add</button></div>${users.map(u=>`<div class="access-row"><div style="display:flex;align-items:center;gap:12px"><div class="user-avatar" style="width:38px;height:38px;font-size:13px;background:${u.role==='patron'?'#deeeff':'#fff4e0'};color:${u.role==='patron'?'#0a3258':'#a05c00'}">${initials(u.display_name)}</div><div><div style="font-size:14px;font-weight:700">${u.display_name}</div><div style="font-size:12px;color:#aaa">${u.username} — ${u.role==='patron'?'Administrator':'Staff'}</div></div></div><div style="display:flex;align-items:center;gap:8px"><span class="badge ${u.role==='patron'?'badge-paid':'badge-pending'}">${u.role==='patron'?'Admin':'Staff'}</span><button class="action-btn" onclick="openUserModal(${u.id})"><i class="ti ti-edit"></i></button>${u.id!==currentUser.id?`<button class="action-btn danger" onclick="deleteUser(${u.id})"><i class="ti ti-trash"></i></button>`:''}</div></div>`).join('')}</div>`:''}
`;}
const DESKTOP_APP_URL='https://dashbaordwhitesky-7fw2.onrender.com/manifest.html';
function copyDownloadLink(){const el=document.getElementById('dl-link');el.select();navigator.clipboard.writeText(el.value).then(()=>toast('✅ Link copied','success')).catch(()=>toast('Could not copy — select and copy manually','error'));}

async function saveSettings(){const body={company_name:document.getElementById('s-name')?.value.trim(),company_address:document.getElementById('s-addr')?.value.trim(),company_phone_p:document.getElementById('s-phone-p')?.value.trim(),company_phone_m:document.getElementById('s-phone-m')?.value.trim(),company_email:document.getElementById('s-email')?.value.trim(),invoice_currency:document.getElementById('s-currency')?.value,invoice_due_days:document.getElementById('s-due-days')?.value,invoice_footer:document.getElementById('s-footer')?.value,lang:document.getElementById('s-lang')?.value||'en'};await api('POST','/api/settings',body);settings=await api('GET','/api/settings');toast('✅ Settings saved','success');}
async function saveSmtpSettings(){const body={smtp_host:document.getElementById('s-smtp-host')?.value.trim(),smtp_port:document.getElementById('s-smtp-port')?.value||587,smtp_user:document.getElementById('s-smtp-user')?.value.trim(),smtp_pass:document.getElementById('s-smtp-pass')?.value,smtp_from:document.getElementById('s-smtp-from')?.value.trim()};await api('POST','/api/settings',body);settings=await api('GET','/api/settings');toast('✅ Email settings saved','success');}
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

/* ADMIN (patron only) */
async function pageAdmin(mc){
  const[users,invites]=await Promise.all([api('GET','/api/users'),api('GET','/api/invites')]);
  const roleLabel={patron:'Administrator',employe:'Staff',demo:'Demo',cyber:'CEO (Cyber)',client:'Client (self-registered)'};
  mc.innerHTML=`
<div class="page-header"><div><div class="page-title">Admin</div><div class="page-sub">Sales page link, invite codes and account access — visible to the owner only</div></div></div>
<div class="card" style="max-width:680px"><div class="card-header"><span class="card-title"><i class="ti ti-download" style="vertical-align:-2px;margin-right:6px;color:#1A6FB5"></i>Sales Page Link</span></div>
  <p style="font-size:13px;color:#888;margin-bottom:1rem;line-height:1.6">Share this link with prospects — it's the public pitch (screenshots, pricing, download button), not an account by itself. Send it as many times as you like; give out an invite code separately once they've paid.</p>
  <div style="display:flex;gap:8px;align-items:center">
    <input class="form-input" id="dl-link" readonly value="${DESKTOP_APP_URL}" style="font-family:monospace;font-size:12px"/>
    <button class="btn-secondary" onclick="copyDownloadLink()"><i class="ti ti-copy"></i> Copy link</button>
  </div>
</div>
<div class="card" style="max-width:680px"><div class="card-header"><span class="card-title"><i class="ti ti-key" style="vertical-align:-2px;margin-right:6px;color:#b8860b"></i>Invite Codes</span><button class="btn-new" onclick="generateInvite()"><i class="ti ti-plus"></i> Generate Code</button></div>
  <p style="font-size:13px;color:#888;margin-bottom:1rem;line-height:1.6">This is the actual access control — give one code per prospect (WhatsApp, etc.), separately from the download link. Each code creates exactly one account, then it's dead.</p>
  ${invites.length===0?`<div class="empty-state" style="padding:2rem"><i class="ti ti-key"></i><h3>No codes generated yet</h3></div>`:`<table style="width:100%;border-collapse:collapse"><thead><tr><th style="text-align:left;font-size:11px;color:#888;padding:6px 4px">Code</th><th style="text-align:left;font-size:11px;color:#888;padding:6px 4px">Status</th><th style="text-align:left;font-size:11px;color:#888;padding:6px 4px">Used by</th><th></th></tr></thead><tbody>${invites.map(inv=>`<tr><td style="padding:6px 4px;font-family:monospace;font-weight:700">${inv.code}</td><td style="padding:6px 4px">${inv.used?'<span class="badge badge-draft">Used</span>':'<span class="badge badge-paid">Unused</span>'}</td><td style="padding:6px 4px;color:#888;font-size:12px">${inv.used_by_name||'—'}</td><td style="padding:6px 4px;text-align:right">${inv.used?'':`<button class="action-btn" onclick="copyInviteCode('${inv.code}')" title="Copy"><i class="ti ti-copy"></i></button><button class="action-btn danger" onclick="deleteInvite('${inv.code}')" title="Revoke"><i class="ti ti-trash"></i></button>`}</td></tr>`).join('')}</tbody></table>`}
</div>
<div class="card" style="max-width:680px;padding:0;overflow:hidden"><div class="card-header" style="padding:1.25rem 1.25rem 0"><span class="card-title"><i class="ti ti-users-group" style="vertical-align:-2px;margin-right:6px;color:#1A6FB5"></i>All Accounts</span></div>
<div class="table-wrap"><table><thead><tr><th>Name</th><th>Username</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead><tbody>${users.map(u=>`<tr><td style="font-weight:700">${u.display_name}</td><td style="color:#888">${u.username}</td><td>${roleLabel[u.role]||u.role}</td><td>${u.active===false?'<span class="badge badge-refused">Deactivated</span>':'<span class="badge badge-paid">Active</span>'}</td><td class="actions-cell">${u.id===currentUser.id?'<span style="color:#ccc;font-size:12px">(you)</span>':u.active===false?`<button class="btn-secondary" style="font-size:11px;padding:4px 8px;color:#1a7a3a;border-color:#a3d9b1" onclick="toggleUserActive(${u.id},true)"><i class="ti ti-check"></i> Activate</button>`:`<button class="btn-secondary" style="font-size:11px;padding:4px 8px;color:#c0392b;border-color:#f5c6c6" onclick="toggleUserActive(${u.id},false)"><i class="ti ti-ban"></i> Deactivate</button>`}</td></tr>`).join('')}</tbody></table></div></div>`;
}
async function toggleUserActive(id,active){
  if(!active&&!confirm('Deactivate this account? They will be blocked from signing in until you reactivate it.'))return;
  const r=await api('PATCH',`/api/users/${id}/active`,{active});
  if(r&&r.error){toast(r.error,'error');return;}
  toast(active?'✅ Account activated':'Account deactivated','success');
  showPage('admin');
}
async function generateInvite(){
  const r=await api('POST','/api/invites',{});
  if(r&&r.error){toast(r.error,'error');return;}
  showPage('admin');
  setTimeout(()=>{navigator.clipboard.writeText(r.code).catch(()=>{});toast(`✅ Code ${r.code} generated and copied`,'success');},150);
}
function copyInviteCode(code){navigator.clipboard.writeText(code).then(()=>toast(`✅ Copied ${code}`,'success')).catch(()=>toast('Could not copy','error'));}
async function deleteInvite(code){if(!confirm('Revoke this unused code?'))return;await api('DELETE',`/api/invites/${code}`);toast('Code revoked');showPage('admin');}






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
