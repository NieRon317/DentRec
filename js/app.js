import { $ , notify, showView } from './state.js';
import { loadPatients, initPatients } from './patients.js?v=20261106-5';
import { initRecords } from './records.js?v=20261106-5';
import { initCatalog, refreshCatalog } from './catalog.js?v=20261106-5';

initPatients();
initRecords();
initCatalog();
showView('home');

const jakartaTime = new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
const jakartaDate = new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
function updateHomeClock() {
  const now = new Date();
  $('#homeClock').textContent = jakartaTime.format(now);
  $('#homeDate').textContent = jakartaDate.format(now);
}
updateHomeClock();
setInterval(updateHomeClock, 1000);

document.querySelectorAll('.nav-btn').forEach(button => {
  button.onclick = () => {
    showView(button.dataset.view);
    if (button.dataset.view === 'medical') {
      $('#medicalLookup').classList.remove('hidden');
      $('#medicalDetail').classList.add('hidden');
      $('#medicalSearch').focus();
    }
    if (button.dataset.view === 'catalog') refreshCatalog();
  };
});

document.querySelectorAll('.record-tab').forEach(button => {
  button.onclick = () => {
    document.querySelectorAll('.record-tab').forEach(tab => tab.classList.toggle('sub-active', tab === button));
    document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.toggle('hidden', panel.dataset.panel !== button.dataset.tab));
  };
});

(async () => {
  try {
    await loadPatients();
  } catch (error) {
    $('#apiState').textContent = 'gagal';
    notify(error.message);
  }
})();
