const $ = id => document.getElementById(id);
const fmt = m => m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${m % 60}m`;
let period = 'today';
let auditor = 'all';

function escapeHtml(s) {
  return String(s).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
}

function render(d) {
  $('completed').textContent = d.completed;
  $('expired').textContent = d.expired;
  $('reverted').textContent = d.reverted;
  $('auditTime').textContent = fmt(d.totalAuditMinutes);
  $('quality').textContent = d.quality == null ? '—' : `${d.quality}%`;

  const rows = d.auditors.map(a => `<tr><td>${escapeHtml(a.name)}</td><td>${a.completed}</td><td>${a.expired}</td><td>${a.reverted}</td><td>${fmt(a.auditMinutes)}</td><td>${a.quality == null ? '—' : a.quality + '%'}</td></tr>`).join('');
  const empty = '<tr><td colspan="6" class="noData">No audit data for this period.</td></tr>';
  $('auditorsTable').innerHTML = rows || empty;
  $('auditorsTable2').innerHTML = rows || empty;

  const select = $('auditorFilter');
  const names = [...new Set(d.auditors.map(a => a.name))];
  select.innerHTML = '<option value="all">All auditors</option>' + names.map(n => `<option value="${escapeHtml(n)}">${escapeHtml(n)}</option>`).join('');
  select.value = names.includes(auditor) ? auditor : 'all';
  auditor = select.value;
  $('updated').textContent = `Updated ${new Date(d.updatedAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}`;
}

async function load() {
  const q = new URLSearchParams({period, auditor});
  const r = await fetch('/api/dashboard?' + q);
  if (!r.ok) throw new Error('Dashboard unavailable');
  render(await r.json());
}

document.querySelectorAll('[data-period]').forEach(button => button.onclick = () => {
  document.querySelectorAll('[data-period]').forEach(x => x.classList.remove('selected'));
  button.classList.add('selected');
  period = button.dataset.period;
  load().catch(() => $('updated').textContent = 'Backend unavailable');
});

$('auditorFilter').onchange = e => {
  auditor = e.target.value;
  load().catch(() => $('updated').textContent = 'Backend unavailable');
};

document.querySelectorAll('[data-view]').forEach(button => button.onclick = () => {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  $(button.dataset.view).classList.add('active');
  document.querySelectorAll('nav button').forEach(x => x.classList.remove('active'));
  button.classList.add('active');
});

load().catch(() => $('updated').textContent = 'Backend unavailable');
const events = new EventSource('/api/events');
events.onmessage = e => render(JSON.parse(e.data));
events.onerror = () => $('updated').textContent = 'Reconnecting…';
