export const state={patients:[],patient:null,record:null,records:[],teeth:{},focusTooth:'',readOnly:false,treatments:[],medicines:[]};
export const $=s=>document.querySelector(s);
export const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const formData=form=>Object.fromEntries(new FormData(form));
export const notify=msg=>alert(msg);
export function showView(name){['home','dashboard','medical','pending','catalog','report'].forEach(x=>{const view=$('#view-'+x);view.hidden=x!==name;view.classList.toggle('hidden',x!==name);});document.querySelectorAll('.nav-btn').forEach(b=>b.classList.toggle('nav-active',b.dataset.view===name));}
