let data=null, password=sessionStorage.getItem("roseAdminPassword")||"";
const $=s=>document.querySelector(s);

async function api(url, options={}){
  options.headers={...(options.headers||{}),"Content-Type":"application/json","x-admin-password":password};
  const res=await fetch(url,options);
  if(!res.ok){const e=await res.json().catch(()=>({message:"Terjadi kesalahan"}));throw new Error(e.message)}
  return res.json();
}

async function start(){
  try{
    data=await fetch("/api/data").then(r=>r.json());
    if(password){
      const check=await fetch("/api/data"); if(check.ok) showAdmin(); else showLogin();
    }else showLogin();
  }catch(e){showLogin()}
}
function showLogin(){$("#loginView").classList.remove("hidden");$("#adminApp").classList.add("hidden")}
function showAdmin(){$("#loginView").classList.add("hidden");$("#adminApp").classList.remove("hidden");renderAll()}

$("#loginBtn").onclick=async()=>{
  const p=$("#loginPassword").value;
  try{await api("/api/login",{method:"POST",body:JSON.stringify({password:p})});password=p;sessionStorage.setItem("roseAdminPassword",p);data=await fetch("/api/data").then(r=>r.json());showAdmin()}
  catch(e){$("#loginError").textContent=e.message}
};
$("#loginPassword").addEventListener("keydown",e=>e.key==="Enter"&&$("#loginBtn").click());
$("#logoutBtn").onclick=()=>{sessionStorage.removeItem("roseAdminPassword");password="";showLogin()};

document.querySelectorAll(".side-btn").forEach(btn=>btn.onclick=()=>{
  document.querySelectorAll(".side-btn").forEach(b=>b.classList.remove("active"));btn.classList.add("active");
  const section=btn.dataset.section;
  document.querySelectorAll(".section-panel").forEach(s=>s.classList.add("hidden"));
  $(`#${section}Section`).classList.remove("hidden");
  $("#pageTitle").textContent=section==="dashboard"?"Dashboard":section==="menus"?"Menu":"Pengaturan";
});

function renderAll(){
  $("#statMenus").textContent=data.menus.length;
  $("#statActive").textContent=data.menus.filter(m=>m.available).length;
  $("#statCategories").textContent=data.categories.filter(c=>c!=="Semua").length;
  $("#menuTable").innerHTML=data.menus.map(m=>`
    <tr><td><div class="menu-name">${esc(m.name)}</div><div class="menu-sub">${esc(m.description).slice(0,55)}</div></td>
    <td>${esc(m.category)}</td><td>Rp${Number(m.price).toLocaleString("id-ID")}</td>
    <td><span class="status-pill ${m.available?"on":"off"}">${m.available?"Aktif":"Nonaktif"}</span></td>
    <td><div class="actions"><button onclick="editMenu(${m.id})">Edit</button><button class="delete" onclick="deleteMenu(${m.id})">Hapus</button></div></td></tr>`).join("");
  const s=data.settings;
  Object.entries(s).forEach(([key,val])=>{const el=document.querySelector(`[name="${key}"]`);if(el)el.value=val});
}

$("#addMenuBtn").onclick=()=>openModal();
$("#closeModal").onclick=closeModal;
$("#menuModal").addEventListener("click",e=>e.target===$("#menuModal")&&closeModal());

function openModal(menu=null){
  $("#menuModal").classList.remove("hidden");
  $("#modalTitle").textContent=menu?"Edit Menu":"Tambah Menu";
  const f=$("#menuForm");f.reset();
  f.id.value=menu?.id||"";f.name.value=menu?.name||"";f.category.value=menu?.category||"Main Course";
  f.price.value=menu?.price||"";f.description.value=menu?.description||"";f.image.value=menu?.image||"";
  f.badge.value=menu?.badge||"";f.available.checked=menu?menu.available:true;
}
function closeModal(){$("#menuModal").classList.add("hidden")}
window.editMenu=id=>openModal(data.menus.find(m=>m.id===id));
window.deleteMenu=async id=>{
  const menu=data.menus.find(m=>m.id===id);
  if(!menu||!confirm(`Hapus "${menu.name}"?`))return;
  try{await api(`/api/menus/${id}`,{method:"DELETE"});data=await fetch("/api/data").then(r=>r.json());renderAll()}
  catch(e){alert(e.message)}
};
$("#menuForm").onsubmit=async e=>{
  e.preventDefault();const f=e.target;
  const body={name:f.name.value,category:f.category.value,price:Number(f.price.value),description:f.description.value,image:f.image.value,badge:f.badge.value,available:f.available.checked};
  try{
    await api(f.id.value?`/api/menus/${f.id.value}`:"/api/menus",{method:f.id.value?"PUT":"POST",body:JSON.stringify(body)});
    data=await fetch("/api/data").then(r=>r.json());closeModal();renderAll();
  }catch(err){alert(err.message)}
};

$("#settingsForm").onsubmit=async e=>{
  e.preventDefault();const body=Object.fromEntries(new FormData(e.target).entries());
  try{await api("/api/settings",{method:"PUT",body:JSON.stringify(body)});data=await fetch("/api/data").then(r=>r.json());$("#saveSettingsMsg").textContent="Tersimpan ✓";setTimeout(()=>$("#saveSettingsMsg").textContent="",2500)}
  catch(err){alert(err.message)}
};
function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
start();
