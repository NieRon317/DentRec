import { api } from './api.js';
import { state, $, esc, formData, notify } from './state.js';
import { populateCatalogOptions } from './records.js?v=20261106-2';

export function initCatalog() {
  $('#treatmentForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    try {
      const data = formData(form);
      data.harga = Number(data.harga);
      data.aktif = true;
      await api('treatments.create', data);
      form.reset();
      await refresh();
    } catch (error) {
      notify(error.message);
    }
  });

  $('#medicineForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    try {
      await api('medicines.create', { ...formData(form), aktif: true });
      form.reset();
      await refresh();
    } catch (error) {
      notify(error.message);
    }
  });
}

export async function refreshCatalog() {
  try {
    await refresh();
  } catch (error) {
    notify(error.message);
  }
}

async function refresh() {
  state.treatments = await api('treatments.list');
  state.medicines = await api('medicines.list');

  $('#treatmentList').innerHTML = state.treatments
    .map((item) => `<div class="border-t py-2">${esc(item.nama)} — Rp ${Number(item.harga || 0).toLocaleString('id-ID')}</div>`)
    .join('');

  $('#medicineList').innerHTML = state.medicines
    .map((item) => `<div class="border-t py-2">${esc(item.nama)} ${esc(item.keterangan || '')}</div>`)
    .join('');

  populateCatalogOptions();
}
