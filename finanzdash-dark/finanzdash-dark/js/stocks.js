

import { AV, $, fmtUSD, fmtPct, debounce, spinner, loadWatchlist, saveWatchlist, getDailyData } from './utils.js';

const search = $('#stockSearch');
const list = $('#searchList');
const wlView = $('#wlList');
const detail = $('#detail');
const addFav = $('#addFav');

let cmpChart;
const cmpInput = $('#cmpInput');
const cmpBtn = $('#cmpBtn');
const daysSel = $('#days');
const cmpLoader = $('#cmpLoader');

function wl() { return loadWatchlist(); }
function wlAdd(sym) { const set = new Set(wl()); set.add(sym); saveWatchlist([...set]); renderWL(); }
function wlRemove(sym) { const arr = wl().filter(x=>x!==sym); saveWatchlist(arr); renderWL(); }

async function suggest(q) {
  if (!q || q.trim().length < 2) { list.style.display = 'none'; return; }
  try {
    const data = await AV.get(`function=SYMBOL_SEARCH&keywords=${encodeURIComponent(q)}`);
    const res = data.bestMatches || [];
    if (!res.length) {
      list.innerHTML = '<div class="autocomplete-item text-secondary">Keine Treffer</div>';
      list.style.display = 'block';
      return;
    }
    list.innerHTML = res.map(x => `
      <div class="autocomplete-item" data-sym="${x['1. symbol']}">
        <strong>${x['1. symbol']}</strong> — ${x['2. name']}
      </div>`).join('');
    list.style.display = 'block';
  } catch (e) {
    list.innerHTML = '<div class="autocomplete-item text-danger">Fehler beim Suchen</div>';
    list.style.display = 'block';
  }
}
search.addEventListener('input', debounce(e => suggest(e.target.value.trim()), 200));
list.addEventListener('click', e => {
  const it = e.target.closest('.autocomplete-item'); if (!it) return;
  list.style.display='none';
  window.location.hash = it.dataset.sym;
  loadDetails(it.dataset.sym);
});
document.addEventListener('click', (e)=>{ if(!list.contains(e.target) && e.target!==search) list.style.display='none'; });

async function loadDetails(sym) {
  if (!sym) return;
  addFav.onclick = () => wlAdd(sym);
  $('#detailLoader').classList.remove('d-none');
  detail.innerHTML = '';
  try {
    const [qData] = await FMP.get(`/quote/${sym}`); 
    const meta = [
      ['Preis', fmtUSD(qData.price)],
      ['Tagesänderung', `${qData.change?.toFixed(2)} (${fmtPct(qData.changesPercentage)})`],
      ['52W Hoch', fmtUSD(qData.yearHigh)],
      ['52W Tief', fmtUSD(qData.yearLow)],
      ['Marktkap.', fmtUSD(qData.marketCap)],
      ['Volumen', qData.volume?.toLocaleString('en-US') || '—']
    ];
    detail.innerHTML = meta.map(([k,v]) => `<div class="col-6 d-flex justify-content-between"><span class="text-secondary">${k}</span><strong>{v}</strong></div>`.replace('{v}', v)).join('');
  } catch (e) {
  detail.innerHTML = '<p class="text-danger">Fehler beim Laden: ' + e.message + '</p>';
  } finally {
    $('#detailLoader').classList.add('d-none');
  }
}

async function loadCompare() {
  const tickers = (cmpInput.value || '').toUpperCase().split(',').map(s => s.trim()).filter(Boolean).slice(0,3);
  if (!tickers.length) return;
  cmpLoader.classList.remove('d-none');

  try {
    const datasets = [];
    let labels = [];

    for (const t of tickers) {
      const { labels: lbls, closes } = await getDailyData(t);
      if (!labels.length) labels = lbls;
      datasets.push({
        label: t,
        data: closes,
        fill: false,
        tension: 0.25,
        pointRadius: 0,
        borderWidth: 2
      });
    }

    const ctx = document.getElementById('cmpChart').getContext('2d');
    if (cmpChart) cmpChart.destroy();
    cmpChart = new Chart(ctx, {
      type: 'line',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: true } }
      }
    });

    loadDetails(tickers[0]);

  } catch (err) {
    console.error(err);
  } finally {
    cmpLoader.classList.add('d-none');
  }
}
cmpBtn.addEventListener('click', loadCompare);
window.addEventListener('DOMContentLoaded', () => {
  const hash = (location.hash||'').replace('#','');
  if (hash) { search.value = hash; loadDetails(hash); cmpInput.value = hash; }
});
function renderWL() {
  const list = wl();
  wlView.innerHTML = list.length ? '' : '<span class="text-secondary">Keine Einträge.</span>';
  list.forEach(sym => {
    const row = document.createElement('div');
    row.className = 'd-flex justify-content-between align-items-center border rounded px-2 py-1';
    row.innerHTML = `<div><strong>${sym}</strong></div><div class="d-flex gap-2">
      <a class="btn btn-sm btn-outline-light" href="#${sym}" onclick="event.preventDefault(); loadDetails('${sym}'); cmpInput.value='${sym}';">Öffnen</a>
      <button class="btn btn-sm btn-outline-danger">Entfernen</button>
    </div>`;
    row.querySelector('button').addEventListener('click', ()=> wlRemove(sym));
    wlView.appendChild(row);
  });
}
renderWL();
