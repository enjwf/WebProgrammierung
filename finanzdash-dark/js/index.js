import { plotLine } from './viz.js';
import { AV, CG, FMP, $, fmtUSD, fmtPct, debounce, spinner, loadWatchlist, saveWatchlist, fmpSearch } from './utils.js';

// DOM-Elemente
const input = $('#quickInput');
const list = $('#quickList');
const info = $('#quickInfo');
const btnGo = $('#quickGo');
const btnFav = $('#quickFav');
let selected = null;

// === SCHNELLSUCHE ===
async function searchSuggestions(q) {
  if (!list) return;
  if (!q || q.trim().length < 2) {
    list.style.display = 'none';
    return;
  }
  try {
    const res = await fmpSearch(q, 8, 'NASDAQ');
    if (!res.results?.length) {
      list.innerHTML = '<div class="autocomplete-item text-secondary">Keine Treffer</div>';
      list.style.display = 'block';
      return;
    }
    list.innerHTML = res.results.map(x =>
      `<div class="autocomplete-item" data-sym="${x.symbol}">
        <strong>${x.symbol}</strong> — ${x.name || ''}
      </div>`
    ).join('');
    list.style.display = 'block';
  } catch (e) {
    list.innerHTML = '<div class="autocomplete-item text-danger">Fehler beim Suchen</div>';
    list.style.display = 'block';
  }
}

// Autocomplete-Interaktion (nur wenn Liste existiert)
if (list) {
  list.addEventListener('click', e => {
    const item = e.target.closest?.('.autocomplete-item');
    if (!item) return;
    if (input) input.value = item.dataset.sym;
    selected = item.dataset.sym;
    list.style.display = 'none';
  });

  // Klick außerhalb versteckt die Liste
  document.addEventListener('click', e => {
    if (!list) return;
    if (!list.contains(e.target) && e.target !== input) {
      list.style.display = 'none';
    }
  });
}

// Buttons (nur anhängen, wenn vorhanden)
if (btnGo) {
  btnGo.addEventListener('click', () => {
    const t = (input?.value || '').trim().toUpperCase();
    if (!t) {
      if (info) info.textContent = 'Bitte Ticker eingeben.';
      return;
    }
    window.location.href = `stocks.html#${t}`;
  });
}

if (btnFav) {
  btnFav.addEventListener('click', async () => {
    const t = (input?.value || '').trim().toUpperCase();
    if (!t) return;
    const wl = loadWatchlist();
    if (!wl.includes(t)) {
      wl.push(t);
      saveWatchlist(wl);
      renderWL(); // Sofort aktualisieren
      if (info) info.textContent = `${t} zur Watchlist hinzugefügt.`;
    } else {
      if (info) info.textContent = `${t} ist bereits in der Watchlist.`;
    }
  });
}

// === AAPL WIDGET (mit Alpha Vantage) ===
(async () => {
  const loader = $('#aaplLoader');
  const canvas = $('#aaplChart');
  const changeEl = $('#aaplChange');
  const metaEl = $('#aaplMeta');

  if (!loader || !canvas || !changeEl || !metaEl) return;

  spinner(loader, canvas, true);

  try {
    // 1. Historische Daten von Alpha Vantage
    const data = await AV.get('function=TIME_SERIES_DAILY_ADJUSTED&symbol=AAPL&outputsize=compact');
    const series = data['Time Series (Daily)'];
    if (!series) throw new Error('Keine Daten');

    const entries = Object.entries(series);
    const sorted = entries.sort((a, b) => new Date(a[0]) - new Date(b[0]));
    const labels = sorted.map(([date]) => date.slice(5));
    const prices = sorted.map(([, v]) => parseFloat(v['4. close']));

    // Chart zeichnen
    plotLine('aaplChart', labels, prices, 'AAPL (Close)');

    // 2. Aktueller Kurs von FMP (nur falls verfügbar)
    if (typeof FMP !== 'undefined' && FMP.get) {
      try {
        const [quote] = await FMP.get('/quote/AAPL');
        if (quote) {
          changeEl.textContent = fmtPct(quote.changesPercentage);
          changeEl.className = 'badge ' + (quote.changesPercentage >= 0 ? 'bg-success' : 'bg-danger');
          metaEl.textContent = `Letzter Schluss: ${fmtUSD(quote.price)} | ${prices.length} Tage`;
        }
      } catch (e) {
        console.warn('FMP quote failed:', e);
        metaEl.textContent = `Letzter Schluss: ${fmtUSD(prices[prices.length - 1] || 0)} | ${prices.length} Tage`;
      }
    } else {
      // Fallback falls FMP nicht geladen ist
      metaEl.textContent = `Letzter Schluss: ${fmtUSD(prices[prices.length - 1] || 0)} | ${prices.length} Tage`;
    }

  } catch (e) {
    console.error('AAPL Widget:', e);
    metaEl.textContent = 'Fehler beim Laden (API-Key prüfen)';
    changeEl.textContent = '—';
  } finally {
    spinner(loader, canvas, false);
  }
})();

// === BTC WIDGET (mit CoinGecko) ===
(async () => {
  const loader = $('#btcLoader');
  const canvas = $('#btcChart');
  const changeEl = $('#btcChange');
  let metaEl = $('#btcMeta');

  // Falls #btcMeta im HTML fehlt: dynamisch erstellen (so läuft das Widget trotzdem)
  if (!metaEl && canvas && canvas.parentElement) {
    metaEl = document.createElement('div');
    metaEl.id = 'btcMeta';
    metaEl.className = 'small text-secondary mt-2';
    canvas.parentElement.appendChild(metaEl);
  }

  if (!loader || !canvas || !changeEl || !metaEl) return;

  spinner(loader, canvas, true);

  try {
    const [market, chartData] = await Promise.all([
      CG.get('/coins/markets?vs_currency=usd&ids=bitcoin'),
      CG.get('/coins/bitcoin/market_chart?vs_currency=usd&days=30')
    ]);

    const btc = market[0];
    const prices = chartData.prices.map(p => p[1]);
    const labels = chartData.prices.map(p => new Date(p[0]).toLocaleDateString('de', { day: 'numeric' }));

    // Mini-Chart
    plotLine('btcChart', labels, prices, 'BTC (USD)', {
      borderColor: '#0dcaf0',
      backgroundColor: 'rgba(13, 202, 240, 0.1)',
      fill: true,
      tension: 0.3,
      pointRadius: 0
    });

    // 24h Änderung
    changeEl.textContent = fmtPct(btc.price_change_percentage_24h);
    changeEl.className = 'badge ' + (btc.price_change_percentage_24h >= 0 ? 'bg-success' : 'bg-danger');

    metaEl.textContent = `Aktuell: ${fmtUSD(btc.current_price)} | 24h Vol: ${fmtUSD(btc.total_volume)}`;

  } catch (e) {
    console.error('BTC Widget:', e);
    metaEl.textContent = 'Fehler beim Laden';
    changeEl.textContent = '—';
  } finally {
    spinner(loader, canvas, false);
  }
})();

// === WATCHLIST RENDERN ===
function renderWL() {
  const container = $('#watchlist');
  if (!container) return;

  const wl = loadWatchlist();
  container.innerHTML = ''; // WICHTIG: Leeren!

  if (!wl.length) {
    container.innerHTML = '<p class="text-secondary">Noch keine Einträge. Füge Ticker über die Suche hinzu.</p>';
    return;
  }

  wl.forEach(sym => {
    const card = document.createElement('div');
    card.className = 'col-sm-6 col-lg-4';
    card.innerHTML = `
      <div class="card h-100">
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-center">
            <h6 class="m-0">${sym}</h6>
            <a class="btn btn-sm btn-outline-secondary" href="stocks.html#${sym}">Öffnen</a>
          </div>
          <div id="q_${sym}" class="small text-secondary mt-2">Lade…</div>
        </div>
      </div>`;
    container.appendChild(card);
  });

  // Kurse laden (falls FMP verfügbar)
  if (typeof FMP === 'undefined' || !FMP.get) {
    // API nicht verfügbar -> Hinweise anzeigen
    wl.forEach(sym => {
      const el = document.getElementById(`q_${sym}`);
      if (el) el.innerHTML = '<span class="text-danger">API nicht verfügbar</span>';
    });
    return;
  }

  Promise.allSettled(wl.map(s => FMP.get(`/quote/${s}`))).then(results => {
    results.forEach((res, i) => {
      const sym = wl[i];
      const el = document.getElementById(`q_${sym}`);
      if (!el) return;

      if (res.status === 'fulfilled' && res.value[0]) {
        const s = res.value[0];
        el.innerHTML = `<strong>${fmtUSD(s.price)}</strong> (${fmtPct(s.changesPercentage)})`;
      } else {
        el.innerHTML = '<span class="text-danger">Fehler</span>';
      }
    });
  }).catch(e => {
    console.error('Watchlist quotes failed:', e);
  });
}

// Beim Laden rendern
renderWL();

// Suche aktivieren (debounced)
if (input) {
  input.addEventListener('input', debounce(e => {
    searchSuggestions(e.target.value.trim());
  }, 250));
}