/**
 * GASHAM - Admin Panel Application v2
 * Code-based giriş, tam sifariş idarəetməsi
 */

// ============================================
// STATE
// ============================================

const ADMIN_CODE = 'gasham66';
const SESSION_KEY = 'gasham_admin_session';

const adminState = {
  isLoggedIn: false,
  products: [],
  orders: [],
  scanner: null,
  scannerRunning: false,
  flashOn: false,
  cameraId: 'environment',
  selectedProducts: new Set(),
  editingProductId: null,
  editingOrderId: null,
  editingOrderItems: []
};

// ============================================
// DOM REFS
// ============================================

const $a = id => document.getElementById(id);
const domA = {
  loading: $a('loading-screen'),
  auth: $a('auth-screen'),
  dashboard: $a('dashboard-screen'),
  loginForm: $a('admin-login-form'),
  loginCode: $a('admin-code'),
  loginBtn: $a('login-btn'),
  loginError: $a('login-error'),
  logoutBtn: $a('logout-btn'),
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
  adminScannerElement: $a('admin-scanner-element'),
  adminFlashToggle: $a('admin-flash-toggle'),
  adminCameraSwitch: $a('admin-camera-switch'),
  adminStartScanner: $a('admin-start-scanner'),
  // Orders
  ordersTbody: $a('orders-tbody'),
  orderSearch: $a('order-search'),
  orderDateFilter: $a('order-date-filter'),
  orderStatusFilter: $a('order-status-filter'),
  ordersExportPdf: $a('orders-export-pdf'),
  ordersExportExcel: $a('orders-export-excel'),
  ordersExportCsv: $a('orders-export-csv'),
  ordersPrint: $a('orders-print'),
  // Order Detail
  orderDetailModal: $a('order-detail-modal'),
  orderDetailTitle: $a('order-detail-title'),
  orderDetailBody: $a('order-detail-body'),
  orderDetailFooter: $a('order-detail-footer'),
  orderDetailClose: $a('order-detail-close'),
  orderSaveChanges: $a('order-save-changes'),
  orderDeleteFull: $a('order-delete-full'),
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

function checkAuth() {
  return localStorage.getItem(SESSION_KEY) === 'true';
}

// ============================================
// AUTH (Code-based)
// ============================================

function showAdminPanel() {
  domA.auth.classList.remove('active');
  domA.auth.style.display = 'none';
  domA.dashboard.classList.add('active');
  domA.dashboard.style.display = 'flex';
}

function hideAdminPanel() {
  domA.dashboard.classList.remove('active');
  domA.dashboard.style.display = 'none';
  domA.auth.classList.add('active');
  domA.auth.style.display = 'flex';
}

domA.loginForm.addEventListener('submit', e => {
  e.preventDefault();
  const code = domA.loginCode.value.trim();
  if (code === ADMIN_CODE) {
    localStorage.setItem(SESSION_KEY, 'true');
    adminState.isLoggedIn = true;
    showAdminPanel();
    initAdminData();
    showAdminToast('Giriş uğurlu', 'success');
  } else {
    domA.loginError.textContent = 'Yanlış kod!';
    domA.loginError.classList.remove('hidden');
    domA.loginCode.value = '';
    domA.loginCode.focus();
  }
});

domA.logoutBtn.addEventListener('click', () => {
  localStorage.removeItem(SESSION_KEY);
  adminState.isLoggedIn = false;
  hideAdminPanel();
  domA.auth.style.display = 'flex';
  domA.loginCode.value = '';
  domA.loginError.classList.add('hidden');
});
domA.settingsLogout.addEventListener('click', () => domA.logoutBtn.click());

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
// REALTIME DATA
// ============================================

function initAdminData() {
  db.collection('products').onSnapshot(snapshot => {
    adminState.products = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    renderProducts();
    updateCategoryFilter();
    updateStats();
  }, err => showAdminToast('Məhsul yükləmə xətası', 'error'));

  db.collection('orders').orderBy('createdAt', 'desc').onSnapshot(snapshot => {
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
  domA.statTotalOrders.textContent = orders.length;

  const todayOrders = orders.filter(o => {
    const d = o.createdAt?.toDate ? o.createdAt.toDate() : new Date(o.createdAt);
    return d >= today;
  });
  domA.statTodayOrders.textContent = todayOrders.length;

  const revenue = orders.reduce((sum, o) => sum + parseFloat(o.total || 0), 0);
  domA.statRevenue.textContent = fmtPrice(revenue);

  const productSales = {};
  orders.forEach(o => (o.items || []).forEach(item => {
    productSales[item.name] = (productSales[item.name] || 0) + (item.qty || 0);
  }));
  const top = Object.entries(productSales).sort((a, b) => b[1] - a[1])[0];
  domA.statTopProduct.textContent = top ? `${top[0]} (${top[1]})` : '-';

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

  document.querySelectorAll('.product-checkbox').forEach(cb => {
    cb.addEventListener('change', () => {
      if (cb.checked) adminState.selectedProducts.add(cb.value);
      else adminState.selectedProducts.delete(cb.value);
    });
  });
}

function updateCategoryFilter() {
  const cats = [...new Set(adminState.products.map(p => p.category).filter(Boolean))];
  domA.productCategoryFilter.innerHTML = '<option value="">Bütün kateqoriyalar</option>' +
    cats.map(c => `<option value="${escHtml(c)}">${escHtml(c)}</option>`).join('');
}

domA.productSearch.addEventListener('input', renderProducts);
domA.productCategoryFilter.addEventListener('change', renderProducts);
domA.productSort.addEventListener('change', renderProducts);

domA.selectAll.addEventListener('change', () => {
  document.querySelectorAll('.product-checkbox').forEach(cb => {
    cb.checked = domA.selectAll.checked;
    if (domA.selectAll.checked) adminState.selectedProducts.add(cb.value);
    else adminState.selectedProducts.delete(cb.value);
  });
});

domA.addProductBtn.addEventListener('click', () => {
  resetProductForm();
  document.querySelector('[data-page="qr-scanner"]').click();
});

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
    showAdminToast('QR ID və Ad doldurulmalıdır', 'error'); return;
  }
  try {
    if (adminState.editingProductId) {
      await db.collection('products').doc(adminState.editingProductId).update(data);
      const oldDoc = await db.collection('products').doc(adminState.editingProductId).get();
      const oldPrice = oldDoc.data()?.price;
      if (oldPrice && parseFloat(oldPrice) !== data.price) {
        await db.collection('priceHistory').add({
          productId: adminState.editingProductId,
          productName: data.name,
          oldPrice: parseFloat(oldPrice),
          newPrice: data.price,
          changedBy: 'admin',
          changedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      }
      showAdminToast('Məhsul yeniləndi', 'success');
    } else {
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

domA.bulkDeleteBtn.addEventListener('click', async () => {
  if (!adminState.selectedProducts.size) {
    showAdminToast('Heç bir məhsul seçilməyib', 'warning'); return;
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
      .orderBy('changedAt', 'desc').limit(50).get();
    if (snapshot.empty) {
      domA.priceHistoryBody.innerHTML = '<p class="muted">Heç bir dəyişiklik yoxdur</p>'; return;
    }
    domA.priceHistoryBody.innerHTML = snapshot.docs.map(d => {
      const h = d.data();
      return `<div class="recent-item">
        <span>${fmtPrice(h.oldPrice)} → ${fmtPrice(h.newPrice)}</span>
        <span style="font-size:12px;color:var(--text-muted)">${h.changedBy || 'admin'} • ${h.changedAt?.toDate ? fmtDate(h.changedAt.toDate()) : ''}</span>
      </div>`;
    }).join('');
  } catch (err) {
    domA.priceHistoryBody.innerHTML = '<p class="muted">Xəta baş verdi</p>';
  }
}

domA.priceHistoryClose.addEventListener('click', () => domA.priceHistoryModal.classList.add('hidden'));
domA.priceHistoryModal.querySelector('.modal-backdrop')?.addEventListener('click', () => domA.priceHistoryModal.classList.add('hidden'));

// ============================================
// EXPORT / IMPORT PRODUCTS
// ============================================

domA.exportCsv.addEventListener('click', () => {
  const headers = ['qrId', 'name', 'price', 'category', 'stock', 'barcode', 'status'];
  const rows = adminState.products.map(p => [
    p.qrId || p.id, p.name, p.price, p.category || '', p.stock || '', p.barcode || '', p.status || 'active'
  ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
  downloadCSV([headers.join(','), ...rows].join('\n'), 'products.csv');
});

domA.exportExcel.addEventListener('click', () => {
  const headers = ['QR ID', 'Ad', 'Qiymət', 'Kateqoriya', 'Stok', 'Barcode', 'Status'];
  const rows = adminState.products.map(p => [
    p.qrId || p.id, p.name, p.price, p.category || '', p.stock || '', p.barcode || '', p.status || 'active'
  ].join(','));
  downloadCSV('\uFEFF' + [headers.join(','), ...rows].join('\n'), 'products.xlsx');
});

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
    </body></html>`);
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

domA.importBtn.addEventListener('click', () => domA.importModal.classList.remove('hidden'));
domA.importClose.addEventListener('click', () => domA.importModal.classList.add('hidden'));
domA.importModal.querySelector('.modal-backdrop')?.addEventListener('click', () => domA.importModal.classList.add('hidden'));

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
      await db.collection('products').doc(data.qrId).set(data, { merge: true });
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
  const search = domA.orderSearch?.value?.toLowerCase() || '';
  const dateFilter = domA.orderDateFilter?.value || '';
  const statusFilter = domA.orderStatusFilter?.value || '';

  let filtered = [...adminState.orders];

  if (search) filtered = filtered.filter(o => String(o.orderNumber).includes(search));
  if (statusFilter) filtered = filtered.filter(o => o.status === statusFilter);
  if (dateFilter) {
    filtered = filtered.filter(o => {
      const d = o.createdAt?.toDate ? o.createdAt.toDate() : new Date(o.createdAt);
      return d.toISOString().split('T')[0] === dateFilter;
    });
  }

  if (!filtered.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:24px;color:var(--text-muted)">Heç bir sifariş yoxdur</td></tr>';
    return;
  }

  tbody.innerHTML = filtered.map(o => {
    const itemsCount = (o.items || []).reduce((s, i) => s + (i.qty || 0), 0);
    const date = o.createdAt?.toDate ? o.createdAt.toDate() : new Date(o.createdAt);
    const statusClass = o.status === 'Təsdiqlənib' || o.status === 'completed' ? 'completed' : 'active';
    return `<tr>
      <td><strong>#${o.orderNumber}</strong></td>
      <td>${fmtDate(date)}</td>
      <td>${fmtTime(date)}</td>
      <td>${itemsCount}</td>
      <td><strong>${fmtPrice(o.total)}</strong></td>
      <td><span class="status-badge ${statusClass}">${o.status || 'active'}</span></td>
      <td>
        <button class="btn btn-sm btn-outline" onclick="openOrderDetail('${o.id}')">Aç</button>
        <button class="btn btn-sm btn-outline" onclick="quickPrintOrder('${o.id}')">Çap</button>
        <button class="btn btn-sm btn-danger" onclick="deleteOrder('${o.id}')">Sil</button>
      </td>
    </tr>`;
  }).join('');
}

domA.orderSearch?.addEventListener('input', renderOrdersTable);
domA.orderDateFilter?.addEventListener('change', renderOrdersTable);
domA.orderStatusFilter?.addEventListener('change', renderOrdersTable);

// ============================================
// ORDER DETAIL (Full Edit)
// ============================================

async function openOrderDetail(orderId) {
  const order = adminState.orders.find(o => o.id === orderId);
  if (!order) return;

  adminState.editingOrderId = orderId;
  adminState.editingOrderItems = JSON.parse(JSON.stringify(order.items || []));

  domA.orderDetailTitle.textContent = `Sifariş #${order.orderNumber}`;
  renderOrderDetailItems();
  domA.orderDetailFooter.classList.remove('hidden');
  domA.orderDetailModal.classList.remove('hidden');
}

function renderOrderDetailItems() {
  const body = domA.orderDetailBody;
  const items = adminState.editingOrderItems;

  if (!items.length) {
    body.innerHTML = '<p class="muted">Sifariş boşdur</p>';
    return;
  }

  const date = (() => {
    const order = adminState.orders.find(o => o.id === adminState.editingOrderId);
    if (!order) return '';
    const d = order.createdAt?.toDate ? order.createdAt.toDate() : new Date(order.createdAt);
    return `<div class="review-meta"><div>Tarix: ${fmtDate(d)} ${fmtTime(d)}</div><div>Status: ${order.status || 'active'}</div></div>`;
  })();

  body.innerHTML = date + items.map((item, idx) => `
    <div class="order-edit-item">
      <span class="item-name">${escHtml(item.name)}</span>
      <span style="font-size:13px;color:var(--text-muted)">${fmtPrice(item.price)}</span>
      <button class="btn-qty" onclick="editItemQty(${idx}, -1)">−</button>
      <input type="number" value="${item.qty}" min="0" onchange="editItemQtySet(${idx}, this.value)" />
      <button class="btn-qty" onclick="editItemQty(${idx}, 1)">+</button>
      <input type="number" value="${item.price}" step="0.01" class="item-price-input" onchange="editItemPrice(${idx}, this.value)" />
      <span style="font-weight:700;color:var(--accent);min-width:70px;text-align:right">${fmtPrice(item.price * item.qty)}</span>
      <button class="btn btn-sm btn-danger" onclick="editRemoveItem(${idx})" style="font-size:16px;padding:2px 8px">&times;</button>
    </div>
  `).join('') + `
    <div style="margin-top:12px;text-align:right;font-size:18px;font-weight:800;color:var(--accent)">
      Cəmi: ${fmtPrice(items.reduce((s, i) => s + i.price * i.qty, 0))}
    </div>
  `;
}

function editItemQty(idx, delta) {
  if (!adminState.editingOrderItems[idx]) return;
  adminState.editingOrderItems[idx].qty = Math.max(0, (adminState.editingOrderItems[idx].qty || 1) + delta);
  if (adminState.editingOrderItems[idx].qty === 0) {
    adminState.editingOrderItems.splice(idx, 1);
  }
  renderOrderDetailItems();
}

function editItemQtySet(idx, val) {
  if (!adminState.editingOrderItems[idx]) return;
  adminState.editingOrderItems[idx].qty = Math.max(0, parseInt(val) || 0);
  if (adminState.editingOrderItems[idx].qty === 0) {
    adminState.editingOrderItems.splice(idx, 1);
  }
  renderOrderDetailItems();
}

function editItemPrice(idx, val) {
  if (!adminState.editingOrderItems[idx]) return;
  adminState.editingOrderItems[idx].price = parseFloat(val) || 0;
  renderOrderDetailItems();
}

function editRemoveItem(idx) {
  adminState.editingOrderItems.splice(idx, 1);
  renderOrderDetailItems();
}

// Save order changes
domA.orderSaveChanges.addEventListener('click', async () => {
  if (!adminState.editingOrderId) return;
  const total = adminState.editingOrderItems.reduce((s, i) => s + i.price * i.qty, 0);
  try {
    await db.collection('orders').doc(adminState.editingOrderId).update({
      items: adminState.editingOrderItems,
      total: total,
      itemCount: adminState.editingOrderItems.reduce((s, i) => s + i.qty, 0),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    showAdminToast('Sifariş yeniləndi', 'success');
    domA.orderDetailModal.classList.add('hidden');
  } catch (err) {
    showAdminToast('Xəta: ' + err.message, 'error');
  }
});

// Delete full order
domA.orderDeleteFull.addEventListener('click', async () => {
  if (!adminState.editingOrderId) return;
  if (!confirm('Sifarişi tamamilə silmək istəyirsiniz?')) return;
  try {
    await db.collection('orders').doc(adminState.editingOrderId).delete();
    showAdminToast('Sifariş silindi', 'success');
    domA.orderDetailModal.classList.add('hidden');
  } catch (err) {
    showAdminToast('Xəta: ' + err.message, 'error');
  }
});

domA.orderDetailClose.addEventListener('click', () => {
  domA.orderDetailModal.classList.add('hidden');
});
domA.orderDetailModal.querySelector('.modal-backdrop')?.addEventListener('click', () => {
  domA.orderDetailModal.classList.add('hidden');
});

// ============================================
// QUICK ORDER ACTIONS
// ============================================

async function deleteOrder(orderId) {
  if (!confirm('Sifarişi silmək istədiyinizə əminsiniz?')) return;
  try {
    await db.collection('orders').doc(orderId).delete();
    showAdminToast('Sifariş silindi', 'success');
  } catch (err) {
    showAdminToast('Xəta: ' + err.message, 'error');
  }
}

function quickPrintOrder(orderId) {
  const order = adminState.orders.find(o => o.id === orderId);
  if (!order) return;
  const win = window.open('', '_blank');
  const items = (order.items || []).map(i =>
    `<tr><td>${escHtml(i.name)}</td><td>${i.qty}</td><td>${fmtPrice(i.price)}</td><td>${fmtPrice(i.price * i.qty)}</td></tr>`
  ).join('');
  const date = order.createdAt?.toDate ? order.createdAt.toDate() : new Date(order.createdAt);
  win.document.write(`
    <html><head><title>Sifariş #${order.orderNumber}</title>
    <style>body{font-family:sans-serif;padding:20px}table{width:100%;border-collapse:collapse}
    td,th{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f5f5f5}
    h2{text-align:center}</style></head><body>
    <h2>GASHAM - Sifariş #${order.orderNumber}</h2>
    <p>Tarix: ${fmtDate(date)} ${fmtTime(date)} | Status: ${order.status}</p>
    <table><thead><tr><th>Məhsul</th><th>Say</th><th>Qiymət</th><th>Cəm</th></tr></thead><tbody>${items}</tbody></table>
    <h3 style="text-align:right">Cəmi: ${fmtPrice(order.total || 0)}</h3></body></html>`);
  win.document.close();
}

// ============================================
// ORDERS EXPORT
// ============================================

domA.ordersExportCsv?.addEventListener('click', () => {
  const headers = ['Sifariş #', 'Tarix', 'Saat', 'Məhsul Sayı', 'Cəmi', 'Status'];
  const rows = adminState.orders.map(o => {
    const d = o.createdAt?.toDate ? o.createdAt.toDate() : new Date(o.createdAt);
    return [o.orderNumber, fmtDate(d), fmtTime(d),
      (o.items || []).reduce((s, i) => s + i.qty, 0),
      (o.total || 0).toFixed(2), o.status || 'active'
    ].join(',');
  });
  downloadCSV('\uFEFF' + [headers.join(','), ...rows].join('\n'), 'orders.csv');
});

domA.ordersExportExcel?.addEventListener('click', () => {
  const headers = ['Sifariş #', 'Tarix', 'Saat', 'Məhsul Sayı', 'Cəmi', 'Status'];
  const rows = adminState.orders.map(o => {
    const d = o.createdAt?.toDate ? o.createdAt.toDate() : new Date(o.createdAt);
    return [o.orderNumber, fmtDate(d), fmtTime(d),
      (o.items || []).reduce((s, i) => s + i.qty, 0),
      (o.total || 0).toFixed(2), o.status || 'active'
    ].join(',');
  });
  downloadCSV('\uFEFF' + [headers.join(','), ...rows].join('\n'), 'orders.xlsx');
});

domA.ordersExportPdf?.addEventListener('click', () => {
  const win = window.open('', '_blank');
  const rows = adminState.orders.map(o => {
    const d = o.createdAt?.toDate ? o.createdAt.toDate() : new Date(o.createdAt);
    return `<tr><td>#${o.orderNumber}</td><td>${fmtDate(d)}</td><td>${fmtTime(d)}</td>
      <td>${(o.items || []).reduce((s, i) => s + i.qty, 0)}</td>
      <td>${fmtPrice(o.total)}</td><td>${o.status || 'active'}</td></tr>`;
  }).join('');
  win.document.write(`
    <html><head><title>GASHAM - Sifarişlər</title>
    <style>body{font-family:sans-serif;padding:20px}table{width:100%;border-collapse:collapse}
    td,th{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f5f5f7}
    h2{text-align:center}</style></head><body>
    <h2>GASHAM - Bütün Sifarişlər</h2>
    <table><thead><tr><th>#</th><th>Tarix</th><td>Saat</td><th>Say</th><th>Cəmi</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table>
    <p style="text-align:right;margin-top:16px;color:#666">${new Date().toLocaleDateString('az-AZ')}</p></body></html>`);
  win.document.close();
});

domA.ordersPrint?.addEventListener('click', () => {
  const allOrders = adminState.orders.slice(0, 20);
  const rows = allOrders.map(o => {
    const d = o.createdAt?.toDate ? o.createdAt.toDate() : new Date(o.createdAt);
    return `<tr><td>#${o.orderNumber}</td><td>${fmtDate(d)} ${fmtTime(d)}</td>
      <td>${(o.items || []).reduce((s, i) => s + i.qty, 0)}</td>
      <td>${fmtPrice(o.total)}</td></tr>`;
  }).join('');
  const win = window.open('', '_blank');
  win.document.write(`
    <html><head><title>GASHAM - Çap</title>
    <style>body{font-family:sans-serif;padding:20px}table{width:100%;border-collapse:collapse}
    td,th{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f5f5f7}</style></head>
    <body><h2 style="text-align:center">GASHAM - Sifarişlər</h2>
    <table><thead><tr><th>#</th><th>Tarix</th><th>Say</th><th>Cəmi</th></tr></thead><tbody>${rows}</tbody></table>
    <p style="text-align:right">${new Date().toLocaleDateString('az-AZ')}</p></body></html>`);
  win.document.close();
});

// ============================================
// ADMIN QR SCANNER (html5-qrcode)
// ============================================

domA.adminStartScanner.addEventListener('click', async () => {
  if (adminState.scannerRunning) {
    stopAdminScanner();
    return;
  }
  try {
    adminState.scanner = new Html5Qrcode('admin-scanner-element');
    await adminState.scanner.start(
      { facingMode: 'environment' },
      { fps: 30, qrbox: { width: 240, height: 240 } },
      onAdminScanSuccess,
      () => {}
    );
    adminState.scannerRunning = true;
    domA.adminStartScanner.textContent = 'Kameranı bağla';
  } catch (err) {
    showAdminToast('Kamera açılmadı: ' + err.message, 'error');
  }
});

function onAdminScanSuccess(decodedText) {
  if (!adminState.scannerRunning) return;
  stopAdminScanner();
  const qrId = decodedText.trim();
  domA.pfQrId.value = qrId;
  const existing = adminState.products.find(p => (p.qrId || p.id) === qrId);
  if (existing) {
    editProduct(existing.id);
    showAdminToast('Mövcud məhsul tapıldı', 'info');
  } else {
    resetProductForm();
    domA.pfQrId.value = qrId;
    domA.pfName.focus();
    showAdminToast('QR oxundu: ' + qrId.slice(0, 20), 'success');
  }
  if (navigator.vibrate) navigator.vibrate(100);
}

function stopAdminScanner() {
  adminState.scannerRunning = false;
  if (adminState.scanner) {
    try { adminState.scanner.stop(); adminState.scanner.clear(); } catch (e) {}
    adminState.scanner = null;
  }
  domA.adminStartScanner.textContent = 'Kameranı aç';
}

domA.adminFlashToggle.addEventListener('click', async () => {
  const video = document.querySelector('#admin-scanner-element video');
  if (!video) return;
  const track = video.srcObject?.getVideoTracks()[0];
  if (!track) return;
  const caps = track.getCapabilities();
  if (!caps.torch) { showAdminToast('Flash dəstəklənmir', 'warning'); return; }
  adminState.flashOn = !adminState.flashOn;
  await track.applyConstraints({ advanced: [{ torch: adminState.flashOn }] });
  domA.adminFlashToggle.style.color = adminState.flashOn ? '#ff0' : '';
});

domA.adminCameraSwitch.addEventListener('click', async () => {
  stopAdminScanner();
  adminState.cameraId = adminState.cameraId === 'environment' ? 'user' : 'environment';
  // Re-start with new camera
  try {
    adminState.scanner = new Html5Qrcode('admin-scanner-element');
    await adminState.scanner.start(
      { facingMode: adminState.cameraId },
      { fps: 30, qrbox: { width: 240, height: 240 } },
      onAdminScanSuccess,
      () => {}
    );
    adminState.scannerRunning = true;
    domA.adminStartScanner.textContent = 'Kameranı bağla';
  } catch (err) {
    showAdminToast('Kamera xətası', 'error');
  }
});

// ============================================
// EXPOSE GLOBALLY
// ============================================

window.editProduct = editProduct;
window.deleteProduct = deleteProduct;
window.showPriceHistory = showPriceHistory;
window.openOrderDetail = openOrderDetail;
window.deleteOrder = deleteOrder;
window.quickPrintOrder = quickPrintOrder;
window.editItemQty = editItemQty;
window.editItemQtySet = editItemQtySet;
window.editItemPrice = editItemPrice;
window.editRemoveItem = editRemoveItem;

// ============================================
// INIT
// ============================================

const savedTheme = localStorage.getItem('gasham-theme') || 'light';
document.documentElement.setAttribute('data-theme', savedTheme);

// Check auth
if (checkAuth()) {
  adminState.isLoggedIn = true;
  domA.loading.classList.add('fade-out');
  setTimeout(() => domA.loading.style.display = 'none', 600);
  showAdminPanel();
  initAdminData();
} else {
  domA.auth.style.display = 'flex';
  domA.loading.classList.add('fade-out');
  setTimeout(() => domA.loading.style.display = 'none', 600);
}
