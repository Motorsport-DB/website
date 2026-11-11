/**
 * MotorsportDB - Ranking page: ELO of the drivers (/api/ranking.php, built by bin/build.php).
 * Row: [id, name, country, elo, peak, races, rank, rankActive, firstYear, lastYear, picture, championships]
 */
const PAGE = 100;
const DISCIPLINE = (champs) => {
  const set = new Set();
  for (const c of champs) {
    if (/^(Grand_Prix_|Moto|MotoE)/.test(c)) set.add('bike');
    else if (/WRC|Rally/.test(c)) set.add('rally');
    else if (/Karting/.test(c)) set.add('karting');
    else set.add('circuit');
  }
  return set;
};
const fold = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const body = document.getElementById('ranking-body');
const more = document.getElementById('ranking-more');
const search = document.getElementById('ranking-search');
const discipline = document.getElementById('ranking-discipline');
const note = document.getElementById('ranking-note');
let rows = [];
let tab = new URLSearchParams(location.search).get('tab') === 'all' ? 'all' : 'active';
let list = [];
let shown = 0;

function cell(text, cls = '') {
  const td = document.createElement('td');
  td.className = `px-3 py-2 ${cls}`;
  if (text instanceof Node) td.appendChild(text); else td.textContent = text;
  return td;
}

function renderRows() {
  const frag = document.createDocumentFragment();
  for (const r of list.slice(shown, shown + PAGE)) {
    const [id, name, country, elo, peak, , rank, rankActive, first, last, picture] = r;
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-gray-50 dark:hover:bg-gray-700/50';
    const who = document.createElement('a');
    who.href = `/driver?id=${encodeURIComponent(id)}`;
    who.className = 'flex items-center gap-3 text-gray-900 dark:text-gray-100 hover:text-blue-600';
    const img = document.createElement('img');
    img.loading = 'lazy';
    img.alt = '';
    img.className = 'w-8 h-8 rounded-full object-cover bg-gray-200 dark:bg-gray-700 flex-shrink-0';
    img.src = picture ? `/${picture}` : '/drivers/picture/default.png';
    img.addEventListener('error', () => { img.src = '/drivers/picture/default.png'; }, { once: true });
    const flag = document.createElement('img');
    flag.loading = 'lazy';
    flag.alt = country.replace(/_/g, ' ');
    flag.className = 'w-5 h-4 object-contain';
    flag.src = country ? `/assets/flags/${country.toLowerCase()}.png` : '/assets/flags/default.png';
    flag.addEventListener('error', () => { flag.src = '/assets/flags/default.png'; }, { once: true });
    const label = document.createElement('span');
    label.className = 'font-medium';
    label.textContent = name;
    who.append(img, flag, label);
    const main = tab === 'active' ? elo : peak;
    const other = tab === 'active' ? peak : elo;
    tr.append(
      cell(String(tab === 'active' ? rankActive : rank), 'text-right font-semibold text-gray-500'),
      cell(who),
      cell(String(Math.round(main)), 'text-right font-bold text-blue-600 dark:text-blue-400'),
      cell(String(Math.round(other)), 'text-right text-gray-500 hidden sm:table-cell'),
      cell(first === last ? String(first) : `${first}–${last}`, 'text-right text-gray-500 hidden md:table-cell'),
    );
    frag.appendChild(tr);
  }
  body.appendChild(frag);
  shown = Math.min(list.length, shown + PAGE);
  more.classList.toggle('hidden', shown >= list.length);
}

function update() {
  const q = fold(search.value.trim());
  const d = discipline.value;
  list = rows
    .filter((r) => (tab === 'all' || r[7] > 0))
    .filter((r) => !d || DISCIPLINE(r[11]).has(d))
    .filter((r) => !q || fold(r[1]).includes(q));
  list.sort((a, b) => (tab === 'active' ? a[7] - b[7] : a[6] - b[6]));
  document.getElementById('ranking-col-main').textContent = tab === 'active' ? 'ELO' : 'Peak ELO';
  document.getElementById('ranking-col-other').textContent = tab === 'active' ? 'Peak' : 'Current';
  for (const b of document.querySelectorAll('.ranking-tab')) {
    const on = b.dataset.tab === tab;
    b.classList.toggle('bg-blue-600', on);
    b.classList.toggle('text-white', on);
    b.classList.toggle('text-gray-700', !on);
    b.classList.toggle('dark:text-gray-300', !on);
  }
  note.textContent = `${list.length} driver(s). ${tab === 'active'
    ? 'Drivers who raced this season or the last one, by current rating.'
    : 'Every driver, by best rating reached during the career.'} Ranks are world ranks.`;
  body.innerHTML = '';
  shown = 0;
  renderRows();
}

async function init() {
  try {
    const res = await fetch('/api/ranking.php');
    rows = (await res.json()).d || [];
  } catch {
    note.textContent = 'The ranking could not be loaded.';
    return;
  }
  for (const b of document.querySelectorAll('.ranking-tab')) {
    b.addEventListener('click', () => {
      tab = b.dataset.tab;
      history.replaceState(null, '', `?tab=${tab}`);
      update();
    });
  }
  let t;
  search.addEventListener('input', () => { clearTimeout(t); t = setTimeout(update, 120); });
  discipline.addEventListener('change', update);
  more.addEventListener('click', renderRows);
  update();
}

init();
