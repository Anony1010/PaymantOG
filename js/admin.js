/**
 * GASHAM - Admin Panel Application
 * Admin paneli əsas məntiqi - CRUD, Dashboard, QR Scan
 */

// ============================================
// STATE
// ============================================

const adminState = {
  user: null,
  products: [],
  orders: [],
  scanner: null,
  isScanning: false,
  flashOn: false,
  cameraId: 'environment',
  selectedProducts: new Set(),
  editingProductId: null
};

// ============================================
// DOM REFERENCES
// ============================================

const $a = id => document.getElementById(id);
const domA = {
  loading: $a('loading-screen'),
  auth: $a('auth-screen'),
  dashboard: $a('dashboard-screen'),
  loginForm: $a('login-form'),
  loginEmail: $a('login-email'),
  loginPassword: $a('login-password'),
  loginError: $a('login-error'),
  loginBtn: $a('login-btn'),
  logoutBtn: $a('logout-btn'),
  adminEmail: $a('admin-email-display'),
  sidebar: $a('sidebar'),
  sidebarToggle: $a('sidebar-toggle'),
  sidebarClose: $a('sidebar-close'),
  themeToggle: $a('theme-toggle-admin'),
  navItems: document.querySelectorAll('.nav-item'),
  pages: document.querySelectorAll('.page'),
  // Stats
  statProducts: $a('stat-products'),
  statTotalOrders: $a('stat-total-orders'),
  statTodayOrders: $a('stat-today-orders'),
  statRevenue: $a('stat-revenue'),
  statTopProduct: $a('stat-top-product'),
  recentOrders: $a('recent-orders-list'),
  // Products
  productsTbody: $a('products-tbody'),
  productsEmpty: $a('products-empty'),
  productSearch: $a('product-search'),
  productCategoryFilter: $a('product-category-filter'),
  productSort: $a('product-sort'),
  selectAll: $a('select-all-products'),
  addProductBtn: $a('add-product-btn'),
  bulkDeleteBtn: $a('bulk-delete-btn'),
  exportExcel: $a('export-excel'),
  exportPdf: $a('export-pdf'),
  exportCsv: $a('export-csv'),
  importBtn: $a('import-btn'),
  // Product Form
  productForm: $a('product-form'),
  pfId: $a('product-id'),
  pfQrId: $a('pf-qr-id'),
  pfName: $a('pf-name'),
  pfPrice: $a('pf-price'),
  pfStock: $a('pf-stock'),
  pfCategory: $a('pf-category'),
  pfBarcode: $a('pf-barcode'),
  pfNote: $a('pf-note'),
  pfImage: $a('pf-image'),
  pfStatus: $a('pf-status'),
  pfSubmit: $a('pf-submit'),
  pfCancel: $a('pf-cancel'),
  pfDelete: $a('pf-delete'),
  // Scanner
  adminScannerVideo: $a('admin-scanner-video'),
  adminFlashToggle: $a('admin-flash-toggle'),
  adminCameraSwitch: $a('admin-camera-switch'),
  adminStartScanner: $a('admin-start-scanner'),
  // Orders
  ordersTbody: $a('orders-tbody'),
  // Import
  importModal: $a('import-modal'),
  importClose: $a('import-modal-close'),
  importFile: $a('import-file'),
  importExecute: $a('import-execute'),
  // Price History
  priceHistoryModal: $a('price-history-modal'),
  priceHistoryClose: $a('price-history-close'),
  priceHistoryBody: $a('price-history-body'),
  // Settings
  settingsLogout: $a('settings-logout'),
  // Toast
  toastContainer: $a('toast-container')
};

// ============================================
// UTILITY
// ============================================

function showAdminToast(msg, type = 'info') {
  const icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || 'ℹ'}</span>
    <span class="toast-message">${msg}</span>
    <button class="toast-close">&times;</button>`;
  toast.querySelector('.toast-close').onclick = () => {
    toast.classList.add('removing');
    setTimeout(() => toast.remove(), 300);
  };
  domA.toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('removing');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

function escHtml(t) {
  const d = document.createElement('div');
  d.textContent = t;
  return d.innerHTML;
}

function fmtPrice(p) { return `${parseFloat(p || 0).toFixed(2)} ₼`; }
function fmtDate(d) {
  const date = d?.toDate ? d.toDate() : new Date(d);
  return date.toLocaleDateString('az-AZ', { day: '2-digit', month: 'short', year: 'numeric' });
}
function fmtTime(d) {
  const date = d?.toDate ? d.toDate() : new Date(d);
  return date.toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit' });
}

// ============================================
// AUTH
// ============================================

auth.onAuthStateChanged(user => {
  if (user) {
    adminState.user = user;
    domA.adminEmail.textContent = user.email;
    showAdminPanel();
  } else {
    hideAdminPanel();
  }
  domA.loading.classList.add('fade-out');
  setTimeout(() => domA.loading.style.display = 'none', 600);
});

domA.loginForm.addEventListener('submit', async e => {
  e.preventDefault();
  domA.loginBtn.disabled = true;
  domA.loginBtn.textContent = 'Giriş edilir...';
  domA.loginError.classList.add('hidden');
  try {
    await auth.signInWithEmailAndPassword(
      domA.loginEmail.value,
      domA.loginPassword.value
    );
  } catch (err) {
    domA.loginError.textContent = err.message;
    domA.loginError.classList.remove('hidden');
    domA.loginBtn.disabled = false;
    domA.loginBtn.textContent = 'Giriş';
  }
});

domA.logoutBtn.addEventListener('click', async () => {
  await auth.signOut();
  showAdminToast('Çıxış edildi', 'info');
});
domA.settingsLogout.addEventListener('click', () => domA.logoutBtn.click());

function showAdminPanel() {
  domA.auth.classList.remove('active');
  domA.dashboard.classList.add('active');
  initAdminData();
}

function hideAdminPanel() {
  domA.dashboard.classList.remove('active');
  domA.auth.classList.add('active');
  domA.loginBtn.disabled = false;
  domA.loginBtn.textContent = 'Giriş';
}

// ============================================
// NAVIGATION
// ============================================

domA.navItems.forEach(item => {
  item.addEventListener('click', () => {
    domA.navItems.forEach(n => n.classList.remove('active'));
    item.classList.add('active');
    domA.pages.forEach(p => p.classList.remove('active'));
    const page = document.getElementById(`page-${item.dataset.page}`);
    if (page) page.classList.add('active');
    domA.sidebar.classList.remove('open');
  });
});

domA.sidebarToggle.addEventListener('click', () => domA.sidebar.classList.add('open'));
domA.sidebarClose.addEventListener('click', () => domA.sidebar.classList.remove('open'));

// ============================================
// THEME
// ============================================

domA.themeToggle.addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('gasham-theme', next);
});

// ============================================
// REALTIME DATA SUBSCRIPTIONS
// ============================================

function initAdminData() {
  // Products
  db.collection('products').onSnapshot(snapshot => {
    adminState.products = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    renderProducts();
    updateStats();
  }, err => showAdminToast('Məhsul yükləmə xətası', 'error'));

  // Orders
  db.collection('orders')
    .orderBy('createdAt', 'desc')
    .onSnapshot(snapshot => {
      adminState.orders = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      renderOrdersTable();
      updateStats();
    }, err => showAdminToast('Sifariş yükləmə xətası', 'error'));
}

// ============================================
// STATISTICS
// ============================================

function updateStats() {
  const products = adminState.products;
  const orders = adminState.orders;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  domA.statProducts.textContent = products.length;

  const totalOrders = orders.length;
  domA.statTotalOrders.textContent = totalOrders;

  const todayOrders = orders.filter(o => {
    const d = o.createdAt?.toDate ? o.createdAt.toDate() : new Date(o.createdAt);
    return d >= today;
  });
  domA.statTodayOrders.textContent = todayOrders.length;

  const revenue = orders.reduce((sum, o) => sum + parseFloat(o.total || 0), 0);
  domA.statRevenue.textContent = fmtPrice(revenue);

  // Top product
  const productSales = {};
  orders.forEach(o => (o.items || []).forEach(item => {
    productSales[item.name] = (productSales[item.name] || 0) + (item.qty || 0);
  }));
  const topProduct = Object.entries(productSales).sort((a, b) => b[1] - a[1])[0];
  domA.statTopProduct.textContent = topProduct ? `${topProduct[0]} (${topProduct[1]})` : '-';

  // Recent orders
  const recent = orders.slice(0, 5);
  domA.recentOrders.innerHTML = recent.length
    ? recent.map(o => `<div class="recent-item"><span>Sifariş #${o.orderNumber}</span><span>${fmtPrice(o.total)}</span></div>`).join('')
    : '<p class="muted">Heç bir sifariş yoxdur</p>';
}

// ============================================
// PRODUCTS CRUD
// ============================================

function renderProducts() {
  const tbody = domA.productsTbody;
  const empty = domA.productsEmpty;
  const filter = domA.productCategoryFilter.value;
  const search = domA.productSearch.value.toLowerCase();
  const sort = domA.productSort.value;

  let filtered = [...adminState.products];
  if (filter) filtered = filtered.filter(p => p.category === filter);
  if (search) filtered = filtered.filter(p =>
    (p.name || '').toLowerCase().includes(search) ||
    (p.qrId || p.id || '').toLowerCase().includes(search)
  );

  if (sort === 'price') filtered.sort((a, b) => parseFloat(a.price || 0) - parseFloat(b.price || 0));
  else if (sort === 'stock') filtered.sort((a, b) => parseInt(a.stock || 0) - parseInt(b.stock || 0));
  else filtered.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

  if (!filtered.length) {
    tbody.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  tbody.innerHTML = filtered.map(p => `
    <tr>
      <td><input type="checkbox" class="product-checkbox" value="${p.id}" ${adminState.selectedProducts.has(p.id) ? 'checked' : ''} /></td>
      <td>${p.image ? `<img src="${escHtml(p.image)}" alt="" />` : '—'}</td>
      <td><code>${escHtml(p.qrId || p.id)}</code></td>
      <td><strong>${escHtml(p.name)}</strong></td>
      <td>${fmtPrice(p.price)}</td>
      <td>${escHtml(p.category || '—')}</td>
      <td>${p.stock ?? '—'}</td>
      <td><span class="status-badge ${p.status || 'active'}">${p.status || 'active'}</span></td>
      <td>
        <button class="btn btn-sm btn-outline" onclick="editProduct('${p.id}')">Düzəlt</button>
        <button class="btn btn-sm btn-danger" onclick="deleteProduct('${p.id}')">Sil</button>
        <button class="btn btn-sm btn-outline" onclick="showPriceHistory('${p.id}')">Qiymət</button>
      </td>
    </tr>
  `).join('');

  // Update checkboxes
  document.querySelectorAll('.product-checkbox').forEach(cb => {
    cb.addEventListener('change', () => {
      if (cb.checked) adminState.selectedProducts.add(cb.value);
      else adminState.selectedProducts.delete(cb.value);
    });
  });
}

// Category filter update
function updateCategoryFilter() {
  const cats = [...new Set(adminState.products.map(p => p.category).filter(Boolean))];
  domA.productCategoryFilter.innerHTML = '<option value="">Bütün kateqoriyalar</option>' +
    cats.map(c => `<option value="${escHtml(c)}">${escHtml(c)}</option>`).join('');
}

// Product search & filter events
domA.productSearch.addEventListener('input', renderProducts);
domA.productCategoryFilter.addEventListener('change', renderProducts);
domA.productSort.addEventListener('change', renderProducts);

// Select all
domA.selectAll.addEventListener('change', () => {
  document.querySelectorAll('.product-checkbox').forEach(cb => {
    cb.checked = domA.selectAll.checked;
    if (domA.selectAll.checked) adminState.selectedProducts.add(cb.value);
    else adminState.selectedProducts.delete(cb.value);
  });
});

// Add new product
domA.addProductBtn.addEventListener('click', () => {
  resetProductForm();
  // Navigate to scanner page
  document.querySelector('[data-page="qr-scanner"]').click();
});

// Product form submit
domA.productForm.addEventListener('submit', async e => {
  e.preventDefault();
  const data = {
    qrId: domA.pfQrId.value.trim(),
    name: domA.pfName.value.trim(),
    price: parseFloat(domA.pfPrice.value) || 0,
    stock: parseInt(domA.pfStock.value) || 0,
    category: domA.pfCategory.value.trim(),
    barcode: domA.pfBarcode.value.trim(),
    note: domA.pfNote.value.trim(),
    image: domA.pfImage.value.trim(),
    status: domA.pfStatus.value,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  };

  if (!data.qrId || !data.name) {
    showAdminToast('QR ID və Ad doldurulmalıdır', 'error');
    return;
  }

  try {
    if (adminState.editingProductId) {
      // Update existing
      await db.collection('products').doc(adminState.editingProductId).update(data);
      // Price history check
      const oldDoc = await db.collection('products').doc(adminState.editingProductId).get();
      const oldPrice = oldDoc.data()?.price;
      if (oldPrice && parseFloat(oldPrice) !== data.price) {
        await db.collection('priceHistory').add({
          productId: adminState.editingProductId,
          productName: data.name,
          oldPrice: parseFloat(oldPrice),
          newPrice: data.price,
          changedBy: adminState.user?.email || 'unknown',
          changedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      }
      showAdminToast('Məhsul yeniləndi', 'success');
    } else {
      // Create new
      data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      await db.collection('products').doc(data.qrId).set(data);
      showAdminToast('Məhsul yaradıldı', 'success');
    }
    resetProductForm();
  } catch (err) {
    showAdminToast('Xəta: ' + err.message, 'error');
  }
});

function editProduct(id) {
  const p = adminState.products.find(x => x.id === id);
  if (!p) return;
  adminState.editingProductId = id;
  domA.pfQrId.value = p.qrId || p.id;
  domA.pfName.value = p.name || '';
  domA.pfPrice.value = p.price || '';
  domA.pfStock.value = p.stock || 0;
  domA.pfCategory.value = p.category || '';
  domA.pfBarcode.value = p.barcode || '';
  domA.pfNote.value = p.note || '';
  domA.pfImage.value = p.image || '';
  domA.pfStatus.value = p.status || 'active';
  domA.pfSubmit.textContent = 'Yenilə';
  domA.pfDelete.classList.remove('hidden');
  // Navigate
  document.querySelector('[data-page="qr-scanner"]').click();
}

function resetProductForm() {
  adminState.editingProductId = null;
  domA.productForm.reset();
  domA.pfSubmit.textContent = 'Yadda saxla';
  domA.pfDelete.classList.add('hidden');
}

domA.pfCancel.addEventListener('click', resetProductForm);

async function deleteProduct(id) {
  if (!confirm('Məhsulu silmək istədiyinizə əminsiniz?')) return;
  try {
    await db.collection('products').doc(id).delete();
    showAdminToast('Məhsul silindi', 'success');
    resetProductForm();
  } catch (err) {
    showAdminToast('Xəta: ' + err.message, 'error');
  }
}

domA.pfDelete.addEventListener('click', () => {
  if (adminState.editingProductId) deleteProduct(adminState.editingProductId);
});

// Bulk delete
domA.bulkDeleteBtn.addEventListener('click', async () => {
  if (!adminState.selectedProducts.size) {
    showAdminToast('Heç bir məhsul seçilməyib', 'warning');
    return;
  }
  if (!confirm(`${adminState.selectedProducts.size} məhsulu silmək istəyirsiniz?`)) return;
  const batch = db.batch();
  adminState.selectedProducts.forEach(id => batch.delete(db.collection('products').doc(id)));
  await batch.commit();
  adminState.selectedProducts.clear();
  showAdminToast('Məhsullar silindi', 'success');
});

// ============================================
// PRICE HISTORY
// ============================================

async function showPriceHistory(productId) {
  domA.priceHistoryBody.innerHTML = '<p class="muted">Yüklənir...</p>';
  domA.priceHistoryModal.classList.remove('hidden');
  try {
    const snapshot = await db.collection('priceHistory')
      .where('productId', '==', productId)
      .orderBy('changedAt', 'desc')
      .limit(50)
      .get();
    if (snapshot.empty) {
      domA.priceHistoryBody.innerHTML = '<p class="muted">Heç bir dəyişiklik yoxdur</p>';
      return;
    }
    domA.priceHistoryBody.innerHTML = snapshot.docs.map(d => {
      const h = d.data();
      return `<div class="recent-item">
        <span>${fmtPrice(h.oldPrice)} → ${fmtPrice(h.newPrice)}</span>
        <span style="font-size:12px;color:var(--text-muted)">${h.changedBy} • ${h.changedAt?.toDate ? fmtDate(h.changedAt.toDate()) : ''}</span>
      </div>`;
    }).join('');
  } catch (err) {
    domA.priceHistoryBody.innerHTML = '<p class="muted">Xəta baş verdi</p>';
  }
}

domA.priceHistoryClose.addEventListener('click', () => domA.priceHistoryModal.classList.add('hidden'));
domA.priceHistoryModal.querySelector('.modal-backdrop').addEventListener('click', () => domA.priceHistoryModal.classList.add('hidden'));

// ============================================
// EXPORT / IMPORT
// ============================================

// CSV Export
domA.exportCsv.addEventListener('click', () => {
  const headers = ['qrId', 'name', 'price', 'category', 'stock', 'barcode', 'status'];
  const rows = adminState.products.map(p => [
    p.qrId || p.id, p.name, p.price, p.category || '', p.stock || '', p.barcode || '', p.status || 'active'
  ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
  downloadCSV([headers.join(','), ...rows].join('\n'), 'products.csv');
});

// Excel export (CSV with xlsx extension)
domA.exportExcel.addEventListener('click', () => {
  const headers = ['QR ID', 'Ad', 'Qiymət', 'Kateqoriya', 'Stok', 'Barcode', 'Status'];
  const rows = adminState.products.map(p => [
    p.qrId || p.id, p.name, p.price, p.category || '', p.stock || '', p.barcode || '', p.status || 'active'
  ].join(','));
  downloadCSV('\uFEFF' + [headers.join(','), ...rows].join('\n'), 'products.xlsx');
});

// PDF export (simple printable format)
domA.exportPdf.addEventListener('click', () => {
  const win = window.open('', '_blank');
  const rows = adminState.products.map(p =>
    `<tr><td>${escHtml(p.qrId || p.id)}</td><td>${escHtml(p.name)}</td><td>${fmtPrice(p.price)}</td><td>${escHtml(p.category || '')}</td><td>${p.stock || 0}</td></tr>`
  ).join('');
  win.document.write(`
    <html><head><title>GASHAM - Məhsullar</title>
    <style>body{font-family:sans-serif;padding:20px}table{width:100%;border-collapse:collapse}
    td,th{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f5f5f7}
    h2{text-align:center;margin-bottom:20px}</style>
    </head><body>
    <h2>GASHAM - Məhsul Siyahısı</h2>
    <table><thead><tr><th>QR ID</th><th>Ad</th><th>Qiymət</th><th>Kateqoriya</th><th>Stok</th></tr></thead><tbody>${rows}</tbody></table>
    <p style="text-align:right;margin-top:16px;color:#666">${new Date().toLocaleDateString('az-AZ')}</p>
    </body></html>
  `);
  win.document.close();
});

function downloadCSV(content, filename) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

// Import
domA.importBtn.addEventListener('click', () => domA.importModal.classList.remove('hidden'));
domA.importClose.addEventListener('click', () => domA.importModal.classList.add('hidden'));
domA.importModal.querySelector('.modal-backdrop').addEventListener('click', () => domA.importModal.classList.add('hidden'));

domA.importExecute.addEventListener('click', async () => {
  const file = domA.importFile.files[0];
  if (!file) { showAdminToast('Fayl seçin', 'warning'); return; }
  const text = await file.text();
  const lines = text.split('\n').filter(l => l.trim());
  if (lines.length < 2) { showAdminToast('Fayl boşdur', 'error'); return; }
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  let imported = 0;
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
    const data = {};
    headers.forEach((h, idx) => { data[h] = values[idx] || ''; });
    if (data.qrId && data.name) {
      data.price = parseFloat(data.price) || 0;
      data.stock = parseInt(data.stock) || 0;
      data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      data.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
      await db.collection('products').doc(data.qrId).set(data);
      imported++;
    }
  }
  showAdminToast(`${imported} məhsul import edildi`, 'success');
  domA.importModal.classList.add('hidden');
});

// ============================================
// ORDERS TABLE
// ============================================

function renderOrdersTable() {
  const tbody = domA.ordersTbody;
  if (!adminState.orders.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="muted" style="text-align:center;padding:24px">Heç bir sifariş yoxdur</td></tr>';
    return;
  }
  tbody.innerHTML = adminState.orders.map(o => {
    const itemsCount = (o.items || []).reduce((s, i) => s + (i.qty || 0), 0);
    const date = o.createdAt?.toDate ? o.createdAt.toDate() : new Date(o.createdAt);
    return `<tr>
      <td><strong>#${o.orderNumber}</strong></td>
      <td>${fmtDate(date)}</td>
      <td>${fmtTime(date)}</td>
      <td>${itemsCount}</td>
      <td><strong>${fmtPrice(o.total)}</strong></td>
      <td><span class="status-badge ${o.status || 'active'}">${o.status || 'active'}</span></td>
      <td>
        <button class="btn btn-sm btn-outline" onclick="showAdminOrderDetail('${o.id}')">Detallar</button>
        ${o.status === 'active' ? `<button class="btn btn-sm btn-primary" onclick="adminFinishOrder('${o.id}')">Bitir</button>` : ''}
      </td>
    </tr>`;
  }).join('');
}

async function showAdminOrderDetail(orderId) {
  const o = adminState.orders.find(x => x.id === orderId);
  if (!o) return;
  const items = (o.items || []).map(i =>
    `<div class="recent-item"><span>${escHtml(i.name)} x${i.qty}</span><span>${fmtPrice(i.price * i.qty)}</span></div>`
  ).join('');
  showAdminToast(`Sifariş #${o.orderNumber}: ${items} Cəmi: ${fmtPrice(o.total)}`, 'info');
}

async function adminFinishOrder(orderId) {
  await db.collection('orders').doc(orderId).update({
    status: 'completed',
    completedAt: firebase.firestore.FieldValue.serverTimestamp(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  showAdminToast('Sifariş tamamlandı', 'success');
}

// Expose for inline onclick
window.showAdminOrderDetail = showAdminOrderDetail;
window.adminFinishOrder = adminFinishOrder;
window.editProduct = editProduct;
window.deleteProduct = deleteProduct;
window.showPriceHistory = showPriceHistory;

// ============================================
// ADMIN QR SCANNER
// ============================================

let adminScannerStream = null;
let adminScanLoop = false;

domA.adminStartScanner.addEventListener('click', async () => {
  if (adminScanLoop) {
    stopAdminScanner();
    return;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 640 } }
    });
    domA.adminScannerVideo.srcObject = stream;
    await domA.adminScannerVideo.play();
    adminScannerStream = stream;
    adminScanLoop = true;
    domA.adminStartScanner.textContent = 'Kameranı bağla';
    adminScanLoopFn();
  } catch (err) {
    showAdminToast('Kamera açılmadı: ' + err.message, 'error');
  }
});

function adminScanLoopFn() {
  if (!adminScanLoop) return;
  const canvas = document.createElement('canvas');
  const video = domA.adminScannerVideo;
  if (video.readyState >= 2) {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    try {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height);
      if (code) {
        const qrId = code.data.trim();
        domA.pfQrId.value = qrId;
        // Try to load existing product
        const existing = adminState.products.find(p => (p.qrId || p.id) === qrId);
        if (existing) {
          editProduct(existing.id);
          showAdminToast('Mövcud məhsul tapıldı', 'info');
        } else {
          resetProductForm();
          domA.pfQrId.value = qrId;
          // Auto focus name field
          domA.pfName.focus();
          showAdminToast('QR oxundu: ' + qrId, 'success');
        }
        // Vibrate on scan
        if (navigator.vibrate) navigator.vibrate(100);
        // Pause scanning briefly to avoid duplicate
        adminScanLoop = false;
        stopAdminScanner();
        domA.adminStartScanner.textContent = 'Kameranı aç';
        return;
      }
    } catch (e) { /* continue */ }
  }
  requestAnimationFrame(adminScanLoopFn);
}

function stopAdminScanner() {
  adminScanLoop = false;
  if (adminScannerStream) {
    adminScannerStream.getTracks().forEach(t => t.stop());
    adminScannerStream = null;
  }
  domA.adminScannerVideo.srcObject = null;
  domA.adminStartScanner.textContent = 'Kameranı aç';
}

domA.adminFlashToggle.addEventListener('click', () => {
  if (!adminScannerStream) return;
  const track = adminScannerStream.getVideoTracks()[0];
  if (!track) return;
  const caps = track.getCapabilities();
  if (!caps.torch) { showAdminToast('Flash dəstəklənmir', 'warning'); return; }
  adminState.flashOn = !adminState.flashOn;
  track.applyConstraints({ advanced: [{ torch: adminState.flashOn }] });
  domA.adminFlashToggle.style.color = adminState.flashOn ? '#ff0' : '';
});

domA.adminCameraSwitch.addEventListener('click', async () => {
  stopAdminScanner();
  adminState.cameraId = adminState.cameraId === 'environment' ? 'user' : 'environment';
  domA.adminStartScanner.textContent = 'Kameranı aç';
  domA.adminStartScanner.click();
});

// ============================================
// INIT
// ============================================

// Theme
const savedTheme = localStorage.getItem('gasham-theme') || 'light';
document.documentElement.setAttribute('data-theme', savedTheme);

// Expose functions globally for inline onclick
window.addProductToOrder = addProductToOrder;
// The app.js functions need to be exposed for this admin
// These will be used when admin calls user functions
