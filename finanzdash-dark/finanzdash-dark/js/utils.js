
// utils.js

// Alpha Vantage API-Client
export const AV = {
  key: '9T1WL88HZPR5O6LA', // Hardcoded für Testzwecke; für Produktion Proxy-Server oder Umgebungsvariablen verwenden
  base: 'https://www.alphavantage.co/query',

  // Allgemeine Fetch-Methode für alle Endpunkte
  async get(params) {
    const url = `${this.base}?${params}&apikey=${this.key}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }
};

// Financial Modeling Prep API-Client
export const FMP = {
  key: 'R3BLsCRdlEhiulnqQbysv2ALM5rr1e4D', // Hardcoded für Testzwecke; für Produktion Proxy-Server oder Umgebungsvariablen verwenden
  base: 'https://financialmodelingprep.com/api/v3',

  async get(path) {
    const url = `${this.base}${path}?apikey=${this.key}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }
};

// CoinGecko API-Client
export const CG = {
  base: 'https://api.coingecko.com/api/v3',
  async get(path) {
    const url = this.base + path;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }
};

// Hilfsfunktion zum Laden von Tageskursdaten (Alpha Vantage)
export async function getDailyData(symbol) {
  try {
    const data = await AV.get(`function=TIME_SERIES_DAILY_ADJUSTED&symbol=${symbol}&outputsize=compact`);
    const series = data['Time Series (Daily)'] || {};
    const labels = Object.keys(series).reverse();
    const closes = labels.map(date => parseFloat(series[date]['4. close']));
    return { labels, closes };
  } catch (e) {
    console.error(`getDailyData: Error fetching data for ${symbol}: ${e.message}`);
    return { labels: [], closes: [], error: e.message };
  }
}

// DOM-Hilfsfunktionen
export function $(sel, root = document) {
  return root.querySelector(sel);
}

export function $all(sel, root = document) {
  return [...root.querySelectorAll(sel)];
}

// Formatierungs-Hilfsfunktionen
export function fmtUSD(v) {
  if (v === null || v === undefined || isNaN(v)) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(+v);
}

export function fmtPct(v) {
  if (v === null || v === undefined || isNaN(v)) return '—';
  return (v >= 0 ? '+' : '') + Number(v).toFixed(2) + '%';
}

// Debouncing für Eingaben
export function debounce(fn, ms = 250) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

// Spinner-Steuerung
export function spinner(showEl, canvasEl, show = true) {
  if (!showEl || !canvasEl) return;
  showEl.classList.toggle('d-none', !show);
  canvasEl.classList.toggle('d-none', show);
}

// Watchlist-Verwaltung
export function saveWatchlist(list) {
  try {
    localStorage.setItem('watchlist', JSON.stringify(list));
  } catch (e) {
    console.error('saveWatchlist: Error saving watchlist:', e);
  }
}

export function loadWatchlist() {
  try {
    return JSON.parse(localStorage.getItem('watchlist') || '[]');
  } catch (e) {
    console.error('loadWatchlist: Error loading watchlist:', e);
    return [];
  }
}

// Suche nach Aktien (Financial Modeling Prep)
export async function fmpSearch(query, limit = 10, exchange = '') {
  const q = (query || '').trim();
  if (q.length < 2) return { results: [], error: 'Mindestens 2 Zeichen erforderlich' };

  try {
    // Erster Versuch: /search-ticker
    let results = await FMP.get(`/search-ticker?query=${encodeURIComponent(q)}&limit=${limit}${exchange ? `&exchange=${encodeURIComponent(exchange)}` : ''}`);
    if (Array.isArray(results) && results.length) {
      console.debug(`fmpSearch: Found ${results.length} results via /search-ticker for query "${q}"`);
      return { results, error: null };
    }

    // Fallback: /search
    results = await FMP.get(`/search?query=${encodeURIComponent(q)}&limit=${limit}${exchange ? `&exchange=${encodeURIComponent(exchange)}` : ''}`);
    if (Array.isArray(results) && results.length) {
      console.debug(`fmpSearch: Found ${results.length} results via /search for query "${q}"`);
      return { results, error: null };
    }

    console.warn(`fmpSearch: No results for query "${q}"`);
    return { results: [], error: 'Keine Treffer gefunden' };
  } catch (e) {
    console.error(`fmpSearch: Error for query "${q}": ${e.message}`);
    return { results: [], error: `Fehler beim Suchen: ${e.message}` };
  }
}