// File: catalog.js — pengelolaan katalog tindakan dan obat
import { api } from './api.js';
import { state, $, esc, formData, notify } from './state.js';
import { populateCatalogOptions } from './records.js';

let catalogRequest=null,catalogLoadedAt=0;

export function initCatalog() {
  $('#treatmentList').addEventListener('click', async (event) => {
    const button = event.target.closest('[data-save-treatment]');
    if (!button) return;
    const treatment = state.treatments.find((item) => String(item.id) === button.dataset.saveTreatment);
    const input = $('#treatmentList').querySelector(`[data-treatment-price="${CSS.escape(button.dataset.saveTreatment)}"]`);
    if (!treatment || !input) return;
    const price = Number(input.value);
    if (!Number.isFinite(price) || price < 0) {
      notify('Masukkan harga acuan yang valid.');
      return;
    }
    button.disabled = true;
    try {
      await api('treatments.update', { id: treatment.id, nama: treatment.nama, harga: price, aktif: treatment.aktif ?? true });
      await refresh(true);
      notify('Harga acuan tindakan berhasil diperbarui.');
    } catch (error) {
      button.disabled = false;
      notify(error.message);
    }
  });

  $('#medicineForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (form.dataset.saving === 'true') return;
    form.dataset.saving = 'true';
    const button = event.submitter || form.querySelector('button[type="submit"],button:not([type])');
    if (button) button.disabled = true;
    try {
      await api('medicines.create', { ...formData(form), aktif: true });
      form.reset();
      await refresh(true);
      notify('Obat berhasil ditambahkan.');
    } catch (error) {
      notify(error.message);
    } finally {
      form.dataset.saving = 'false';
      if (button) button.disabled = false;
    }
  });
}

export async function refreshCatalog(force=false, silent=false) {
  try {
    await refresh(force);
  } catch (error) {
    if(!silent)notify(error.message);
  }
}

window.addEventListener('dentrec:api-mutation',event=>{if(/^(treatments|medicines)\.(create|update|delete)$/.test(event.detail?.action))catalogLoadedAt=0;});

async function refresh(force=false) {
  if(catalogRequest)return catalogRequest;
  if(!force&&catalogLoadedAt&&Date.now()-catalogLoadedAt<120000)return;
  catalogRequest=(async()=>{
  [state.treatments, state.medicines] = await Promise.all([api('treatments.list'), api('medicines.list')]);

  $('#treatmentList').innerHTML = state.treatments.map((item) => `
    <div class="grid grid-cols-[minmax(120px,1fr)_150px_auto] gap-2 items-center border-b pb-2">
      <label class="font-medium" for="price-${esc(item.id)}">${esc(item.nama)}</label>
      <input id="price-${esc(item.id)}" data-treatment-price="${esc(item.id)}" type="number" min="0" step="1000" value="${Number(item.harga || 0)}" class="field mt-0" aria-label="Harga acuan ${esc(item.nama)}">
      <button type="button" data-save-treatment="${esc(item.id)}" class="rounded bg-teal-700 px-3 py-2 text-white">Simpan harga</button>
    </div>`).join('') || '<p class="text-sm text-slate-500">Belum ada tindakan. Daftar tindakan perlu disiapkan di tab Treatment_Catalog.</p>';

  $('#medicineList').innerHTML = state.medicines
    .map((item) => `<div class="border-t py-2">${esc(item.nama)} ${esc(item.keterangan || '')}</div>`)
    .join('');

  populateCatalogOptions();
  catalogLoadedAt=Date.now();
  })();
  try{await catalogRequest;}finally{catalogRequest=null;}
}
