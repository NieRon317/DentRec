// File: expenses.js — biaya operasional, pembelian, dan persediaan barang
import { api } from './api.js';
import { $, esc, notify } from './state.js';

let request = null, loadedAt = 0, expenses = [], inventory = [];
const money = value => 'Rp ' + Number(value || 0).toLocaleString('id-ID');
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
function setDates() { document.querySelectorAll('#view-expenses input[type="date"]').forEach(input => { if (!input.value) input.value = today(); }); }
function fillItemSelects() {
  document.querySelectorAll('#inventoryPurchaseForm select[name="item_id"],#inventoryUsageForm select[name="item_id"]').forEach(select => {
    const selected = select.value;
    select.innerHTML = '<option value="">Pilih barang</option>' + inventory.filter(item => item.aktif !== false && String(item.aktif).toLowerCase() !== 'false').map(item => `<option value="${esc(item.id)}">${esc(item.nama)} (stok ${Number(item.stok || 0)} ${esc(item.satuan)})</option>`).join('');
    if (inventory.some(item => String(item.id) === selected)) select.value = selected;
  });
}
function render() {
  $('#inventoryRows').innerHTML = inventory.length ? inventory.map(item => {
    const low = Number(item.stok || 0) <= Number(item.stok_minimum || 0);
    return `<tr class="border-b"><td class="p-2 font-medium">${esc(item.nama)}${String(item.aktif).toLowerCase() === 'false' ? ' <span class="text-xs text-slate-500">(nonaktif)</span>' : ''}</td><td class="p-2"><b class="${low ? 'text-rose-700' : 'text-teal-800'}">${Number(item.stok || 0).toLocaleString('id-ID')} ${esc(item.satuan)}</b>${low ? '<div class="text-xs text-rose-600">Stok minimum</div>' : ''}</td><td class="p-2">${Number(item.stok_minimum || 0).toLocaleString('id-ID')} ${esc(item.satuan)}</td><td class="p-2">${money(item.harga_satuan_rata)}</td><td class="p-2 whitespace-nowrap"><button type="button" class="action-btn action-edit" data-item-edit="${esc(item.id)}">Edit barang</button></td></tr>`;
  }).join('') : '<tr><td colspan="5" class="p-4 text-center text-slate-500">Belum ada barang persediaan.</td></tr>';
  $('#expenseRows').innerHTML = expenses.length ? expenses.slice(0, 200).map(expense => `<tr class="border-b"><td class="p-2 whitespace-nowrap">${esc(expense.tanggal)}</td><td class="p-2">${esc(expense.jenis)}<div class="text-xs text-slate-500">${esc(expense.kategori)}</div></td><td class="p-2">${esc(expense.keterangan)}${expense.inventory_name ? `<div class="text-xs text-slate-500">${esc(expense.inventory_name)} · ${Number(expense.jumlah || 0).toLocaleString('id-ID')} ${esc(expense.satuan)}</div>` : ''}</td><td class="p-2 text-right">${expense.jenis === 'Pembelian Stok' ? `${Number(expense.jumlah || 0).toLocaleString('id-ID')} ${esc(expense.satuan)}` : '—'}</td><td class="p-2 text-right whitespace-nowrap">${money(expense.total)}</td><td class="p-2"><button type="button" class="text-rose-700 hover:text-rose-900" data-expense-delete="${esc(expense.id)}">Hapus</button></td></tr>`).join('') : '<tr><td colspan="6" class="p-4 text-center text-slate-500">Belum ada biaya yang dicatat.</td></tr>';
  fillItemSelects();
}
export function loadExpenses(force = false) {
  if (request) return request;
  if (!force && loadedAt && Date.now() - loadedAt < 120000) return Promise.resolve();
  $('#expenseMessage').textContent = 'Memuat biaya dan persediaan…';
  request = (async () => {
    try { const data = await api('expenses.bootstrap'); expenses = data.expenses || []; inventory = data.inventory || []; render(); setDates(); loadedAt = Date.now(); $('#expenseMessage').textContent = ''; }
    catch (error) { $('#expenseMessage').textContent = 'Data biaya gagal dimuat: ' + error.message; }
    finally { request = null; }
  })();
  return request;
}
function wireForm(formId, action, successMessage, afterSave) {
  const form = $(formId);
  form.addEventListener('submit', async event => {
    event.preventDefault(); const button = form.querySelector('button[type="submit"]') || form.querySelector('button:not([type])');
    if (!form.reportValidity()) return;
    const oldLabel = button.textContent; button.disabled = true; button.textContent = 'Menyimpan…';
    const data = Object.fromEntries(new FormData(form).entries());
    try { await api(action, data); form.reset(); if (afterSave) afterSave(); await loadExpenses(true); notify(successMessage); }
    catch (error) { notify(error.message); }
    finally { button.disabled = false; button.textContent = oldLabel; }
  });
}
export function initExpenses() {
  $('#refreshExpenses').addEventListener('click', () => loadExpenses(true));
  wireForm('#routineExpenseForm', 'expenses.create', 'Biaya rutin berhasil disimpan.');
  wireForm('#inventoryItemForm', 'inventory.items.create', 'Barang persediaan berhasil ditambahkan.');
  wireForm('#inventoryPurchaseForm', 'expenses.create', 'Pembelian tersimpan dan stok bertambah.');

  const usageForm = $('#inventoryUsageForm'), usageType = usageForm.elements.jenis, usageQty = usageForm.elements.jumlah;
  usageType.addEventListener('change', () => { const adjustment = usageType.value === 'Penyesuaian'; usageQty.min = adjustment ? '-999999999' : '0.01'; usageQty.placeholder = adjustment ? 'Positif menambah, negatif mengurangi' : ''; });
  // Satu handler mengirim pemakaian atau koreksi stok ke endpoint yang tepat.
  usageForm.addEventListener('submit', async event => {
    event.preventDefault(); if (!usageForm.reportValidity()) return;
    const button = usageForm.querySelector('button'), oldLabel = button.textContent; button.disabled = true; button.textContent = 'Menyimpan…';
    try { const adjustment = usageType.value === 'Penyesuaian'; await api(adjustment ? 'inventory.adjust' : 'inventory.consume', Object.fromEntries(new FormData(usageForm).entries())); usageForm.reset(); usageType.value = 'Keluar'; usageQty.min = '0.01'; await loadExpenses(true); notify(adjustment ? 'Koreksi stok berhasil disimpan.' : 'Pemakaian stok berhasil dicatat.'); }
    catch (error) { notify(error.message); }
    finally { button.disabled = false; button.textContent = oldLabel; }
  });
  $('#view-expenses').addEventListener('click', async event => {
    const edit = event.target.closest('[data-item-edit]');
    if (edit) {
      const item = inventory.find(value => String(value.id) === edit.dataset.itemEdit); if (!item) return;
      const nama = prompt('Nama barang:', item.nama); if (nama === null) return;
      const satuan = prompt('Satuan:', item.satuan); if (satuan === null) return;
      const stok_minimum = prompt('Batas stok minimum:', item.stok_minimum || 0); if (stok_minimum === null) return;
      edit.disabled = true;
      try { await api('inventory.items.update', { id: item.id, nama, satuan, stok_minimum }); await loadExpenses(true); notify('Data barang diperbarui.'); }
      catch (error) { notify(error.message); edit.disabled = false; }
      return;
    }
    const remove = event.target.closest('[data-expense-delete]'); if (!remove) return;
    if (!confirm('Hapus pencatatan biaya ini? Pembelian stok hanya dapat dihapus jika stoknya belum dipakai.')) return;
    remove.disabled = true;
    try { await api('expenses.delete', { id: remove.dataset.expenseDelete }); await loadExpenses(true); notify('Biaya berhasil dihapus.'); }
    catch (error) { notify(error.message); remove.disabled = false; }
  });
  window.addEventListener('dentrec:api-mutation', event => { if (/^(expenses|inventory)\./.test(event.detail?.action || '')) loadedAt = 0; });
  setDates();
}
