/**
 * Home page: the 5 best active drivers by rating (/api/ranking.php, built by bin/build.php from elo.json).
 */
const box = document.getElementById('topRankingList');
if (box) {
  fetch('/api/ranking.php').then((r) => r.json()).then(({ d }) => {
    const top = (d || []).filter((r) => r[7] > 0).sort((a, b) => a[7] - b[7]).slice(0, 5);
    for (const [id, name, , elo, , , , rankActive, , , picture] of top) {
      const a = document.createElement('a');
      a.href = `/driver?id=${encodeURIComponent(id)}`;
      a.className = 'relative flex flex-col items-center p-4 rounded-xl bg-white dark:bg-gray-800 shadow hover:shadow-lg transition';
      const badge = document.createElement('span');
      badge.className = 'absolute top-2 left-2 px-2 py-0.5 rounded-full bg-yellow-400 text-gray-900 text-xs font-extrabold';
      badge.textContent = `#${rankActive}`;
      const img = document.createElement('img');
      img.alt = '';
      img.loading = 'lazy';
      img.className = 'w-20 h-20 rounded-full object-cover bg-gray-200 dark:bg-gray-700 mb-2';
      img.src = picture ? `/${picture}` : '/drivers/picture/default.png';
      img.addEventListener('error', () => { img.src = '/drivers/picture/default.png'; }, { once: true });
      const n = document.createElement('span');
      n.className = 'font-semibold text-center text-gray-900 dark:text-gray-100';
      n.textContent = name;
      const e = document.createElement('span');
      e.className = 'text-sm text-blue-600 dark:text-blue-400 font-bold';
      e.textContent = Math.round(elo);
      a.append(badge, img, n, e);
      box.appendChild(a);
    }
  }).catch(() => document.getElementById('topRanking')?.classList.add('hidden'));
}
