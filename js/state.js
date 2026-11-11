// File: state.js — state bersama dan helper antarmuka
export const state={patients:[],patient:null,record:null,records:[],teeth:{},focusTooth:'',readOnly:false,treatments:[],medicines:[]};
export const $=s=>document.querySelector(s);
export const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const formData=form=>Object.fromEntries(new FormData(form));
export const notify=msg=>alert(msg);
export function showView(name){document.querySelectorAll('main > section[id^="view-"]').forEach(view=>{const active=view.id===`view-${name}`;view.hidden=!active;view.classList.toggle('hidden',!active);});document.querySelectorAll('.nav-btn').forEach(b=>b.classList.toggle('nav-active',b.dataset.view===name));}
