// File: auth.js — login, ganti password wajib, dan administrasi user
import { api } from './api.js';

let currentUser = null;
let authEnabled = true;
let adminLoader = null;
const $ = (selector) => document.querySelector(selector);
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const MENUS = ['dashboard', 'medical', 'pending', 'catalog', 'report', 'admin'];
const MENU_LABELS = { dashboard: 'Pasien', medical: 'Rekam Medis', pending: 'Pending', catalog: 'Katalog', report: 'Report', admin: 'Admin' };const PASSWORD_ITERATIONS = 120000;
const encoder = new TextEncoder();
function base64Url(bytes) { let binary = ''; for (const byte of bytes) binary += String.fromCharCode(byte); return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, ''); }
function decodeBase64Url(value) { const normalized = value.replace(/-/g, '+').replace(/_/g, '/'); const binary = atob(normalized + '='.repeat((4 - normalized.length % 4) % 4)); return Uint8Array.from(binary, (char) => char.charCodeAt(0)); }
function newSalt() { const bytes = crypto.getRandomValues(new Uint8Array(24)); return base64Url(bytes); }
async function derivePasswordHash(password, salt) { const material = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']); const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: encoder.encode(salt), iterations: PASSWORD_ITERATIONS, hash: 'SHA-256' }, material, 256); return `pbkdf2-sha256$${PASSWORD_ITERATIONS}$${base64Url(new Uint8Array(bits))}`; }
async function challengeProof(hash, nonce) { const verifier = hash.split('$')[2]; const key = await crypto.subtle.importKey('raw', decodeBase64Url(verifier), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']); const proof = await crypto.subtle.sign('HMAC', key, encoder.encode(nonce)); return [...new Uint8Array(proof)].map((byte) => byte.toString(16).padStart(2, '0')).join(''); }

export function signedInUser() { return currentUser; }

export async function startAuthentication(onAuthenticated) {
  const overlay = $('#loginOverlay');
  const loginForm = $('#loginForm');
  const changeForm = $('#changePasswordForm');
  const message = $('#authMessage');
  let ready = false;
  const continueToApp = (user) => {
    currentUser = user;
    if (user.must_change_password) {
      loginForm.classList.add('hidden');
      changeForm.classList.remove('hidden');
      $('#authMessage').textContent = '';
      changeForm.elements.new_password.focus();
      return;
    }
    overlay.classList.add('hidden');
    $('#logoutButton').classList.remove('hidden');
    const greetings = ['Selamat malam', 'Selamat pagi', 'Selamat siang', 'Selamat sore'];
    const hour = Number(new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Jakarta', hour: '2-digit', hour12: false }).format(new Date()));
    const greeting = hour >= 4 && hour < 11 ? greetings[1] : hour >= 11 && hour < 15 ? greetings[2] : hour >= 15 && hour < 18 ? greetings[3] : greetings[0];
    const el = $('#userGreeting');
    el.innerHTML = `${greeting}, ${esc(user.nama)} <span class="rounded bg-yellow-200 px-1 font-semibold">${esc(user.jabatan)}</span>`;
    el.classList.remove('hidden');
    document.querySelectorAll('.nav-btn[data-permission]').forEach((button) => {
      const permission = button.dataset.permission;
      const allowed = permission === 'home' || (user.menu_permissions || []).includes(permission);
      button.classList.toggle('hidden', !allowed);
    });
    if (!ready) { ready = true; onAuthenticated(user); }
  };

  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault(); const button = loginForm.querySelector('button[type="submit"]') || loginForm.querySelector('button'); const oldLabel = button.textContent; button.disabled = true; button.textContent = 'Memeriksa…'; message.textContent = 'Memeriksa akun…';
    const form = new FormData(loginForm);
    try {
      const userId = form.get('user_id'), password = form.get('password');
      const challenge = await api('auth.challenge', { user_id: userId });
      let credentials = { user_id: userId };
      if (challenge.mode === 'proof') {
        const hash = await derivePasswordHash(password, challenge.salt);
        credentials.challenge_token = challenge.challenge_token;
        credentials.proof = await challengeProof(hash, challenge.nonce);
      } else credentials.password = password;
      const result = await api('auth.login', credentials);
      localStorage.setItem('dentrec_session_token', result.token);
      loginForm.reset();
      continueToApp(result.user);
    } catch (error) { message.textContent = error.message; } finally { button.disabled = false; button.textContent = oldLabel; }
  });

  changeForm.addEventListener('submit', async (event) => {
    event.preventDefault(); message.textContent = '';
    const password = changeForm.elements.new_password.value;
    if (password !== changeForm.elements.confirm_password.value) { message.textContent = 'Password baru dan konfirmasi tidak sama.'; return; }
    const button = changeForm.querySelector('button[type="submit"]') || changeForm.querySelector('button'); const oldLabel = button.textContent; button.disabled = true; button.textContent = 'Menyimpan…'; message.textContent = 'Menyimpan password baru…';
    try {
      const salt = newSalt();
      const passwordHash = await derivePasswordHash(password, salt);
      await api('auth.changePassword', { password_salt: salt, password_hash: passwordHash });
      changeForm.reset();
      const user = await api('auth.me');
      continueToApp(user);
    } catch (error) { message.textContent = error.message; } finally { button.disabled = false; button.textContent = oldLabel; }
  });

  $('#logoutButton').addEventListener('click', async () => {
    try { await api('auth.logout'); } catch (_) {}
    localStorage.removeItem('dentrec_session_token');
    window.location.reload();
  });

  let config;
  try { config = await api('auth.config'); } catch (error) { overlay.classList.remove('hidden'); message.textContent = 'Tidak dapat memeriksa mode aplikasi: ' + error.message; return; }
  authEnabled = Boolean(config.enabled);
  if (!authEnabled) { localStorage.removeItem('dentrec_session_token'); try { continueToApp(await api('auth.me')); } catch (error) { message.textContent = error.message; } return; }
  overlay.classList.remove('hidden');
  const token = localStorage.getItem('dentrec_session_token');
  if (token) {
    try { continueToApp(await api('auth.me')); }
    catch (_) { localStorage.removeItem('dentrec_session_token'); }
  }
}

export function initAdminUsers() {
  const form = $('#userForm');
  if (!form) return;
  const rows = $('#userRows');
  const message = $('#adminMessage');
  const load = async () => {
    message.textContent = 'Memuat daftar user…';
    try {
      const users = await api('users.list');
      rows.innerHTML = users.map((user) => `<tr class="border-b"><td class="p-2 font-medium">${esc(user.user_id)}</td><td class="p-2">${esc(user.nama)}<br><span class="text-xs text-slate-500">${esc(user.jabatan)}</span></td><td class="p-2">${esc((user.menu_permissions || []).map((key) => MENU_LABELS[key] || key).join(', ') || 'Tidak ada')}</td><td class="p-2">${user.aktif ? 'Aktif' : 'Nonaktif'}${user.must_change_password ? '<br><span class="text-xs text-amber-700">Wajib ganti password</span>' : ''}</td><td class="p-2 whitespace-nowrap"><button type="button" class="action-btn action-edit" data-user-edit="${esc(user.id)}">Edit</button> <button type="button" class="action-btn text-rose-700 bg-rose-50" data-user-delete="${esc(user.id)}">Hapus</button></td></tr>`).join('') || '<tr><td colspan="5" class="p-4 text-slate-500">Belum ada user.</td></tr>';
      rows.querySelectorAll('[data-user-edit]').forEach((button) => button.addEventListener('click', () => {
        const user = users.find((item) => item.id === button.dataset.userEdit); if (!user) return;
        form.reset(); form.elements.id.value = user.id; form.elements.user_id.value = user.user_id; form.elements.user_id.readOnly = true;
        form.elements.nama.value = user.nama; form.elements.jabatan.value = user.jabatan; form.elements.password.required = false; form.elements.aktif.checked = user.aktif;
        form.querySelectorAll('[name="menu_permissions"]').forEach((box) => { box.checked = (user.menu_permissions || []).includes(box.value); });
        message.textContent = 'Mode edit: User-ID tidak dapat diubah. Isi password hanya jika ingin meresetnya.'; form.scrollIntoView({ behavior: 'smooth' });
      }));
      rows.querySelectorAll('[data-user-delete]').forEach((button) => button.addEventListener('click', async () => {
        const user = users.find((item) => item.id === button.dataset.userDelete); if (!user || !window.confirm(`Hapus akun ${user.user_id}?`)) return;
        try { await api('users.delete', { id: user.id }); message.textContent = 'Akun dihapus.'; await load(); }
        catch (error) { message.textContent = error.message; }
      }));
      message.textContent = `${users.length} user.`;
    } catch (error) { message.textContent = error.message; }
  };
  adminLoader = load;
  form.addEventListener('reset', () => window.setTimeout(() => { form.elements.user_id.readOnly = false; form.elements.password.required = true; form.elements.aktif.checked = true; message.textContent = ''; }, 0));
  form.addEventListener('submit', async (event) => {
    event.preventDefault(); const data = new FormData(form);
    const permissions = [...form.querySelectorAll('[name="menu_permissions"]:checked')].map((box) => box.value).filter((value) => MENUS.includes(value));
    const editing = Boolean(form.elements.id.value);
    const button = form.querySelector('button[type="submit"]') || form.querySelector('button'); const oldLabel = button.textContent; button.disabled = true; button.textContent = 'Menyimpan…'; message.textContent = 'Menyimpan data user…';
    try {
      const rawPassword = String(data.get('password') || '');
      const passwordSalt = rawPassword && authEnabled ? newSalt() : '';
      const passwordHash = rawPassword && authEnabled ? await derivePasswordHash(rawPassword, passwordSalt) : '';
      const payload = { id: form.elements.id.value, user_id: data.get('user_id'), nama: data.get('nama'), jabatan: data.get('jabatan'), password: authEnabled ? '' : rawPassword, password_salt: passwordSalt, password_hash: passwordHash, menu_permissions: permissions, aktif: form.elements.aktif.checked };
      await api(editing ? 'users.update' : 'users.create', payload); message.textContent = editing ? 'User diperbarui.' : 'User dibuat; password sementara wajib diganti saat login pertama.'; form.reset(); await load();
    } catch (error) { message.textContent = error.message; } finally { button.disabled = false; button.textContent = oldLabel; }
  });
  load();
}
