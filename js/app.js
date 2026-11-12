// File: app.js — entry point aplikasi, navigasi, dan sesi login
import { $, notify, showView } from './state.js';
import { loadPatients, initPatients } from './patients.js';
import { initRecords } from './records.js';
import { initCatalog, refreshCatalog } from './catalog.js';
import { initReports } from './reports.js';
import { initAdminUsers, startAuthentication } from './auth.js';

const jakartaTime = new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
const jakartaDate = new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
function updateHomeClock() {
  $('#homeClock').textContent = jakartaTime.format(new Date());
  $('#homeDate').textContent = jakartaDate.format(new Date());
}
updateHomeClock();
setInterval(updateHomeClock, 1000);

function initializeApp(user, initialPatients) {
  initPatients();
  initRecords();
  initCatalog();
  initReports();
  showView('home');

  document.addEventListener('click', (event) => {
    const button = event.target.closest?.('button:not(:disabled)');
    if (!button) return;
    button.classList.remove('button-tap');
    void button.offsetWidth;
    button.classList.add('button-tap');
    window.setTimeout(() => button.classList.remove('button-tap'), 280);
  });

  document.querySelectorAll('.nav-btn').forEach((button) => {
    button.onclick = () => {
      showView(button.dataset.view);
      if (button.dataset.view === 'medical') {
        $('#medicalLookup').classList.remove('hidden');
        $('#medicalDetail').classList.add('hidden');
        $('#medicalSearch').focus();
      }
      if (button.dataset.view === 'catalog') refreshCatalog();
      if (button.dataset.view === 'report') $('#reportMessage').textContent = 'Memuat data report…';
      if (button.dataset.view === 'pending') $('#pendingMessage').textContent = 'Memuat daftar pending…';
      if (button.dataset.view === 'admin') initAdminUsers();
    };
  });

  document.querySelectorAll('.record-tab').forEach((button) => {
    button.onclick = () => {
      document.querySelectorAll('.record-tab').forEach((tab) => tab.classList.toggle('sub-active', tab === button));
      document.querySelectorAll('.tab-panel').forEach((panel) => panel.classList.toggle('hidden', panel.dataset.panel !== button.dataset.tab));
    };
  });

  if ((user.menu_permissions || []).includes('dashboard')) {
    loadPatients(Array.isArray(initialPatients) ? initialPatients : undefined).then(() => { $('#apiState').textContent = 'terhubung'; }).catch((error) => {
      $('#apiState').textContent = 'gagal'; notify(error.message);
    });
  } else {
    $('#apiState').textContent = 'terhubung';
  }
}

startAuthentication(initializeApp);
