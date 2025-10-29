

import { plotLine } from './viz.js';
import { FMP, CG, $, fmtUSD, fmtPct, debounce, spinner, loadWatchlist, saveWatchlist, fmpSearch } from './utils.js';



const input = $('#quickInput');
const list = $('#quickList');
const info = $('#quickInfo');
const btnGo = $('#quickGo');
const btnFav = $('#quickFav');
let selected = null;

async function searchSuggestions(q) {
  if (!q || q.trim().length < 2) { 
    list.style.display = 'none'; 
    return; 
  }
  try {
    const res = await fmpSearch(q, 8, 'NASDAQ');
    if (!res.length) {
      list.innerHTML = '<div class="autocomplete-item text-secondary">Keine Treffer</div>';
      list.style.display = 'block';
      return;
    }
    list.innerHTML = res.map(x => 
      `<div class="autocomplete-item" data-sym="${x.symbol}">
        <strong>${x.symbol}</strong> — ${x.name || ''}
      </div>`).join('');
    list.style.display = 'block';
  } catch (e) {
    list.innerHTML = '<div class="autocomplete-item text-danger">Fehler beim Suchen</div>';
    list.style.display = 'block';
  }
}
list.addEventListener('click', e => {
  const item = e.target.closest('.autocomplete-item'); if (!item) return;
  input.value = item.dataset.sym; selected = item.dataset.sym; list.style.display = 'none';
});
document.addEventListener('click', (e) => { if (!list.contains(e.target) && e.target!==input) list.style.display='none'; });

btnGo.addEventListener('click', () => {
  const t = (input.value || '').trim().toUpperCase();
  if (!t) { info.textContent = 'Bitte Ticker eingeben.'; return; }
  window.location.href = `stocks.html#${t}`;
});
btnFav.addEventListener('click', async () => {
  const t = (input.value || '').trim().toUpperCase();
  if (!t) return;
  const wl = loadWatchlist();
  if (!wl.includes(t)) { wl.push(t); saveWatchlist(wl); info.textContent = `${t} zur Watchlist hinzugefügt.`; }
});

// AAPL widget
(async () => {
  const loader = $('#aaplLoader'); const canvas = $('#aaplChart');
  try {
    const days = 60;
    const hist = await FMP.get(`/historical-price-full/AAPL?serietype=line&timeseries=${days}`);
    const arr = (hist.historical||[]).reverse();
    const labels = arr.map(x=>x.date);
    const prices = arr.map(x=>x.close);
    plotLine('aaplChart', labels, prices, 'AAPL (Close)');
    spinner(loader, canvas, false);
    const q = await FMP.get('/quote/AAPL');
    const s = q[0];
    $('#aaplChange').textContent = fmtPct(s.changesPercentage);
    $('#aaplChange').className = 'badge ' + (s.changesPercentage>=0 ? 'bg-success':'bg-danger');
    $('#aaplMeta').textContent = `Letzter Schluss: ${fmtUSD(prices.at(-1))} | Punkte: ${prices.length}`;
  } catch (e) { $('#aaplMeta').textContent = 'Fehler beim Laden.'; }
})();

// BTC widget
(async () => {
  const loader = $('#btcLoader'); const canvas = $('#btcChart');
  try {
    const data = await CG.get('/coins/bitcoin/market_chart?vs_currency=usd&days=30');
    const pts = data.prices||[];
    const labels = pts.map(p=> new Date(p[0]).toISOString().slice(5,10));
    const prices = pts.map(p=> p[1]);
    plotLine('btcChart', labels, prices, 'BTC (USD)');
    spinner(loader, canvas, false);
    const change = ((prices.at(-1)-prices[0])/prices[0])*100;
    $('#btcChange').textContent = fmtPct(change);
    $('#btcMeta').textContent = `Letzter Preis: ${fmtUSD(prices.at(-1))} | Punkte: ${prices.length}`;
  } catch (e) { $('#btcMeta').textContent = 'Fehler beim Laden.'; }
})();

// Render watchlist on home
(function renderWL() {
  const container = $('#watchlist');
  const wl = loadWatchlist();
  if (!wl.length) { container.innerHTML = '<p class="text-secondary">Noch keine Einträge. Füge Ticker über die Suche hinzu.</p>'; return; }
  container.innerHTML = '';
  wl.forEach(sym => {
    const card = document.createElement('div');
    card.className = 'col-sm-6 col-lg-4';
    card.innerHTML = `<div class="card h-100"><div class="card-body">
      <div class="d-flex justify-content-between align-items-center">
        <h6 class="m-0">${sym}</h6>
        <a class="btn btn-sm btn-outline-secondary" href="stocks.html#${sym}">Öffnen</a>
      </div>
      <div id="q_${sym}" class="small text-secondary mt-2">Lade…</div>
    </div></div>`;
    container.appendChild(card);
  });
  // fetch quotes
  Promise.all(wl.map(s => FMP.get(`/quote/${s}`))).then(all => {
    all.flat().forEach(s => {
      const el = document.getElementById('q_'+s.symbol);
      if (el) el.innerHTML = `<strong>${fmtUSD(s.price)}</strong> (${fmtPct(s.changesPercentage)})`;
    });
  }).catch(()=>{});
})();
