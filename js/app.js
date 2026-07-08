/**
 * GASHAM - User Panel Application
 * QR POS Sistemi - İstifadəçi paneli əsas məntiqi
 */

// ============================================
// UTILITY FUNCTIONS
// ============================================

/** Toast bildirişi göstər */
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || 'ℹ'}</span>
    <span class="toast-message">${message}</span>
    <button class="toast-close">&times;</button>
  `;
  toast.querySelector('.toast-close').onclick = () => removeToast(toast);
  container.appendChild(toast);
  setTimeout(() => removeToast(toast), 4000);
}

function removeToast(toast) {
  if (toast.classList.contains('removing')) return;
  toast.classList.add('removing');
  setTimeout(() => toast.remove(), 300);
}

/** Tarixi formatla */
function formatDate(date) {
  const d = date instanceof Date ? date : date.toDate();
  return d.toLocaleDateString('az-AZ', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** Saati formatla */
function formatTime(date) {
  const d = date instanceof Date ? date : date.toDate();
  return d.toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit' });
}

/** Qiyməti formatla */
function formatPrice(price) {
  return `${parseFloat(price).toFixed(2)} ₼`;
}

// ============================================
// STATE MANAGEMENT
// ============================================

const state = {
  currentOrder: null,
  orders: [],
  products: {},
  scanner: null,
  isScanning: false,
  cameraId: null,
  flashOn: false,
  currentTab: 'qr',
  searchResults: []
};

// ============================================
// DOM ELEMENTS
// ============================================

const $ = id => document.getElementById(id);
const dom = {
  loading: $('loading-screen'),
  app: $('app'),
  themeToggle: $('theme-toggle'),
  newOrderBtn: $('new-order-btn'),
  ordersContainer: $('orders-container'),
  ordersList: $('orders-list'),
  ordersCount: $('orders-count'),
  activeSummary: $('active-order-summary'),
  orderNumber: $('order-number-display'),
  orderTime: $('order-time-display'),
  orderTotal: $('order-total-display'),
  scannerModal: $('scanner-modal'),
  scannerClose: $('scanner-close'),
  scannerVideo: $('scanner-video'),
  flashToggle: $('flash-toggle'),
  cameraSwitch: $('camera-switch'),
  orderModal: $('order-modal'),
  orderModalTitle: $('order-modal-title'),
  orderModalBody: $('order-modal-body'),
  orderModalClose: $('order-modal-close'),
  printOrderBtn: $('print-order-btn'),
  pdfOrderBtn: $('pdf-order-btn'),
  closeOrderBtn: $('close-order-btn'),
  searchToggle: $('search-toggle-btn'),
  searchModal: $('search-modal'),
  searchClose: $('search-close'),
  searchInput: $('search-input'),
  searchExecute: $('search-execute'),
  searchResults: $('search-results'),
  searchTabs: document.querySelectorAll('.search-tab'),
  ordersBtn: $('orders-btn')
};

// ============================================
// THEME MANAGEMENT
// ============================================

function initTheme() {
  const saved = localStorage.getItem('gasham-theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('gasham-theme', next);
  showToast(`${next === 'dark' ? 'Qaranlıq' : 'İşıqlı'} rejim aktivdir`, 'info');
}

// ============================================
// LOADING SCREEN
// ============================================

function hideLoading() {
  dom.loading.classList.add('fade-out');
  dom.app.classList.remove('hidden');
  setTimeout(() => { dom.loading.style.display = 'none'; }, 600);
}

// ============================================
// QR SCANNER
// ============================================

async function startScanner() {
  dom.scannerModal.classList.remove('hidden');
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 640 } }
    });
    dom.scannerVideo.srcObject = stream;
    await dom.scannerVideo.play();
    state.isScanning = true;
    scanLoop();
  } catch (err) {
    showToast('Kamera açılmadı: ' + err.message, 'error');
    dom.scannerModal.classList.add('hidden');
  }
}

function scanLoop() {
  if (!state.isScanning) return;
  const canvas = document.createElement('canvas');
  const video = dom.scannerVideo;
  if (video.readyState >= 2) {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    try {
      const code = jsQR(imageData.data, imageData.width, imageData.height);
      if (code) {
        handleQRResult(code.data);
        return;
      }
    } catch (e) { /* continue */ }
  }
  requestAnimationFrame(scanLoop);
}

function handleQRResult(data) {
  state.isScanning = false;
  stopCamera();
  dom.scannerModal.classList.add('hidden');
  const qrId = data.trim();
  addProductToOrder(qrId);
}

function stopCamera() {
  const stream = dom.scannerVideo.srcObject;
  if (stream) {
    stream.getTracks().forEach(t => t.stop());
    dom.scannerVideo.srcObject = null;
  }
}

function toggleFlash() {
  const stream = dom.scannerVideo.srcObject;
  if (!stream) return;
  const track = stream.getVideoTracks()[0];
  if (!track) return;
  const capabilities = track.getCapabilities();
  if (!capabilities.torch) {
    showToast('Flash dəstəklənmir', 'warning');
    return;
  }
  state.flashOn = !state.flashOn;
  track.applyConstraints({ advanced: [{ torch: state.flashOn }] });
  dom.flashToggle.style.color = state.flashOn ? '#ff0' : '';
}

async function switchCamera() {
  const stream = dom.scannerVideo.srcObject;
  if (stream) stream.getTracks().forEach(t => t.stop());
  state.cameraId = state.cameraId === 'environment' ? 'user' : 'environment';
  try {
    const newStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: state.cameraId, width: { ideal: 640 }, height: { ideal: 640 } }
    });
    dom.scannerVideo.srcObject = newStream;
    await dom.scannerVideo.play();
    state.flashOn = false;
    dom.flashToggle.style.color = '';
  } catch (err) {
    showToast('Kamera dəyişdirilə bilmədi', 'error');
  }
}

// ============================================
// PRODUCT & ORDER MANAGEMENT
// ============================================

async function loadProduct(qrId) {
  if (state.products[qrId]) return state.products[qrId];
  try {
    const doc = await db.collection('products').doc(qrId).get();
    if (doc.exists && doc.data().status === 'active') {
      state.products[qrId] = { id: doc.id, ...doc.data() };
      return state.products[qrId];
    }
    return null;
  } catch (err) {
    console.error('Product load error:', err);
    return null;
  }
}

async function addProductToOrder(qrId) {
  const product = await loadProduct(qrId);
  if (!product) {
    showToast('Məhsul tapılmadı və ya deaktivdir', 'error');
    return;
  }

  if (!state.currentOrder) {
    await createNewOrder();
  }

  const items = state.currentOrder.items || [];
  const existing = items.find(i => i.qrId === qrId);
  if (existing) {
    existing.qty = (existing.qty || 1) + 1;
    showToast(`${product.name} sayı artırıldı (${existing.qty})`, 'success');
  } else {
    items.push({
      qrId: product.id,
      name: product.name,
      price: parseFloat(product.price),
      qty: 1
    });
    showToast(`${product.name} sifarişə əlavə edildi`, 'success');
  }

  state.currentOrder.items = items;
  state.currentOrder.total = items.reduce((sum, i) => sum + i.price * i.qty, 0);

  await db.collection('orders').doc(state.currentOrder.id).update({
    items: items,
    total: state.currentOrder.total,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  });

  updateOrderSummary();
  renderOrders();
}

async function createNewOrder() {
  const orderRef = db.collection('orders').doc();
  const orderNum = await getNextOrderNumber();
  state.currentOrder = {
    id: orderRef.id,
    orderNumber: orderNum,
    items: [],
    total: 0,
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date()
  };
  await orderRef.set({
    orderNumber: orderNum,
    items: [],
    total: 0,
    status: 'active',
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  showToast(`Yeni sifariş #${orderNum} yaradıldı`, 'success');
}

async function getNextOrderNumber() {
  try {
    const snapshot = await db.collection('orders')
      .orderBy('orderNumber', 'desc')
      .limit(1)
      .get();
    if (snapshot.empty) return 1;
    return (snapshot.docs[0].data().orderNumber || 0) + 1;
  } catch {
    return Date.now() % 10000;
  }
}

function updateOrderSummary() {
  if (!state.currentOrder || !state.currentOrder.items?.length) {
    dom.activeSummary.classList.add('hidden');
    return;
  }
  dom.activeSummary.classList.remove('hidden');
  dom.orderNumber.textContent = `Sifariş #${state.currentOrder.orderNumber}`;
  dom.orderTime.textContent = formatTime(state.currentOrder.createdAt);
  dom.orderTotal.textContent = formatPrice(state.currentOrder.total);
}

// ============================================
// REALTIME ORDERS
// ============================================

function subscribeOrders() {
  db.collection('orders')
    .orderBy('createdAt', 'desc')
    .onSnapshot(snapshot => {
      snapshot.docChanges().forEach(change => {
        if (change.type === 'modified' || change.type === 'added') {
          const data = change.doc.data();
          const idx = state.orders.findIndex(o => o.id === change.doc.id);
          const order = { id: change.doc.id, ...data };
          if (idx >= 0) {
            state.orders[idx] = order;
          } else {
            state.orders.unshift(order);
          }
          if (state.currentOrder && state.currentOrder.id === change.doc.id) {
            state.currentOrder = order;
            updateOrderSummary();
          }
        }
        if (change.type === 'removed') {
          state.orders = state.orders.filter(o => o.id !== change.doc.id);
        }
      });
      renderOrders();
    }, err => {
      console.error('Orders subscription error:', err);
      showToast('Bağlantı xətası', 'error');
    });
}

// ============================================
// RENDER ORDERS
// ============================================

function renderOrders() {
  const list = dom.ordersList;
  const count = dom.ordersCount;

  if (!state.orders.length) {
    list.innerHTML = `
      <div class="empty-state">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" opacity="0.3">
          <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
          <line x1="3" y1="6" x2="21" y2="6"/>
          <path d="M16 10a4 4 0 0 1-8 0"/>
        </svg>
        <p>Hələ heç bir sifariş yoxdur</p>
        <p class="sub">Yeni sifariş yaratmaq üçün düyməyə basın</p>
      </div>`;
    count.textContent = '0';
    return;
  }

  count.textContent = state.orders.length;

  list.innerHTML = state.orders
    .filter(o => o.status === 'active' || o.status === 'completed')
    .map(order => {
      const items = (order.items || []).map(item =>
        `<div class="order-item">
          <span class="order-item-name">${escapeHtml(item.name)}</span>
          <span class="order-item-qty">x${item.qty}</span>
          <span class="order-item-price">${formatPrice(item.price * item.qty)}</span>
        </div>`
      ).join('');

      const createdDate = order.createdAt?.toDate ? order.createdAt.toDate() : new Date();
      const completed = order.status === 'completed';

      return `
        <div class="order-card">
          <div class="order-card-header">
            <div>
              <div class="order-card-number">Sifariş #${order.orderNumber}</div>
              <div class="order-card-time">${formatDate(createdDate)} ${formatTime(createdDate)}</div>
            </div>
            <div class="order-card-total">${formatPrice(order.total || 0)}</div>
          </div>
          <div class="order-card-items">${items}</div>
          <div class="order-card-footer">
            ${completed ? '' : `<button class="btn btn-sm btn-outline" onclick="openOrderDetail('${order.id}')">Detallar</button>`}
            ${completed ? '' : `<button class="btn btn-sm btn-outline" onclick="finishOrder('${order.id}')">Bitir</button>`}
            ${completed ? `<button class="btn btn-sm btn-outline" onclick="reopenOrder('${order.id}')">Yenidən aç</button>` : ''}
            <button class="btn btn-sm btn-outline" onclick="printOrder('${order.id}')">Çap et</button>
            <button class="btn btn-sm btn-danger" onclick="deleteOrder('${order.id}')">Sil</button>
          </div>
        </div>`;
    }).join('');
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ============================================
// ORDER ACTIONS
// ============================================

async function openOrderDetail(orderId) {
  const order = state.orders.find(o => o.id === orderId);
  if (!order) return;
  dom.orderModalTitle.textContent = `Sifariş #${order.orderNumber}`;
  const items = (order.items || []).map(item => `
    <div class="order-item">
      <span class="order-item-name">${escapeHtml(item.name)}</span>
      <div>
        <button class="btn btn-sm btn-outline" onclick="changeItemQty('${orderId}','${item.qrId}',-1)">−</button>
        <span class="order-item-qty"> ${item.qty} </span>
        <button class="btn btn-sm btn-outline" onclick="changeItemQty('${orderId}','${item.qrId}',1)">+</button>
      </div>
      <span class="order-item-price">${formatPrice(item.price * item.qty)}</span>
    </div>
  `).join('');
  dom.orderModalBody.innerHTML = `
    <div class="order-card-items">${items}</div>
    <div style="margin-top:16px;text-align:right;font-size:20px;font-weight:800;color:var(--accent)">
      Cəmi: ${formatPrice(order.total || 0)}
    </div>
  `;
  dom.orderModal.classList.remove('hidden');
  dom.closeOrderBtn.onclick = () => finishOrder(orderId);
}

async function changeItemQty(orderId, qrId, delta) {
  const order = state.orders.find(o => o.id === orderId);
  if (!order) return;
  const item = order.items.find(i => i.qrId === qrId);
  if (!item) return;
  item.qty = Math.max(0, (item.qty || 1) + delta);
  if (item.qty === 0) {
    order.items = order.items.filter(i => i.qrId !== qrId);
  }
  order.total = order.items.reduce((sum, i) => sum + i.price * i.qty, 0);
  await db.collection('orders').doc(orderId).update({
    items: order.items,
    total: order.total,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  openOrderDetail(orderId);
}

async function finishOrder(orderId) {
  await db.collection('orders').doc(orderId).update({
    status: 'completed',
    completedAt: firebase.firestore.FieldValue.serverTimestamp(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  if (state.currentOrder && state.currentOrder.id === orderId) {
    state.currentOrder = null;
    updateOrderSummary();
  }
  dom.orderModal.classList.add('hidden');
  showToast('Sifariş tamamlandı', 'success');
}

async function reopenOrder(orderId) {
  await db.collection('orders').doc(orderId).update({
    status: 'active',
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  showToast('Sifariş yenidən açıldı', 'info');
}

async function deleteOrder(orderId) {
  if (!confirm('Sifarişi silmək istədiyinizə əminsiniz?')) return;
  await db.collection('orders').doc(orderId).delete();
  if (state.currentOrder && state.currentOrder.id === orderId) {
    state.currentOrder = null;
    updateOrderSummary();
  }
  dom.orderModal.classList.add('hidden');
  showToast('Sifariş silindi', 'success');
}

function printOrder(orderId) {
  const order = state.orders.find(o => o.id === orderId);
  if (!order) return;
  const win = window.open('', '_blank');
  const items = (order.items || []).map(i =>
    `<tr><td>${escapeHtml(i.name)}</td><td>${i.qty}</td><td>${formatPrice(i.price)}</td><td>${formatPrice(i.price * i.qty)}</td></tr>`
  ).join('');
  const date = order.createdAt?.toDate ? order.createdAt.toDate() : new Date();
  win.document.write(`
    <html><head><title>Sifariş #${order.orderNumber}</title>
    <style>body{font-family:sans-serif;padding:20px}table{width:100%;border-collapse:collapse}td,th{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f5f5f5}h2{text-align:center}</style>
    </head><body>
    <h2>GASHAM - Sifariş #${order.orderNumber}</h2>
    <p>Tarix: ${formatDate(date)} ${formatTime(date)}</p>
    <table><thead><tr><th>Məhsul</th><th>Say</th><th>Qiymət</th><th>Cəm</th></tr></thead><tbody>${items}</tbody></table>
    <h3 style="text-align:right">Cəmi: ${formatPrice(order.total || 0)}</h3>
    </body></html>
  `);
  win.document.close();
  win.print();
}

// ============================================
// SEARCH
// ============================================

dom.searchTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    dom.searchTabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    state.currentTab = tab.dataset.type;
  });
});

dom.searchExecute.addEventListener('click', async () => {
  const query = dom.searchInput.value.trim();
  if (!query) return;
  dom.searchResults.innerHTML = '<p class="muted">Axtarılır...</p>';
  try {
    let results = [];
    if (state.currentTab === 'qr') {
      const doc = await db.collection('products').doc(query).get();
      if (doc.exists) results = [{ id: doc.id, ...doc.data() }];
    } else {
      const field = state.currentTab === 'name' ? 'name' : 'category';
      const snapshot = await db.collection('products')
        .where(field, '>=', query)
        .where(field, '<=', query + '\uf8ff')
        .limit(20).get();
      results = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    }
    if (!results.length) {
      dom.searchResults.innerHTML = '<p class="muted">Nəticə tapılmadı</p>';
      return;
    }
    dom.searchResults.innerHTML = results.map(p => `
      <div class="search-result-item">
        <div>
          <strong>${escapeHtml(p.name)}</strong>
          <span style="font-size:13px;color:var(--text-secondary)">${p.category || ''}</span>
        </div>
        <div>
          <span style="font-weight:700">${formatPrice(p.price || 0)}</span>
          <button class="btn btn-sm btn-primary" onclick="addProductToOrder('${p.id}')">Əlavə et</button>
        </div>
      </div>
    `).join('');
  } catch (err) {
    dom.searchResults.innerHTML = '<p class="muted">Xəta baş verdi</p>';
    showToast('Axtarış xətası', 'error');
  }
});

// ============================================
// EVENT LISTENERS
// ============================================

// Theme toggle
dom.themeToggle.addEventListener('click', toggleTheme);

// New order
dom.newOrderBtn.addEventListener('click', startScanner);

// Scanner close
dom.scannerClose.addEventListener('click', () => {
  state.isScanning = false;
  stopCamera();
  dom.scannerModal.classList.add('hidden');
});
dom.scannerModal.querySelector('.modal-backdrop').addEventListener('click', () => {
  state.isScanning = false;
  stopCamera();
  dom.scannerModal.classList.add('hidden');
});

// Flash toggle
dom.flashToggle.addEventListener('click', toggleFlash);

// Camera switch
dom.cameraSwitch.addEventListener('click', switchCamera);

// Order modal close
dom.orderModalClose.addEventListener('click', () => dom.orderModal.classList.add('hidden'));
dom.orderModal.querySelector('.modal-backdrop').addEventListener('click', () => dom.orderModal.classList.add('hidden'));

// Print
dom.printOrderBtn.addEventListener('click', () => {
  const id = dom.orderModalTitle.textContent.replace('Sifariş #', '');
  const order = state.orders.find(o => o.orderNumber == id);
  if (order) printOrder(order.id);
});

// PDF
dom.pdfOrderBtn.addEventListener('click', () => {
  const id = dom.orderModalTitle.textContent.replace('Sifariş #', '');
  const order = state.orders.find(o => o.orderNumber == id);
  if (order) window.print();
});

// Search toggle
dom.searchToggle.addEventListener('click', () => dom.searchModal.classList.remove('hidden'));
dom.searchClose.addEventListener('click', () => dom.searchModal.classList.add('hidden'));
dom.searchModal.querySelector('.modal-backdrop').addEventListener('click', () => dom.searchModal.classList.add('hidden'));

// Orders button scroll
dom.ordersBtn.addEventListener('click', () => {
  dom.ordersContainer.scrollIntoView({ behavior: 'smooth' });
});

// Enter key for search
dom.searchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') dom.searchExecute.click();
});

// ============================================
// PWA - SERVICE WORKER REGISTRATION
// ============================================

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js')
      .then(() => console.log('SW registered'))
      .catch(err => console.warn('SW registration failed:', err));
  });
}

// ============================================
// INITIALIZATION
// ============================================

async function init() {
  initTheme();
  subscribeOrders();
  // Loading ekranını gizlət
  setTimeout(hideLoading, 800);
}

// jsQR library - inline decoder for QR scanning
// Since we're using the camera-based approach with jsQR
function loadJsqr() {
  return new Promise((resolve) => {
    if (typeof jsQR !== 'undefined') { resolve(); return; }
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/jsqr@1.4.0/dist/jsQR.js';
    script.onload = resolve;
    document.head.appendChild(script);
  });
}

// Start app
document.addEventListener('DOMContentLoaded', () => {
  loadJsqr().then(init);
});
