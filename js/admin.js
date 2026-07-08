/**
 * GASHAM - Admin Panel
 * Firebase Realtime Database | Giriş kodu: 66
 */

(function() {
  'use strict';


  const state = {
    products: {},
    productsArr: [],
    orders: {},
    ordersArr: [],
    selectedProducts: new Set(),
    editingProductId: null,
    editingOrderId: null,
    editingOrderItems: [],
    cameraId: 'environment',
    scanner: null,
    scanning: false,
    flashOn: false
  };

  const $ = id => document.getElementById(id);

  // ==================== UTILITY ====================

  function toast(msg, type = 'info') {
    const icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.innerHTML = `<span class="toast-icon">${icons[type]}</span><span class="toast-message">${msg}</span><button class="toast-close">&times;</button>`;
    t.querySelector('.toast-close').onclick = () => { t.classList.add('removing'); setTimeout(() => t.remove(), 300); };
    const container = $('toast-container');
    if (container) container.appendChild(t);
    setTimeout(() => { if (t.parentNode) { t.classList.add('removing'); setTimeout(() => t.remove(), 300); } }, 4000);
  }

  function esc(t) { const d = document.createElement('div'); d.textContent = t; return d.innerHTML; }
  function fp(p) { return `${parseFloat(p || 0).toFixed(2)} ₼`; }
  function fd(d) { return new Date(d).toLocaleDateString('az-AZ', { day: '2-digit', month: 'short', year: 'numeric' }); }
  function ft(d) { return new Date(d).toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit' }); }
  function nowISO() { return new Date().toISOString(); }

  // ==================== AUTH ====================


  // ==================== SCREENS ====================

  function showDashboard() {
    const dash = $('dashboard-screen');
    if (dash) dash.classList.remove('hidden');
  }

  

  // ==================== INIT DATA ====================

  function initData() {
    if (!database) {
      toast('Firebase bağlantısı yoxdur. Məlumatlar yüklənə bilmədi.', 'warning');
      return;
    }

    // Products realtime
    database.ref('products').on('value', snap => {
      state.products = snap.val() || {};
      state.productsArr = Object.entries(state.products).map(([id, v]) => ({ id, ...v }));
      renderProducts();
      updateCategoryFilter();
      updateStats();
    }, err => { console.error('Products error:', err); toast('Məhsullar yüklənə bilmədi', 'error'); });

    // Orders realtime
    database.ref('orders').on('value', snap => {
      state.orders = snap.val() || {};
      state.ordersArr = Object.entries(state.orders)
        .map(([id, v]) => ({ id, ...v }))
        .sort((a, b) => (b.orderNumber || 0) - (a.orderNumber || 0));
      renderOrdersTable();
      updateStats();
    }, err => { console.error('Orders error:', err); });
  }

  // ==================== STATS ====================

  function updateStats() {
    const prods = state.productsArr;
    const orders = state.ordersArr;
    const today = new Date(); today.setHours(0, 0, 0, 0);

    setText('stat-products', prods.length);
    setText('stat-total-orders', orders.length);
    setText('stat-today-orders', orders.filter(o => new Date(o.createdAt || 0) >= today).length);

    const revenue = orders.reduce((s, o) => s + parseFloat(o.totalPrice || o.total || 0), 0);
    setText('stat-revenue', fp(revenue));

    const sales = {};
    orders.forEach(o => (o.items || []).forEach(i => { sales[i.name] = (sales[i.name] || 0) + (i.qty || 0); }));
    const top = Object.entries(sales).sort((a, b) => b[1] - a[1])[0];
    setText('stat-top-product', top ? `${top[0]} (${top[1]})` : '-');

    const recent = orders.slice(0, 5);
    const el = $('recent-orders-list');
    if (el) el.innerHTML = recent.length
      ? recent.map(o => `<div class="recent-item"><span>Sifariş #${o.orderNumber}</span><span>${fp(o.totalPrice || o.total)}</span></div>`).join('')
      : '<p class="muted">Heç bir sifariş yoxdur</p>';
  }

  function setText(id, val) { const e = $(id); if (e) e.textContent = val; }

  // ==================== PRODUCTS ====================

  function renderProducts() {
    const tbody = $('products-tbody');
    const empty = $('products-empty');
    if (!tbody) return;

    const filter = $('product-category-filter')?.value || '';
    const search = ($('product-search')?.value || '').toLowerCase();
    const sort = $('product-sort')?.value || 'name';

    let list = [...state.productsArr];
    if (filter) list = list.filter(p => p.category === filter);
    if (search) list = list.filter(p => (p.productName || p.name || '').toLowerCase().includes(search) || (p.qrCode || p.qrId || p.id || '').toLowerCase().includes(search));
    if (sort === 'price') list.sort((a, b) => parseFloat(a.price || 0) - parseFloat(b.price || 0));
    else if (sort === 'stock') list.sort((a, b) => parseInt(a.stock || 0) - parseInt(b.stock || 0));
    else list.sort((a, b) => (a.productName || a.name || '').localeCompare(b.productName || b.name || ''));

    if (!list.length) { tbody.innerHTML = ''; if (empty) empty.classList.remove('hidden'); return; }
    if (empty) empty.classList.add('hidden');

    tbody.innerHTML = list.map(p => {
      const pid = p.id, name = p.productName || p.name || '', qr = p.qrCode || p.qrId || pid;
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
      cb.addEventListener('change', function() {
        if (this.checked) state.selectedProducts.add(this.value);
        else state.selectedProducts.delete(this.value);
      });
    });
  }

  function updateCategoryFilter() {
    const el = $('product-category-filter');
    if (!el) return;
    const cats = [...new Set(state.productsArr.map(p => p.category).filter(Boolean))];
    el.innerHTML = '<option value="">Bütün kateqoriyalar</option>' + cats.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('');
  }

  // ==================== PRODUCT CRUD ====================

  window.editProduct = function(id) {
    const p = state.products[id];
    if (!p) return;
    state.editingProductId = id;
    if ($('pf-name')) $('pf-name').value = p.productName || p.name || '';
    if ($('pf-price')) $('pf-price').value = p.price || '';
    if ($('pf-stock')) $('pf-stock').value = p.stock || 0;
    if ($('pf-submit')) $('pf-submit').textContent = 'Yenilə';
    if ($('pf-delete')) $('pf-delete').classList.remove('hidden');
    // Navigate to scanner page
    const btn = document.querySelector('[data-page="qr-scanner"]');
    if (btn) btn.click();
  };

  window.deleteProduct = async function(id) {
    if (!database || !confirm('Məhsulu silmək istəyirsiniz?')) return;
    try { await database.ref(`products/${id}`).remove(); toast('Məhsul silindi', 'success'); resetForm(); }
    catch (err) { toast('Xəta: ' + err.message, 'error'); }
  };

  function resetForm() {
    state.editingProductId = null;
    const form = $('product-form');
    if (form) form.reset();
    const sub = $('pf-submit'); if (sub) sub.textContent = 'Yadda saxla';
    const del = $('pf-delete'); if (del) del.classList.add('hidden');
  }

  // ==================== ORDERS ====================

  function renderOrdersTable() {
    const tbody = $('orders-tbody');
    if (!tbody) return;

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
      const cnt = (o.items || []).reduce((s, i) => s + (i.qty || 0), 0);
      const sc = o.status === 'Təsdiqlənib' || o.status === 'completed' ? 'Təsdiqlənib' : 'active';
      return `<tr>
        <td><strong>#${o.orderNumber}</strong></td>
        <td>${fd(o.createdAt)}</td><td>${ft(o.createdAt)}</td>
        <td>${cnt}</td>
        <td style="font-weight:600">${fp(o.totalPrice || o.total)}</td>
        <td><span class="status-badge ${sc}">${o.status || 'active'}</span></td>
        <td>
          <button class="btn btn-sm btn-outline" onclick="openOrder('${esc(o.id)}')">Aç</button>
          <button class="btn btn-sm btn-outline" onclick="printOrder('${esc(o.id)}')">Çap</button>
          <button class="btn btn-sm btn-danger" onclick="delOrder('${esc(o.id)}')">Sil</button>
        </td>
      </tr>`;
    }).join('');
  }

  window.openOrder = function(id) {
    const o = state.orders[id]; if (!o) return;
    state.editingOrderId = id;
    state.editingOrderItems = JSON.parse(JSON.stringify(o.items || []));
    const title = $('order-detail-title'); if (title) title.textContent = `Sifariş #${o.orderNumber}`;
    renderOrderItems();
    const footer = $('order-detail-footer'); if (footer) footer.classList.remove('hidden');
    const modal = $('order-detail-modal'); if (modal) modal.classList.remove('hidden');
  };

  function renderOrderItems() {
    const body = $('order-detail-body'); if (!body) return;
    const items = state.editingOrderItems;
    const o = state.orders[state.editingOrderId];
    if (!items.length) { body.innerHTML = '<p class="muted" style="text-align:center;padding:20px">Sifariş boşdur</p>'; return; }
    body.innerHTML = `
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

  window.oiQty = function(idx, d) { if (state.editingOrderItems[idx]) { state.editingOrderItems[idx].qty = Math.max(0, (state.editingOrderItems[idx].qty||1)+d); if (!state.editingOrderItems[idx].qty) state.editingOrderItems.splice(idx,1); renderOrderItems(); } };
  window.oiQtySet = function(idx, v) { if (state.editingOrderItems[idx]) { state.editingOrderItems[idx].qty = Math.max(0, parseInt(v)||0); if (!state.editingOrderItems[idx].qty) state.editingOrderItems.splice(idx,1); renderOrderItems(); } };
  window.oiPrice = function(idx, v) { if (state.editingOrderItems[idx]) { state.editingOrderItems[idx].price = parseFloat(v)||0; renderOrderItems(); } };
  window.oiRemove = function(idx) { state.editingOrderItems.splice(idx,1); renderOrderItems(); };

  window.delOrder = async function(id) {
    if (!database || !confirm('Sifarişi silmək istəyirsiniz?')) return;
    try { await database.ref(`orders/${id}`).remove(); toast('Sifariş silindi', 'success'); }
    catch(err) { toast('Xəta: ' + err.message, 'error'); }
  };

  window.printOrder = function(id) {
    const o = state.orders[id]; if (!o) return;
    const items = (o.items||[]).map(i => `<tr><td>${esc(i.name)}</td><td>${i.qty}</td><td>${fp(i.price)}</td><td>${fp(i.price*i.qty)}</td></tr>`).join('');
    const w = window.open('', '_blank');
    w.document.write(`<html><head><title>Sifariş #${o.orderNumber}</title><style>body{font-family:sans-serif;padding:20px}table{width:100%;border-collapse:collapse}td,th{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f5f5f5}h2{text-align:center}</style></head><body><h2>GASHAM</h2><p>Sifariş #${o.orderNumber} | ${fd(o.createdAt)} ${ft(o.createdAt)} | Status: ${o.status}</p><table><thead><tr><th>Məhsul</th><th>Say</th><th>Qiymət</th><th>Cəm</th></tr></thead><tbody>${items}</tbody></table><h3 style="text-align:right">Cəmi: ${fp(o.totalPrice || o.total)}</h3></body></html>`);
    w.document.close();
  };

  // ==================== MAIN INIT ====================

  document.addEventListener('DOMContentLoaded', function() {
    // Theme
    const savedTheme = localStorage.getItem('gasham-theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);

    // Theme toggle
    const themeBtn = $('theme-toggle-admin');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        const cur = document.documentElement.getAttribute('data-theme');
        const next = cur === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('gasham-theme', next);
      });
    }

    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', function() {
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        this.classList.add('active');
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        const page = $(`page-${this.dataset.page}`);
        if (page) page.classList.add('active');
        const sidebar = $('sidebar');
        if (sidebar) sidebar.classList.remove('open');
      });
    });

    const sidebarToggle = $('sidebar-toggle');
    if (sidebarToggle) sidebarToggle.addEventListener('click', () => { const s = $('sidebar'); if (s) s.classList.add('open'); });
    const sidebarClose = $('sidebar-close');
    if (sidebarClose) sidebarClose.addEventListener('click', () => { const s = $('sidebar'); if (s) s.classList.remove('open'); });



// Logout (istifadəçi panelinə qayıt)
    const logoutBtn = $('logout-btn');
    if (logoutBtn) logoutBtn.addEventListener('click', () => { window.location.href = 'index.html'; });
    const settingsLogout = $('settings-logout');
    if (settingsLogout) settingsLogout.addEventListener('click', () => { window.location.href = 'index.html'; });

    const productForm = $('product-form');
    if (productForm) {
      productForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        if (!database) { toast('Firebase yoxdur', 'error'); return; }
        const name = $('pf-name')?.value?.trim();
        if (!name) { toast('Məhsul adı daxil edin', 'error'); return; }
        const data = {
          productName: name,
          price: parseFloat($('pf-price')?.value) || 0,
          stock: parseInt($('pf-stock')?.value) || 0,
          updatedAt: nowISO(), updatedBy: 'admin',
          status: 'active'
        };
        try {
          if (state.editingProductId) {
            await database.ref(`products/${state.editingProductId}`).update(data);
            const oldSnap = await database.ref(`products/${state.editingProductId}/price`).once('value');
            const oldPrice = oldSnap.val();
            if (oldPrice && parseFloat(oldPrice) !== data.price) {
              await database.ref('priceHistory').push({ productId: state.editingProductId, productName: name, oldPrice: parseFloat(oldPrice), newPrice: data.price, changedBy: 'admin', changedAt: nowISO() });
            }
            toast('Məhsul yeniləndi', 'success');
          } else {
            data.createdAt = nowISO(); data.createdBy = 'admin';
            const newRef = database.ref('products').push();
            await newRef.set(data);
            toast(`Məhsul "${name}" əlavə edildi`, 'success');
          }
          resetForm();
        } catch(err) { toast('Xəta: ' + err.message, 'error'); }
      });
    }
    // PF Cancel
    const pfCancel = $('pf-cancel');
    if (pfCancel) pfCancel.addEventListener('click', resetForm);
    const pfDelete = $('pf-delete');
    if (pfDelete) pfDelete.addEventListener('click', () => { if (state.editingProductId) window.deleteProduct(state.editingProductId); });

    // Add product button
    const addBtn = $('add-product-btn');
    if (addBtn) addBtn.addEventListener('click', () => { resetForm(); const qrTab = document.querySelector('[data-page="qr-scanner"]'); if (qrTab) qrTab.click(); });

    // Product search/filter/sort
    const ps = $('product-search'); if (ps) ps.addEventListener('input', renderProducts);
    const pcf = $('product-category-filter'); if (pcf) pcf.addEventListener('change', renderProducts);
    const pso = $('product-sort'); if (pso) pso.addEventListener('change', renderProducts);

    // Select all
    const selAll = $('select-all-products');
    if (selAll) {
      selAll.addEventListener('change', function() {
        document.querySelectorAll('.product-cb').forEach(cb => {
          cb.checked = this.checked;
          if (this.checked) state.selectedProducts.add(cb.value);
          else state.selectedProducts.delete(cb.value);
        });
      });
    }

    // Bulk delete
    const bulkDel = $('bulk-delete-btn');
    if (bulkDel) {
      bulkDel.addEventListener('click', async () => {
        if (!state.selectedProducts.size) { toast('Heç bir məhsul seçilməyib', 'warning'); return; }
        if (!confirm(`${state.selectedProducts.size} məhsulu silmək istəyirsiniz?`)) return;
        if (!database) return;
        const updates = {};
        state.selectedProducts.forEach(id => { updates[`products/${id}`] = null; });
        await database.ref().update(updates);
        state.selectedProducts.clear();
        toast('Məhsullar silindi', 'success');
      });
    }

    // Order filters
    const os = $('order-search'); if (os) os.addEventListener('input', renderOrdersTable);
    const odf = $('order-date-filter'); if (odf) odf.addEventListener('change', renderOrdersTable);
    const osf = $('order-status-filter'); if (osf) osf.addEventListener('change', renderOrdersTable);

    // Order save/delete
    const saveBtn = $('order-save-changes');
    if (saveBtn) {
      saveBtn.addEventListener('click', async () => {
        if (!state.editingOrderId || !database) return;
        const total = state.editingOrderItems.reduce((s,i) => s + i.price * i.qty, 0);
        try {
          await database.ref(`orders/${state.editingOrderId}`).update({ items: state.editingOrderItems, totalPrice: total, totalItems: state.editingOrderItems.reduce((s,i) => s + i.qty, 0), updatedAt: nowISO() });
          toast('Sifariş yeniləndi', 'success');
          const modal = $('order-detail-modal'); if (modal) modal.classList.add('hidden');
        } catch(err) { toast('Xəta: ' + err.message, 'error'); }
      });
    }

    const delOrderBtn = $('order-delete-full');
    if (delOrderBtn) {
      delOrderBtn.addEventListener('click', async () => {
        if (!state.editingOrderId || !database || !confirm('Sifarişi silmək istəyirsiniz?')) return;
        try { await database.ref(`orders/${state.editingOrderId}`).remove(); toast('Sifariş silindi', 'success'); const modal = $('order-detail-modal'); if (modal) modal.classList.add('hidden'); }
        catch(err) { toast('Xəta: ' + err.message, 'error'); }
      });
    }

    const orderClose = $('order-detail-close');
    if (orderClose) orderClose.addEventListener('click', () => { const m = $('order-detail-modal'); if (m) m.classList.add('hidden'); });
    const orderModal = $('order-detail-modal');
    if (orderModal) { const bd = orderModal.querySelector('.modal-backdrop'); if (bd) bd.addEventListener('click', () => orderModal.classList.add('hidden')); }

    // Import
    const importBtn = $('import-btn');
    if (importBtn) importBtn.addEventListener('click', () => { const m = $('import-modal'); if (m) m.classList.remove('hidden'); });
    const importClose = $('import-modal-close');
    if (importClose) importClose.addEventListener('click', () => { const m = $('import-modal'); if (m) m.classList.add('hidden'); });
    const importModal = $('import-modal');
    if (importModal) { const bd = importModal.querySelector('.modal-backdrop'); if (bd) bd.addEventListener('click', () => importModal.classList.add('hidden')); }

    const importExec = $('import-execute');
    if (importExec) {
      importExec.addEventListener('click', async () => {
        if (!database) { toast('Firebase yoxdur', 'error'); return; }
        const file = $('import-file')?.files?.[0];
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
          if (data.productName) {
            data.price = parseFloat(data.price) || 0; data.stock = parseInt(data.stock) || 0;
            data.createdAt = nowISO(); data.updatedAt = nowISO();
            await database.ref('products').push(data);
            imported++;
          }
        }
        toast(`${imported} məhsul import edildi`, 'success');
        const m = $('import-modal'); if (m) m.classList.add('hidden');
      });
    }

    // Export buttons
    const exportCsv = $('export-csv');
    if (exportCsv) exportCsv.addEventListener('click', () => {
      const h = ['productName','price','stock','status'];
      const r = state.productsArr.map(p => [p.productName||p.name, p.price, p.stock||'', p.status||'active'].map(v => `"${String(v).replace(/"/g,'""')}"`).join(','));
      downloadCSV([h.join(','),...r].join('\n'), 'products.csv');
    });

    const exportExcel = $('export-excel');
    if (exportExcel) exportExcel.addEventListener('click', () => {
      const r = state.productsArr.map(p => [p.productName||p.name, p.price, p.stock||'', p.status||'active'].join(','));
      downloadCSV('\uFEFFqrCode,productName,price,category,stock,barcode,status\n' + r.join('\n'), 'products.xlsx');
    });

    const exportPdf = $('export-pdf');
    if (exportPdf) exportPdf.addEventListener('click', () => {
      const rows = state.productsArr.map(p => `<tr><td>${esc(p.qrCode||p.id)}</td><td>${esc(p.productName||p.name)}</td><td>${fp(p.price)}</td><td>${esc(p.category||'')}</td><td>${p.stock||0}</td></tr>`).join('');
      const w = window.open('', '_blank');
      w.document.write(`<html><head><title>GASHAM - Məhsullar</title><style>body{font-family:sans-serif;padding:20px}table{width:100%;border-collapse:collapse}td,th{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f5f5f7}h2{text-align:center;color:#1d1d1f}</style></head><body><h2>GASHAM - Məhsul Siyahısı</h2><p style="text-align:right;color:#666">${new Date().toLocaleDateString('az-AZ')}</p><table><thead><tr><th>Ad</th><th>Qiymət</th><th>Stok</th></tr></thead><tbody>${rows}</tbody></table></body></html>`);
      w.document.close();
    });

    // Orders export
    const oecsv = $('orders-export-csv');
    if (oecsv) oecsv.addEventListener('click', () => {
      const r = state.ordersArr.map(o => [o.orderNumber, fd(o.createdAt), ft(o.createdAt), (o.items||[]).reduce((s,i) => s + i.qty, 0), (o.totalPrice||o.total||0).toFixed(2), o.status||'active'].join(','));
      downloadCSV('\uFEFFSifariş #,Tarix,Saat,Say,Cəmi,Status\n' + r.join('\n'), 'orders.csv');
    });
    const oeexcel = $('orders-export-excel');
    if (oeexcel) oeexcel.addEventListener('click', () => {
      const r = state.ordersArr.map(o => [o.orderNumber, fd(o.createdAt), ft(o.createdAt), (o.items||[]).reduce((s,i) => s + i.qty, 0), (o.totalPrice||o.total||0).toFixed(2), o.status||'active'].join(','));
      downloadCSV('\uFEFFSifariş #,Tarix,Saat,Say,Cəmi,Status\n' + r.join('\n'), 'orders.xlsx');
    });
    const oepdf = $('orders-export-pdf');
    if (oepdf) oepdf.addEventListener('click', () => {
      const rows = state.ordersArr.map(o => `<tr><td>#${o.orderNumber}</td><td>${fd(o.createdAt)}</td><td>${ft(o.createdAt)}</td><td>${(o.items||[]).reduce((s,i) => s + i.qty, 0)}</td><td>${fp(o.totalPrice||o.total)}</td><td>${o.status||'active'}</td></tr>`).join('');
      const w = window.open('', '_blank');
      w.document.write(`<html><head><title>GASHAM - Sifarişlər</title><style>body{font-family:sans-serif;padding:20px}table{width:100%;border-collapse:collapse}td,th{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f5f5f7}h2{text-align:center}</style></head><body><h2>GASHAM - Bütün Sifarişlər</h2><table><thead><tr><th>#</th><th>Tarix</th><td>Saat</td><th>Say</th><th>Cəmi</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table></body></html>`);
      w.document.close();
    });
    const oeprint = $('orders-print');
    if (oeprint) oeprint.addEventListener('click', () => {
      const rows = state.ordersArr.slice(0,50).map(o => `<tr><td>#${o.orderNumber}</td><td>${fd(o.createdAt)} ${ft(o.createdAt)}</td><td>${(o.items||[]).reduce((s,i) => s + i.qty, 0)}</td><td>${fp(o.totalPrice||o.total)}</td></tr>`).join('');
      const w = window.open('', '_blank');
      w.document.write(`<html><head><title>GASHAM - Çap</title><style>body{font-family:sans-serif;padding:20px}table{width:100%;border-collapse:collapse}td,th{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f5f5f7}h2{text-align:center}</style></head><body><h2>GASHAM</h2><table><thead><tr><th>#</th><th>Tarix</th><th>Say</th><th>Cəmi</th></tr></thead><tbody>${rows}</tbody></table></body></html>`);
      w.document.close();
    });

    // QR Scanner


    function stopAdminScan() {
      state.scanning = false;
      if (state.scanner) { try { state.scanner.stop(); state.scanner.clear(); } catch(e) {} state.scanner = null; }
    }

    // Auto-start scanner when QR page is active
    function startAdminScanner() {
      if (state.scanning) return;
      try {
        state.scanner = new Html5Qrcode('admin-scanner-element');
        state.scanner.start({ facingMode: 'environment' }, { fps: 30, qrbox: { width: 240, height: 240 } },
          function(text) {
            stopAdminScan();
            var qrId = text.trim();
            var existing = state.productsArr.find(function(p) { return (p.qrCode || p.qrId || p.id) === qrId; });
            if (existing) { window.editProduct(existing.id); toast('Mövcud məhsul: ' + (existing.productName || existing.name), 'info'); }
            else { resetForm(); toast('QR oxundu - yeni məhsul əlavə edin', 'success'); var nf = $('pf-name'); if (nf) nf.focus(); }
            if (navigator.vibrate) navigator.vibrate(100);
          }, function() {});
        state.scanning = true;
      } catch(err) { toast('Kamera xətası: ' + err.message, 'error'); }
    }

    // Start scanner when QR page becomes active
    document.querySelectorAll('.nav-item[data-page="qr-scanner"]').forEach(function(item) {
      item.addEventListener('click', function() {
        setTimeout(startAdminScanner, 300);
      });
    });

    const flashBtn = $('flash-btn');
    if (flashBtn) {
          flashBtn.addEventListener('click', async () => {
        const v = document.querySelector('#admin-scanner-element video');
        if (!v) return;
        const t = v.srcObject?.getVideoTracks()[0];
        if (!t) return;
        if (!t.getCapabilities().torch) { toast('Flash dəstəklənmir', 'warning'); return; }
        state.flashOn = !state.flashOn;
        await t.applyConstraints({ advanced: [{ torch: state.flashOn }] });
        flashBtn.style.color = state.flashOn ? '#ff0' : '';
      });
    }

    const camSwitch = $('cam-btn');
    if (camSwitch) {
          camSwitch.addEventListener('click', async () => {
        if (!state.scanner) return;
        try {
          await state.scanner.stop();
          const isEnv = state.cameraId === 'environment';
          state.cameraId = isEnv ? 'user' : 'environment';
          await state.scanner.start({ facingMode: state.cameraId }, { fps: 30, qrbox: { width: 250, height: 250 } },
            text => {
              stopAdminScan();
              const qrId = text.trim();
              const existing = state.productsArr.find(p => (p.qrCode || p.qrId || p.id) === qrId);
              if (existing) { window.editProduct(existing.id); toast('Mövcud məhsul: ' + (existing.productName || existing.name), 'info'); }
              else { resetForm(); toast('QR oxundu - yeni məhsul əlavə edin', 'success'); const nf = $('pf-name'); if (nf) nf.focus(); }
              if (navigator.vibrate) navigator.vibrate(100);
            }, () => {});
          state.scanning = true;
        } catch(err) { toast('Kamera xətası', 'error'); }
      });
    }

    // ==================== FINAL INIT ====================

    // Hide loading
    const loading = $('loading-screen');
    if (loading) {
      setTimeout(() => {
        loading.classList.add('fade-out');
        setTimeout(() => { loading.style.display = 'none'; }, 500);
      }, 500);
    }

    // Dashboard aç
    showDashboard();
    setTimeout(initData, 600);
  });

  function downloadCSV(c, f) {
    const b = new Blob([c], {type:'text/csv;charset=utf-8;'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(b); a.download = f;
    a.click(); URL.revokeObjectURL(a.href);
  }
})();
