
import { CG, $, fmtUSD, spinner } from './utils.js';


let chart;
const coinSel = $('#coinId');
const daySel = $('#coinDays');
const loader = $('#coinLoader');

async function load() {
  try {
    loader.classList.remove('d-none');
    const id = coinSel.value;
    const days = daySel.value;
    const [chartData, market] = await Promise.all([
      CG.get(`/coins/${id}/market_chart?vs_currency=usd&days=${days}`),
      CG.get(`/coins/markets?vs_currency=usd&ids=${id}`)
    ]);
    const pts = chartData.prices || [];
    const labels = pts.map(p => new Date(p[0]).toISOString().slice(5,10));
    const prices = pts.map(p => p[1]);
    if (chart) chart.destroy();
    chart = new Chart(document.getElementById('coinChart'), {
      type:'line',
      data:{ labels, datasets:[{ label: market[0].symbol.toUpperCase(), data: prices, fill:false, tension:.25, pointRadius:0, borderWidth:2 }]},
      options:{ responsive:true, maintainAspectRatio:false }
    });
    $('#coinInfo').innerHTML = `
      <div class="d-flex justify-content-between"><span>Preis</span><strong>${fmtUSD(market[0].current_price)}</strong></div>
      <div class="d-flex justify-content-between"><span>24h Änderung</span><strong>${(market[0].price_change_percentage_24h||0).toFixed(2)}%</strong></div>
      <div class="d-flex justify-content-between"><span>Marktkap.</span><strong>${fmtUSD(market[0].market_cap)}</strong></div>
      <div class="d-flex justify-content-between"><span>24h Volumen</span><strong>${fmtUSD(market[0].total_volume)}</strong></div>
      <div class="d-flex justify-content-between"><span>ATH</span><strong>${fmtUSD(market[0].ath)}</strong></div>
    `;
  } finally {
    loader.classList.add('d-none');
  }
}

$('#loadCoin').addEventListener('click', load);
window.addEventListener('DOMContentLoaded', load);
