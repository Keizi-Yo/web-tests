let appData = null;
let activeCategory = "Semua";
let cart = JSON.parse(localStorage.getItem("roseCart") || "[]");

const $ = (s) => document.querySelector(s);
const rupiah = (n) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

async function loadData() {
  try {
    const res = await fetch("/api/data");
    appData = await res.json();
    applySettings();
    renderFilters();
    renderMenus();
    renderCart();
  } catch (err) {
    console.error("Gagal memuat data:", err);
  }
}

function applySettings() {
  if (!appData?.settings) return;
  const s = appData.settings;
  document.title = `${s.restaurantName || "Rose"} — Modern Dining`;
  
  const heroTitle = $("#heroTitle");
  if (heroTitle) heroTitle.innerHTML = s.heroTitle || "";
  
  const heroText = $("#heroText");
  if (heroText) heroText.textContent = s.heroText || "";
  
  const description = $("#description");
  if (description) description.textContent = s.description || "";
  
  const address = $("#address");
  if (address) address.textContent = s.address || "";
  
  const hours = $("#hours");
  if (hours) hours.textContent = s.hours || "";
  
  const footerTagline = $("#footerTagline");
  if (footerTagline) footerTagline.textContent = s.tagline || "";
  
  const instagram = $("#instagram");
  if (instagram) instagram.textContent = s.instagram || "";
  
  const mapLink = $("#mapLink");
  if (mapLink && s.address) {
    mapLink.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.address)}`;
  }
}

function renderFilters() {
  const filterContainer = $("#filters");
  if (!filterContainer || !appData?.categories) return;

  filterContainer.innerHTML = appData.categories.map(c =>
    `<button class="filter ${c === activeCategory ? "active" : ""}" onclick="setCategory('${escapeAttr(c)}')">${escapeHtml(c)}</button>`
  ).join("");
}

window.setCategory = (cat) => { 
  activeCategory = cat; 
  renderFilters(); 
  renderMenus(); 
};

function renderMenus() {
  const menuGrid = $("#menuGrid");
  if (!menuGrid || !appData?.menus) return;

  const list = appData.menus.filter(m => m.available && (activeCategory === "Semua" || m.category === activeCategory));
  
  menuGrid.innerHTML = list.length 
    ? list.map(m => `
        <article class="menu-card">
          <div class="menu-image" style="background-image:url('${safeUrl(m.image)}')">
            ${m.badge ? `<span class="badge">${escapeHtml(m.badge)}</span>` : ""}
          </div>
          <div class="menu-info">
            <div class="menu-top">
              <h3>${escapeHtml(m.name)}</h3>
              <span class="price">${rupiah(m.price)}</span>
            </div>
            <p>${escapeHtml(m.description)}</p>
            <button class="add-btn" onclick="addToCart(${m.id})">+ Add to order</button>
          </div>
        </article>`).join("") 
    : `<div class="empty">Belum ada menu di kategori ini.</div>`;
}

window.addToCart = (id) => {
  const menu = appData?.menus?.find(m => m.id === id);
  if (!menu) return;
  const item = cart.find(i => i.id === id);
  item ? item.qty++ : cart.push({ id, qty: 1 });
  saveCart(); 
  renderCart();
};

function saveCart() { 
  localStorage.setItem("roseCart", JSON.stringify(cart)); 
}

function renderCart() {
  const items = cart.map(i => ({ ...i, menu: appData?.menus?.find(m => m.id === i.id) })).filter(i => i.menu);
  const count = items.reduce((a, i) => a + i.qty, 0);
  const total = items.reduce((a, i) => a + i.menu.price * i.qty, 0);

  const cartCount = $("#cartCount");
  if (cartCount) cartCount.textContent = count;

  const cartTotal = $("#cartTotal");
  if (cartTotal) cartTotal.textContent = rupiah(total);

  const cartItems = $("#cartItems");
  if (cartItems) {
    cartItems.innerHTML = items.length ? items.map(i => `
      <div class="cart-item">
        <div class="cart-thumb" style="background-image:url('${safeUrl(i.menu.image)}')"></div>
        <div>
          <h4>${escapeHtml(i.menu.name)}</h4>
          <p>${rupiah(i.menu.price)}</p>
          <div class="qty">
            <button onclick="changeQty(${i.id}, -1)">−</button>
            <span>${i.qty}</span>
            <button onclick="changeQty(${i.id}, 1)">+</button>
          </div>
        </div>
        <div class="cart-price">${rupiah(i.menu.price * i.qty)}</div>
      </div>`).join("") : `<div class="empty"><h4>Keranjang masih kosong.</h4><p>Pilih menu favoritmu dulu.</p></div>`;
  }
}

window.changeQty = (id, delta) => {
  const item = cart.find(i => i.id === id); 
  if (!item) return;
  item.qty += delta; 
  if (item.qty <= 0) cart = cart.filter(i => i.id !== id);
  saveCart(); 
  renderCart();
};

function openCart() { 
  $("#cartDrawer")?.classList.add("open"); 
  $("#overlay")?.classList.add("show"); 
  document.body.classList.add("locked"); 
}

function closeCart() { 
  $("#cartDrawer")?.classList.remove("open"); 
  $("#overlay")?.classList.remove("show"); 
  document.body.classList.remove("locked"); 
}

const cartBtn = $("#cartButton");
if (cartBtn) cartBtn.onclick = openCart;

const closeBtn = $("#closeCart");
if (closeBtn) closeBtn.onclick = closeCart;

const overlayBtn = $("#overlay");
if (overlayBtn) overlayBtn.onclick = closeCart;

const checkoutBtn = $("#checkoutBtn");
if (checkoutBtn) {
  checkoutBtn.onclick = () => {
    if (!cart.length) return alert("Tambahkan menu terlebih dahulu.");
    const name = $("#customerName")?.value.trim() || "Pelanggan";
    const note = $("#orderNote")?.value.trim() || "-";
    const lines = cart.map(i => {
      const m = appData.menus.find(x => x.id === i.id);
      return `• ${m.name} x${i.qty} — ${rupiah(m.price * i.qty)}`;
    });
    const total = cart.reduce((a, i) => a + (appData.menus.find(m => m.id === i.id)?.price || 0) * i.qty, 0);
    const msg = `Halo Rose Restaurant!%0A%0ASaya ingin order:%0A${lines.join("%0A")}%0A%0ATotal: ${rupiah(total)}%0ANama: ${encodeURIComponent(name)}%0ACatatan: ${encodeURIComponent(note)}%0A%0AMohon konfirmasi pesanan saya.`;
    window.open(`https://wa.me/${appData.settings.whatsapp}?text=${msg}`, "_blank");
  };
}

function escapeHtml(v) { return String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c])); }
function escapeAttr(v) { return String(v ?? "").replace(/\\/g, "\\\\").replace(/'/g, "\\'"); }
function safeUrl(v) { return escapeHtml(v).replace(/"/g, "%22"); }

window.addEventListener("scroll", () => $("#navbar")?.classList.toggle("scrolled", window.scrollY > 15));

const observer = new IntersectionObserver(entries => entries.forEach(e => e.isIntersecting && e.target.classList.add("visible")), { threshold: .12 });
document.querySelectorAll(".reveal").forEach(el => observer.observe(el));

loadData();