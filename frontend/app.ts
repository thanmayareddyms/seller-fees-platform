type Auditor={name:string;completed:number;inProgress:number;expired:number;reverted:number;auditMinutes:number;quality:number|null};
type Snapshot={updatedAt:string;completed:number;inProgress:number;expired:number;reverted:number;totalAuditMinutes:number;quality:number|null;auditors:Auditor[]};
const $=(id:string)=>document.getElementById(id)!;
const fmt=(m:number)=>m<60?`${m}m`:`${Math.floor(m/60)}h ${m%60}m`;
let period='today', auditor='all';
function render(d:Snapshot){
 $('completed').textContent=String(d.completed);$('inProgress').textContent=String(d.inProgress);$('expired').textContent=String(d.expired);$('reverted').textContent=String(d.reverted);$('auditTime').textContent=fmt(d.totalAuditMinutes);$('quality').textContent=d.quality===null?'—':`${d.quality}%`;
 const rows=d.auditors.map(a=>`<tr><td><b>${escapeHtml(a.name)}</b></td><td>${a.completed}</td><td>${a.inProgress}</td><td>${a.expired}</td><td>${a.reverted}</td><td>${fmt(a.auditMinutes)}</td><td>${a.quality===null?'—':a.quality+'%'}</td></tr>`).join('');
 $('auditorsTable').innerHTML=rows||'<tr><td colspan="7" class="noData">No audit data for this period.</td></tr>';$('auditorsTable2').innerHTML=rows||'<tr><td colspan="7" class="noData">No audit data for this period.</td></tr>';
 const select=$('auditorFilter') as HTMLSelectElement; const current=select.value; const names=[...new Set(d.auditors.map(a=>a.name))]; select.innerHTML='<option value="all">All auditors</option>'+names.map(n=>`<option value="${escapeHtml(n)}">${escapeHtml(n)}</option>`).join('');select.value=names.includes(current)?current:'all';
 $('updated').textContent=`Updated ${new Date(d.updatedAt).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',second:'2-digit'})}`;
}
function escapeHtml(s:string){return s.replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]!));}
async function load(){const q=new URLSearchParams({period,auditor});const r=await fetch('/api/dashboard?'+q);render(await r.json());}
document.querySelectorAll<HTMLButtonElement>('[data-period]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-period]').forEach(x=>x.classList.remove('selected'));b.classList.add('selected');period=b.dataset.period!;load();});
$('auditorFilter').onchange=()=>{auditor=($('auditorFilter') as HTMLSelectElement).value;load();};
document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(b=>b.onclick=()=>{document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));$(b.dataset.view!).classList.add('active');document.querySelectorAll('nav button').forEach(x=>x.classList.remove('active'));b.classList.add('active');});
load().catch(()=>{$('updated').textContent='Backend unavailable';});
const events=new EventSource('/api/events');events.onmessage=e=>render(JSON.parse(e.data));events.onerror=()=>{$('updated').textContent='Reconnecting…';};
