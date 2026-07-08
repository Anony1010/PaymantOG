/**
 * GASHAM - Admin Panel v4
 * Firebase Realtime Database + Code 66 giriş
 */

const ADMIN_CODE = '66';
const SESSION_KEY = 'gasham_admin';

const state = {
  products: {},
  productsArr: [],
  orders: {},
  ordersArr: [],
  selectedProducts: new Set(),
  editingProductId: null,
  editingOrderId: null,
  editingOrderItems: []
};

const $ = id => document.getElementById(id);

// ============================================
// AUTH
// ============================================

function checkSession() { return localStorage.getItem(SESSION_KEY) === 'true'; }
function saveSession() { localStorage.setItem(SESSION_KEY, 'true'); }
function clearSession() { localStorage.removeItem(SESSION_KEY); }

const authScreen = $('auth-screen');
const dashScreen = $('dashboard-screen');

function showDashboard() {
  authScreen.classList.add('hidden');
  dashScreen.classList.remove('hidden');
}

function showAuth() {
  dashScreen.classList.add('hidden');
  authScreen.classList.remove('hidden');
}

// Login form
$('admin-login-form').addEventListener('submit', e => {
  e.preventDefault();
  const code = $('admin-code').value.trim();
  if (code === ADMIN_CODE) {
    saveSession();
    showDashboard();
    initData();
    toast('Giriş uğurlu', 'success');
  } else {
    $('login-error').textContent = 'Yanlış kod!';
    $('login-error').classList.remove('hidden');
    $('admin-code').value = '';
    $('admin-code').focus();
  }
});

$('logout-btn').addEventListener('click', () => { clearSession(); showAuth(); });
$('settings-logout')?.addEventListener('click', () => { clearSession(); showAuth(); });

// Theme
const savedTheme = localStorage.getItem('gasham-theme') || 'light';
document.documentElement.setAttribute('data-theme', savedTheme);
$('theme-toggle-admin').addEventListener('click', () => {
  const cur = document.documentElement.getAttribute('data-theme');
  const next = cur === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('gasham-theme', next);
});

// ============================================
// UTILITY
// ============================================

function toast(msg, type = 'info') {
  const icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `<span class="toast-icon">${icons[type]}</span><span class="toast-message">${msg}</span><button class="toast-close">&times;</button>`;
  t.querySelector('.toast-close').onclick = () => { t.classList.add('removing'); setTimeout(() => t.remove(), 300); };
  $('toast-container').appendChild(t);
  setTimeout(() => { t.classList.add('removing'); setTimeout(() => t.remove(), 300); }, 4000);
}

function esc(t) { const d = document.createElement('div'); d.textContent = t; return d.innerHTML; }
function fp(p) { return `${parseFloat(p || 0).toFixed(2)} ₼`; }
function fd(d) { const dt = new Date(d); return dt.toLocaleDateString('az-AZ', { day: '2-digit', month: 'short', year: 'numeric' }); }
function ft(d) { const dt = new Date(d); return dt.toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit' }); }
function now() { return new Date().toISOString(); }

// ============================================
// NAVIGATION
// ============================================

document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', () => {
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    item.classList.add('active');
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const page = $(`page-${item.dataset.page}`);
    if (page) page.classList.add('active');
    $('sidebar').classList.remove('open');
  });
});
$('sidebar-toggle').addEventListener('click', () => $('sidebar').classList.add('open'));
$('sidebar-close').addEventListener('click', () => $('sidebar').classList.remove('open'));

// ============================================
// REALTIME DATABASE
// ============================================

function initData() {
  if (!database) { toast('Firebase bağlantısı yoxdur', 'error'); return; }

  // Products
  database.ref('products').on('value', snap => {
    state.products = snap.val() || {};
    state.productsArr = Object.entries(state.products).map(([id, v]) => ({ id, ...v }));
    renderProducts();
    updateCategoryFilter();
    updateStats();
  });

  // Orders
  database.ref('orders').orderByChild('orderNumber').on('value', snap => {
    state.orders = snap.val() || {};
    state.ordersArr = Object.entries(state.orders)
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => (b.orderNumber || 0) - (a.orderNumber || 0));
    renderOrdersTable();
    updateStats();
  });
}

// ============================================
// STATISTICS
// ============================================

function updateStats() {
  const products = state.productsArr;
  const orders = state.ordersArr;
  const today = new Date(); today.setHours(0, 0, 0, 0);

  $('stat-products').textContent = products.length;
  $('stat-total-orders').textContent = orders.length;

  const todayOrders = orders.filter(o => new Date(o.createdAt || 0) >= today);
  $('stat-today-orders').textContent = todayOrders.length;

  const revenue = orders.reduce((s, o) => s + parseFloat(o.totalPrice || o.total || 0), 0);
  $('stat-revenue').textContent = fp(revenue);

  const sales = {};
  orders.forEach(o => (o.items || []).forEach(i => { sales[i.name] = (sales[i.name] || 0) + (i.qty || 0); }));
  const top = Object.entries(sales).sort((a, b) => b[1] - a[1])[0];
  $('stat-top-product').textContent = top ? `${top[0]} (${top[1]})` : '-';

  const recent = orders.slice(0, 5);
  $('recent-orders-list').innerHTML = recent.length
    ? recent.map(o => `<div class="recent-item"><span>Sifariş #${o.orderNumber}</span><span>${fp(o.totalPrice || o.total)}</span></div>`).join('')
    : '<p class="muted">Heç bir sifariş yoxdur</p>';
}

// ============================================
// PRODUCTS CRUD
// ============================================

function renderProducts() {
  const tbody = $('products-tbody');
  const empty = $('products-empty');
  const filter = $('product-category-filter').value;
  const search = $('product-search').value.toLowerCase();
  const sort = $('product-sort').value;

  let list = [...state.productsArr];
  if (filter) list = list.filter(p => p.category === filter);
  if (search) list = list.filter(p => (p.productName || p.name || '').toLowerCase().includes(search) || (p.qrCode || p.qrId || p.id || '').toLowerCase().includes(search));
  if (sort === 'price') list.sort((a, b) => parseFloat(a.price || 0) - parseFloat(b.price || 0));
  else if (sort === 'stock') list.sort((a, b) => parseInt(a.stock || 0) - parseInt(b.stock || 0));
  else list.sort((a, b) => (a.productName || a.name || '').localeCompare(b.productName || b.name || ''));

  if (!list.length) { tbody.innerHTML = ''; empty.classList.remove('hidden'); return; }
  empty.classList.add('hidden');

  tbody.innerHTML = list.map(p => {
    const pid = p.id;
    const name = p.productName || p.name || '';
    const qr = p.qrCode || p.qrId || pid;
    return `<tr>
      <td><input type="checkbox" class="product-cb" value="${esc(pid)}" ${state.selectedProducts.has(pid) ? 'checked' : ''} /></td>
      <td>${p.image ? `<img src="${esc(p.image)}" alt="" />` : '<span style="color:var(--text-muted)">—</span>'}</td>
      <td><code style="font-size:12px">${esc(qr)}</code></td>
      <td><strong>${esc(name)}</strong></td>
      <td style="font-weight:600">${fp(p.price)}</td>
      <td>${esc(p.category || '—')}</td>
      <td>${p.stock ?? '—'}</td>
      <td><span class="status-badge ${p.status || 'active'}">${p.status || 'active'}</span></td>
      <td>
        <button class="btn btn-sm btn-outline" onclick="editProduct('${esc(pid)}')">Düzəlt</button>
        <button class="btn btn-sm btn-danger" onclick="deleteProduct('${esc(pid)}')">Sil</button>
      </td>
    </tr>`;
  }).join('');

  document.querySelectorAll('.product-cb').forEach(cb => {
    cb.addEventListener('change', () => {
      if (cb.checked) state.selectedProducts.add(cb.value);
      else state.selectedProducts.delete(cb.value);
    });
  });
}

function updateCategoryFilter() {
  const cats = [...new Set(state.productsArr.map(p => p.category).filter(Boolean))];
  $('product-category-filter').innerHTML = '<option value="">Bütün kateqoriyalar</option>' +
    cats.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('');
}

$('product-search').addEventListener('input', renderProducts);
$('product-category-filter').addEventListener('change', renderProducts);
$('product-sort').addEventListener('change', renderProducts);

$('select-all-products').addEventListener('change', function() {
  document.querySelectorAll('.product-cb').forEach(cb => {
    cb.checked = this.checked;
    if (this.checked) state.selectedProducts.add(cb.value);
    else state.selectedProducts.delete(cb.value);
  });
});

$('add-product-btn').addEventListener('click', () => {
  resetForm();
  document.querySelector('[data-page="qr-scanner"]').click();
});

$('product-form').addEventListener('submit', async e => {
  e.preventDefault();
  if (!database) { toast('Firebase yoxdur', 'error'); return; }
  const qrId = $('pf-qr-id').value.trim();
  const name = $('pf-name').value.trim();
  if (!qrId || !name) { toast('QR ID və Ad doldurulmalıdır', 'error'); return; }

  const data = {
    qrCode: qrId,
    productName: name,
    price: parseFloat($('pf-price').value) || 0,
    stock: parseInt($('pf-stock').value) || 0,
    category: $('pf-category').value.trim(),
    barcode: $('pf-barcode').value.trim(),
    note: $('pf-note').value.trim(),
    image: $('pf-image').value.trim(),
    status: $('pf-status').value,
    updatedAt: now(),
    updatedBy: 'admin'
  };

  try {
    if (state.editingProductId) {
      await database.ref(`products/${state.editingProductId}`).update(data);
      // Price history
      const oldSnap = await database.ref(`products/${state.editingProductId}/price`).once('value');
      const oldPrice = oldSnap.val();
      if (oldPrice && parseFloat(oldPrice) !== data.price) {
        await database.ref('priceHistory').push({
          productId: state.editingProductId,
          productName: name,
          oldPrice: parseFloat(oldPrice),
          newPrice: data.price,
          changedBy: 'admin',
          changedAt: now()
        });
      }
      toast('Məhsul yeniləndi', 'success');
    } else {
      data.createdAt = now();
      data.createdBy = 'admin';
      await database.ref(`products/${qrId}`).set(data);
      toast('Məhsul yaradıldı', 'success');
    }
    resetForm();
  } catch (err) {
    toast('Xəta: ' + err.message, 'error');
  }
});

function editProduct(id) {
  const p = state.products[id];
  if (!p) return;
  state.editingProductId = id;
  $('pf-qr-id').value = p.qrCode || p.qrId || id;
  $('pf-name').value = p.productName || p.name || '';
  $('pf-price').value = p.price || '';
  $('pf-stock').value = p.stock || 0;
  $('pf-category').value = p.category || '';
  $('pf-barcode').value = p.barcode || '';
  $('pf-note').value = p.note || '';
  $('pf-image').value = p.image || '';
  $('pf-status').value = p.status || 'active';
  $('pf-submit').textContent = 'Yenilə';
  $('pf-delete').classList.remove('hidden');
  document.querySelector('[data-page="qr-scanner"]').click();
}

function resetForm() {
  state.editingProductId = null;
  $('product-form').reset();
  $('pf-submit').textContent = 'Yadda saxla';
  $('pf-delete').classList.add('hidden');
}
$('pf-cancel').addEventListener('click', resetForm);

async function deleteProduct(id) {
  if (!database || !confirm('Məhsulu silmək istəyirsiniz?')) return;
  try {
    await database.ref(`products/${id}`).remove();
    toast('Məhsul silindi', 'success');
    resetForm();
  } catch (err) { toast('Xəta: ' + err.message, 'error'); }
}
$('pf-delete').addEventListener('click', () => { if (state.editingProductId) deleteProduct(state.editingProductId); });

$('bulk-delete-btn').addEventListener('click', async () => {
  if (!state.selectedProducts.size) { toast('Heç bir məhsul seçilməyib', 'warning'); return; }
  if (!confirm(`${state.selectedProducts.size} məhsulu silmək istəyirsiniz?`)) return;
  const updates = {};
  state.selectedProducts.forEach(id => { updates[`products/${id}`] = null; });
  await database.ref().update(updates);
  state.selectedProducts.clear();
  toast('Məhsullar silindi', 'success');
});

// ============================================
// EXPORT / IMPORT
// ============================================

$('export-csv').addEventListener('click', () => {
  const h = ['qrCode', 'productName', 'price', 'category', 'stock', 'barcode', 'status'];
  const r = state.productsArr.map(p => [p.qrCode || p.id, p.productName || p.name, p.price, p.category || '', p.stock || '', p.barcode || '', p.status || 'active'].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
  downloadCSV([h.join(','), ...r].join('\n'), 'products.csv');
});
$('export-excel').addEventListener('click', () => {
  const r = state.productsArr.map(p => [p.qrCode || p.id, p.productName || p.name, p.price, p.category || '', p.stock || '', p.barcode || '', p.status || 'active'].join(','));
  downloadCSV('\uFEFFqrCode,productName,price,category,stock,barcode,status\n' + r.join('\n'), 'products.xlsx');
});
$('export-pdf').addEventListener('click', () => {
  const rows = state.productsArr.map(p => `<tr><td>${esc(p.qrCode || p.id)}</td><td>${esc(p.productName || p.name)}</td><td>${fp(p.price)}</td><td>${esc(p.category || '')}</td><td>${p.stock || 0}</td></tr>`).join('');
  const w = window.open('', '_blank');
  w.document.write(`<html><head><title>GASHAM - Məhsullar</title><style>body{font-family:sans-serif;padding:20px}table{width:100%;border-collapse:collapse}td,th{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f5f5f7}h2{text-align:center}</style></head><body><h2>GASHAM - Məhsul Siyahısı</h2><table><thead><tr><th>QR ID</th><th>Ad</th><th>Qiymət</th><th>Kateqoriya</th><th>Stok</th></tr></thead><tbody>${rows}</tbody></table></body></html>`);
  w.document.close();
});
function downloadCSV(c, f) { const b = new Blob([c], {type:'text/csv'}); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = f; a.click(); URL.revokeObjectURL(a.href); }

$('import-btn').addEventListener('click', () => $('import-modal').classList.remove('hidden'));
$('import-modal-close').addEventListener('click', () => $('import-modal').classList.add('hidden'));
$('import-modal').querySelector('.modal-backdrop')?.addEventListener('click', () => $('import-modal').classList.add('hidden'));
$('import-execute').addEventListener('click', async () => {
  if (!database) { toast('Firebase yoxdur', 'error'); return; }
  const file = $('import-file').files[0];
  if (!file) { toast('Fayl seçin', 'warning'); return; }
  const text = await file.text();
  const lines = text.split('\n').filter(l => l.trim());
  if (lines.length < 2) { toast('Fayl boşdur', 'error'); return; }
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  let imported = 0;
  for (let i = 1; i < lines.length; i++) {
    const vals = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
    const data = {};
    headers.forEach((h, idx) => { data[h] = vals[idx] || ''; });
    if (data.qrCode && data.productName) {
      data.price = parseFloat(data.price) || 0;
      data.stock = parseInt(data.stock) || 0;
      data.createdAt = now();
      data.updatedAt = now();
      await database.ref(`products/${data.qrCode}`).set(data);
      imported++;
    }
  }
  toast(`${imported} məhsul import edildi`, 'success');
  $('import-modal').classList.add('hidden');
});

// ============================================
// ORDERS
// ============================================

function renderOrdersTable() {
  const tbody = $('orders-tbody');
  const search = ($('order-search')?.value || '').toLowerCase();
  const dateFilter = $('order-date-filter')?.value || '';
  const statusFilter = $('order-status-filter')?.value || '';

  let list = [...state.ordersArr];
  if (search) list = list.filter(o => String(o.orderNumber).includes(search));
  if (statusFilter) list = list.filter(o => o.status === statusFilter);
  if (dateFilter) list = list.filter(o => (o.createdAt || '').startsWith(dateFilter));

  if (!list.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--text-muted)">Heç bir sifariş yoxdur</td></tr>';
    return;
  }

  tbody.innerHTML = list.map(o => {
    const itemsCount = (o.items || []).reduce((s, i) => s + (i.qty || 0), 0);
    const statusClass = o.status === 'Təsdiqlənib' || o.status === 'completed' ? 'Təsdiqlənib' : 'active';
    return `<tr>
      <td><strong>#${o.orderNumber}</strong></td>
      <td>${fd(o.createdAt)}</td>
      <td>${ft(o.createdAt)}</td>
      <td>${itemsCount}</td>
      <td style="font-weight:600">${fp(o.totalPrice || o.total)}</td>
      <td><span class="status-badge ${statusClass}">${o.status || 'active'}</span></td>
      <td>
        <button class="btn btn-sm btn-outline" onclick="openOrder('${esc(o.id)}')">Aç</button>
        <button class="btn btn-sm btn-outline" onclick="printOrder('${esc(o.id)}')">Çap</button>
        <button class="btn btn-sm btn-danger" onclick="delOrder('${esc(o.id)}')">Sil</button>
      </td>
    </tr>`;
  }).join('');
}

$('order-search')?.addEventListener('input', renderOrdersTable);
$('order-date-filter')?.addEventListener('change', renderOrdersTable);
$('order-status-filter')?.addEventListener('change', renderOrdersTable);

// Order detail
async function openOrder(id) {
  const o = state.orders[id];
  if (!o) return;
  state.editingOrderId = id;
  state.editingOrderItems = JSON.parse(JSON.stringify(o.items || []));

  $('order-detail-title').textContent = `Sifariş #${o.orderNumber}`;
  renderOrderItems();
  $('order-detail-footer').classList.remove('hidden');
  $('order-detail-modal').classList.remove('hidden');
}

function renderOrderItems() {
  const items = state.editingOrderItems;
  const o = state.orders[state.editingOrderId];
  if (!items.length) { $('order-detail-body').innerHTML = '<p class="muted" style="text-align:center;padding:20px">Sifariş boşdur</p>'; return; }

  $('order-detail-body').innerHTML = `
    <div style="margin-bottom:12px;font-size:14px;color:var(--text-secondary)">${fd(o?.createdAt)} ${ft(o?.createdAt)} <span class="status-badge ${o?.status === 'Təsdiqlənib' ? 'Təsdiqlənib' : 'active'}" style="margin-left:8px">${o?.status || 'active'}</span></div>
    ${items.map((item, idx) => `
      <div class="order-edit-item">
        <span class="item-name">${esc(item.name)}</span>
        <span style="font-size:12px;color:var(--text-muted);min-width:55px">${fp(item.price)}</span>
        <button class="btn-qty" onclick="oiQty(${idx},-1)">−</button>
        <input type="number" value="${item.qty}" min="0" class="item-qty-input" onchange="oiQtySet(${idx},this.value)" />
        <button class="btn-qty" onclick="oiQty(${idx},1)">+</button>
        <input type="number" value="${item.price}" step="0.01" class="item-price-input" onchange="oiPrice(${idx},this.value)" />
        <span style="font-weight:700;color:var(--accent);min-width:65px;text-align:right">${fp(item.price * item.qty)}</span>
        <button class="btn-remove-item" onclick="oiRemove(${idx})">&times;</button>
      </div>
    `).join('')}
    <div class="order-edit-total">Cəmi: ${fp(items.reduce((s,i) => s + i.price * i.qty, 0))}</div>`;
}

function oiQty(idx, d) { if (state.editingOrderItems[idx]) { state.editingOrderItems[idx].qty = Math.max(0, (state.editingOrderItems[idx].qty||1)+d); if (!state.editingOrderItems[idx].qty) state.editingOrderItems.splice(idx,1); renderOrderItems(); } }
function oiQtySet(idx, v) { if (state.editingOrderItems[idx]) { state.editingOrderItems[idx].qty = Math.max(0, parseInt(v)||0); if (!state.editingOrderItems[idx].qty) state.editingOrderItems.splice(idx,1); renderOrderItems(); } }
function oiPrice(idx, v) { if (state.editingOrderItems[idx]) { state.editingOrderItems[idx].price = parseFloat(v)||0; renderOrderItems(); } }
function oiRemove(idx) { state.editingOrderItems.splice(idx,1); renderOrderItems(); }

$('order-save-changes').addEventListener('click', async () => {
  if (!state.editingOrderId || !database) return;
  const total = state.editingOrderItems.reduce((s,i) => s + i.price * i.qty, 0);
  try {
    await database.ref(`orders/${state.editingOrderId}`).update({
      items: state.editingOrderItems,
      totalPrice: total,
      totalItems: state.editingOrderItems.reduce((s,i) => s + i.qty, 0),
      updatedAt: now()
    });
    toast('Sifariş yeniləndi', 'success');
    $('order-detail-modal').classList.add('hidden');
  } catch (err) { toast('Xəta: ' + err.message, 'error'); }
});

$('order-delete-full').addEventListener('click', async () => {
  if (!state.editingOrderId || !database || !confirm('Sifarişi silmək istəyirsiniz?')) return;
  try { await database.ref(`orders/${state.editingOrderId}`).remove(); toast('Sifariş silindi', 'success'); $('order-detail-modal').classList.add('hidden'); }
  catch (err) { toast('Xəta: ' + err.message, 'error'); }
});

$('order-detail-close').addEventListener('click', () => $('order-detail-modal').classList.add('hidden'));
$('order-detail-modal').querySelector('.modal-backdrop')?.addEventListener('click', () => $('order-detail-modal').classList.add('hidden'));

async function delOrder(id) {
  if (!database || !confirm('Sifarişi silmək istəyirsiniz?')) return;
  try { await database.ref(`orders/${id}`).remove(); toast('Sifariş silindi', 'success'); }
  catch (err) { toast('Xəta: ' + err.message, 'error'); }
}

function printOrder(id) {
  const o = state.orders[id]; if (!o) return;
  const items = (o.items||[]).map(i => `<tr><td>${esc(i.name)}</td><td>${i.qty}</td><td>${fp(i.price)}</td><td>${fp(i.price*i.qty)}</td></tr>`).join('');
  const w = window.open('', '_blank');
  w.document.write(`<html><head><title>Sifariş #${o.orderNumber}</title><style>body{font-family:sans-serif;padding:20px}table{width:100%;border-collapse:collapse}td,th{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f5f5f5}h2{text-align:center}</style></head><body><h2>GASHAM</h2><p>Sifariş #${o.orderNumber} | ${fd(o.createdAt)} ${ft(o.createdAt)} | Status: ${o.status}</p><table><thead><tr><th>Məhsul</th><th>Say</th><th>Qiymət</th><th>Cəm</th></tr></thead><tbody>${items}</tbody></table><h3 style="text-align:right">Cəmi: ${fp(o.totalPrice || o.total)}</h3></body></html>`);
  w.document.close();
}

// Orders export
$('orders-export-csv')?.addEventListener('click', () => {
  const r = state.ordersArr.map(o => [o.orderNumber, fd(o.createdAt), ft(o.createdAt), (o.items||[]).reduce((s,i) => s + i.qty, 0), (o.totalPrice||o.total||0).toFixed(2), o.status||'active'].join(','));
  downloadCSV('\uFEFFSifariş #,Tarix,Saat,Say,Cəmi,Status\n' + r.join('\n'), 'orders.csv');
});
$('orders-export-excel')?.addEventListener('click', () => {
  const r = state.ordersArr.map(o => [o.orderNumber, fd(o.createdAt), ft(o.createdAt), (o.items||[]).reduce((s,i) => s + i.qty, 0), (o.totalPrice||o.total||0).toFixed(2), o.status||'active'].join(','));
  downloadCSV('\uFEFFSifariş #,Tarix,Saat,Say,Cəmi,Status\n' + r.join('\n'), 'orders.xlsx');
});
$('orders-export-pdf')?.addEventListener('click', () => {
  const rows = state.ordersArr.map(o => `<tr><td>#${o.orderNumber}</td><td>${fd(o.createdAt)}</td><td>${ft(o.createdAt)}</td><td>${(o.items||[]).reduce((s,i) => s + i.qty, 0)}</td><td>${fp(o.totalPrice||o.total)}</td><td>${o.status||'active'}</td></tr>`).join('');
  const w = window.open('', '_blank');
  w.document.write(`<html><head><title>GASHAM - Sifarişlər</title><style>body{font-family:sans-serif;padding:20px}table{width:100%;border-collapse:collapse}td,th{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f5f5f7}h2{text-align:center}</style></head><body><h2>GASHAM - Bütün Sifarişlər</h2><table><thead><tr><th>#</th><th>Tarix</th><td>Saat</td><th>Say</th><th>Cəmi</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table></body></html>`);
  w.document.close();
});
$('orders-print')?.addEventListener('click', () => {
  const rows = state.ordersArr.slice(0, 50).map(o => `<tr><td>#${o.orderNumber}</td><td>${fd(o.createdAt)} ${ft(o.createdAt)}</td><td>${(o.items||[]).reduce((s,i) => s + i.qty, 0)}</td><td>${fp(o.totalPrice||o.total)}</td></tr>`).join('');
  const w = window.open('', '_blank');
  w.document.write(`<html><head><title>GASHAM - Çap</title><style>body{font-family:sans-serif;padding:20px}table{width:100%;border-collapse:collapse}td,th{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f5f5f7}h2{text-align:center}</style></head><body><h2>GASHAM</h2><table><thead><tr><th>#</th><th>Tarix</th><th>Say</th><th>Cəmi</th></tr></thead><tbody>${rows}</tbody></table></body></html>`);
  w.document.close();
});

// ============================================
// QR SCANNER
// ============================================

let adminScanner = null;
let adminScanning = false;

$('admin-start-scanner').addEventListener('click', async () => {
  if (adminScanning) { stopAdminScan(); return; }
  try {
    adminScanner = new Html5Qrcode('admin-scanner-element');
    await adminScanner.start({ facingMode: 'environment' }, { fps: 30, qrbox: { width: 240, height: 240 } }, text => {
      stopAdminScan();
      const qrId = text.trim();
      $('pf-qr-id').value = qrId;
      const existing = state.productsArr.find(p => (p.qrCode || p.qrId || p.id) === qrId);
      if (existing) { editProduct(existing.id); toast('Mövcud məhsul: ' + (existing.productName || existing.name), 'info'); }
      else { resetForm(); $('pf-qr-id').value = qrId; $('pf-name').focus(); toast('QR oxundu', 'success'); }
      if (navigator.vibrate) navigator.vibrate(100);
    }, () => {});
    adminScanning = true;
    $('admin-start-scanner').textContent = 'Kameranı bağla';
  } catch (err) { toast('Kamera xətası: ' + err.message, 'error'); }
});

function stopAdminScan() {
  adminScanning = false;
  if (adminScanner) { try { adminScanner.stop(); adminScanner.clear(); } catch(e) {} adminScanner = null; }
  $('admin-start-scanner').textContent = 'Kameranı aç';
}

$('admin-flash-toggle').addEventListener('click', async () => {
  const v = document.querySelector('#admin-scanner-element video');
  if (!v) return;
  const t = v.srcObject?.getVideoTracks()[0];
  if (!t || !t.getCapabilities().torch) { toast('Flash dəstəklənmir', 'warning'); return; }
  const on = adminScanner?.isTorchOn;
  try { await t.applyConstraints({ advanced: [{ torch: !on }] }); } catch(e) {}
});

$('admin-camera-switch').addEventListener('click', async () => {
  stopAdminScan();
  state.cameraId = state.cameraId === 'environment' ? 'user' : 'environment';
  try {
    adminScanner = new Html5Qrcode('admin-scanner-element');
    await adminScanner.start({ facingMode: state.cameraId }, { fps: 30, qrbox: { width: 240, height: 240 } }, text => {
      stopAdminScan();
      $('pf-qr-id').value = text.trim();
      const existing = state.productsArr.find(p => (p.qrCode || p.qrId || p.id) === text.trim());
      if (existing) { editProduct(existing.id); toast('Mövcud məhsul', 'info'); }
      else { resetForm(); $('pf-qr-id').value = text.trim(); $('pf-name').focus(); toast('QR oxundu', 'success'); }
      if (navigator.vibrate) navigator.vibrate(100);
    }, () => {});
    adminScanning = true;
    $('admin-start-scanner').textContent = 'Kameranı bağla';
  } catch (err) { toast('Kamera xətası', 'error'); }
});

// ============================================
// EXPOSE GLOBALS
// ============================================

window.editProduct = editProduct;
window.deleteProduct = deleteProduct;
window.openOrder = openOrder;
window.delOrder = delOrder;
window.printOrder = printOrder;
window.oiQty = oiQty;
window.oiQtySet = oiQtySet;
window.oiPrice = oiPrice;
window.oiRemove = oiRemove;

// ============================================
// INIT
// ============================================

const loading = $('loading-screen');
setTimeout(() => { loading.classList.add('fade-out'); setTimeout(() => loading.style.display = 'none', 500); }, 400);

if (checkSession()) { showDashboard(); setTimeout(initData, 600); }
else { showAuth(); }
