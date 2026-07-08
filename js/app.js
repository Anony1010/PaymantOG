/**
 * GASHAM - User Panel v5
 * Firebase Realtime Database - Auto-save orders on scan
 */

const state = {
  cart: [],
  orders: [],
  products: {},
  productsArr: [],
  scanner: null,
  scanning: false,
  audioCtx: null,
  currentOrderId: null,  // Firebase key for pending order
  currentOrderNum: null  // Order number for pending order
};

const $ = id => document.getElementById(id);

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
function fd(d) { return new Date(d).toLocaleDateString('az-AZ', { day: '2-digit', month: 'short', year: 'numeric' }); }
function ft(d) { return new Date(d).toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit' }); }
function now() { return new Date().toISOString(); }

// ============================================
// BEEP
// ============================================

var beepAudio = new Audio('assets/scan-beep.mp3');
beepAudio.preload = 'auto';
function playBeep() {
  try {
    var clone = beepAudio.cloneNode();
    clone.volume = 0.5;
    clone.play().catch(function(){});
  } catch(e) {}
}

// ============================================
// SCAN SUCCESS OVERLAY
// ============================================

function showScanSuccess() {
  const ov = $('scan-overlay');
  ov.classList.remove('hidden', 'fade-out');
  playBeep();
  if (navigator.vibrate) navigator.vibrate(100);
  setTimeout(() => {
    ov.classList.add('fade-out');
    setTimeout(() => { ov.classList.add('hidden'); ov.classList.remove('fade-out'); }, 400);
  }, 650);
}

// ============================================
// THEME
// ============================================

var themeBtn = $('theme-btn');
if (themeBtn) {
  themeBtn.addEventListener('click', function() {
    var cur = document.documentElement.getAttribute('data-theme');
    var next = cur === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('gasham-theme', next);
  });
}

// ============================================
// PENDING ORDER (Firebase auto-save)
// ============================================

function subscribeToCurrentOrder() {
  if (!state.currentOrderId) return;
  database.ref('orders/' + state.currentOrderId).on('value', snap => {
    const order = snap.val();
    if (!order) return;
    state.cart = (order.items || []).map(item => ({ ...item }));
    renderCart();
  });
}

function unsubscribeFromCurrentOrder() {
  if (state.currentOrderId) {
    database.ref('orders/' + state.currentOrderId).off();
  }
}

async function createPendingOrder() {
  if (!database) { toast('Firebase bağlantısı yoxdur', 'error'); return null; }

  // Clean up any previous pending order subscription
  unsubscribeFromCurrentOrder();

  try {
    // Get next order number
    const snap = await database.ref('orders').orderByChild('orderNumber').limitToLast(1).once('value');
    let nextNum = 1;
    snap.forEach(child => { nextNum = (child.val().orderNumber || 0) + 1; });

    const orderRef = database.ref('orders').push();
    state.currentOrderId = orderRef.key;
    state.currentOrderNum = nextNum;

    await orderRef.set({
      orderNumber: nextNum,
      items: [],
      totalPrice: 0,
      totalItems: 0,
      status: 'Gözləmədə',
      createdAt: now(),
      updatedAt: now()
    });

    // Subscribe to this order for realtime cart updates
    subscribeToCurrentOrder();
    return state.currentOrderId;
  } catch (err) {
    toast('Sifariş yaradılmadı: ' + err.message, 'error');
    return null;
  }
}

async function addItemToPendingOrder(product) {
  if (!state.currentOrderId) {
    toast('Əvvəlcə Yeni Sifariş yaradın', 'warning');
    return;
  }

  const name = product.productName || product.name || 'Məhsul';
  const price = parseFloat(product.price || 0);

  try {
    const snap = await database.ref('orders/' + state.currentOrderId + '/items').once('value');
    let items = snap.val() || [];

    const existingIdx = items.findIndex(i => i.id === product.id);
    if (existingIdx >= 0) {
      items[existingIdx].qty = (items[existingIdx].qty || 1) + 1;
      toast(name + ' sayı artırıldı (' + items[existingIdx].qty + ')', 'success');
    } else {
      items.push({ id: product.id, name, price, qty: 1 });
      toast(name + ' əlavə edildi', 'success');
    }

    const totalItems = items.reduce((s, i) => s + i.qty, 0);
    const totalPrice = items.reduce((s, i) => s + i.price * i.qty, 0);

    await database.ref('orders/' + state.currentOrderId).update({
      items: items,
      totalItems: totalItems,
      totalPrice: totalPrice,
      updatedAt: now()
    });

    // Directly update local cart for immediate display
    state.cart = items.map(function(i) { return { id: i.id, name: i.name, price: i.price, qty: i.qty }; });
    renderCart();

    // Show success overlay after save
    showScanSuccess();
  } catch (err) {
    toast('Xəta: ' + err.message, 'error');
  }
}

// ============================================
// QR SCANNER
// ============================================

async function startScanner() {
  $('scanner-modal').classList.remove('hidden');
  try {
    if (state.scanner) { await state.scanner.stop(); state.scanner.clear(); }
    state.scanner = new Html5Qrcode('scanner-el');
    await state.scanner.start(
      { facingMode: 'environment' },
      { fps: 30, qrbox: { width: 250, height: 250 },
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE, Html5QrcodeSupportedFormats.CODE_128, Html5QrcodeSupportedFormats.CODE_39, Html5QrcodeSupportedFormats.EAN_8, Html5QrcodeSupportedFormats.EAN_13, Html5QrcodeSupportedFormats.UPC_A, Html5QrcodeSupportedFormats.UPC_E, Html5QrcodeSupportedFormats.PDF_417, Html5QrcodeSupportedFormats.DATA_MATRIX, Html5QrcodeSupportedFormats.AZTEC]
      },
      text => {
        // Handle scan asynchronously but catch errors
        Promise.resolve(handleCode(text.trim())).catch(function(err){console.error(err);});
        // Pause camera for 2 seconds to prevent double-scan
        try { state.scanner.pause(); } catch(e) {}
        setTimeout(function() { try { state.scanner.resume(); } catch(e) {} }, 2000);
      },
      () => {}
    );
    state.scanning = true;
  } catch (err) {
    toast('Kamera açılmadı: ' + err.message, 'error');
    $('scanner-modal').classList.add('hidden');
  }
}

function stopScanner() {
  state.scanning = false;
  if (state.scanner) { try { state.scanner.stop(); state.scanner.clear(); } catch(e) {} }
}

// ============================================
// HANDLE SCANNED CODE
// ============================================

async function handleCode(code) {
  if (!database) { toast('Firebase bağlantısı yoxdur', 'error'); return; }
  // Ensure we have a pending order
  if (!state.currentOrderId) {
    await createPendingOrder();
    if (!state.currentOrderId) return;
  }
  try {
    // First search in local (realtime cached) products
    var found = state.productsArr.find(function(p) { return (p.qrCode === code || p.qrId === code || p.id === code) && p.status !== 'inactive'; });
    if (found) { await addItemToPendingOrder(found); return; }

    // Fallback: direct database read
    var snap = await database.ref('products/' + code).once('value');
    if (snap.val() && snap.val().status !== 'inactive') {
      await addItemToPendingOrder({ id: code, ...snap.val() });
      return;
    }
    // Fallback: search all products by qrCode
    var all = await database.ref('products').once('value');
    var products = all.val() || {};
    var entry = Object.entries(products).find(function(e) { return (e[1].qrCode === code || e[1].qrId === code) && e[1].status !== 'inactive'; });
    if (entry) { await addItemToPendingOrder({ id: entry[0], ...entry[1] }); return; }
    toast('Məhsul tapılmadı', 'error');
  } catch(err) { toast('Xəta: ' + err.message, 'error'); }
}

// ============================================
// CART (rendered from Firebase subscription)
// ============================================

function changeQty(id, delta) {
  if (!state.currentOrderId) { toast('Sifariş yoxdur', 'warning'); return; }
  database.ref('orders/' + state.currentOrderId + '/items').once('value').then(snap => {
    let items = snap.val() || [];
    const idx = items.findIndex(i => i.id === id);
    if (idx < 0) return;
    items[idx].qty = Math.max(0, (items[idx].qty || 1) + delta);
    if (items[idx].qty === 0) {
      items = items.filter(i => i.id !== id);
    }
    const totalItems = items.reduce((s, i) => s + i.qty, 0);
    const totalPrice = items.reduce((s, i) => s + i.price * i.qty, 0);
    return database.ref('orders/' + state.currentOrderId).update({
      items: items,
      totalItems: totalItems,
      totalPrice: totalPrice,
      updatedAt: now()
    });
  }).catch(function(err) { toast('Xəta: ' + err.message, 'error'); });
}

function renderCart() {
  const has = state.cart.length > 0;
  $('cart-section').classList.toggle('hidden', !has);
  var sp = $('cart-spacer'); if (sp) sp.classList.toggle('hidden', !has);
  if (!has) return;

  const total = state.cart.reduce((s, i) => s + i.price * i.qty, 0);
  const count = state.cart.reduce((s, i) => s + i.qty, 0);
  $('cart-badge').textContent = count;
  $('cart-count').textContent = count;

  $('cart-total').textContent = fp(total);

  $('cart-body').innerHTML = state.cart.map(item => `
    <div class="cart-item">
      <div class="cart-item-info">
        <span class="cart-item-name">${esc(item.name)}</span>
        <span class="cart-item-price">${fp(item.price)}</span>
      </div>
      <div class="cart-item-actions">
        <button class="btn-qty" onclick="changeQty('${item.id}', -1)">−</button>
        <span class="cart-item-qty">${item.qty}</span>
        <button class="btn-qty" onclick="changeQty('${item.id}', 1)">+</button>
        <span class="cart-item-total">${fp(item.price * item.qty)}</span>
      </div>
    </div>
  `).join('');
}

window.changeQty = changeQty;

// ============================================
// CONFIRM ORDER (finalize pending order)
// ============================================

$('confirm-btn').addEventListener('click', async () => {
  if (!state.currentOrderId) { toast('Sifariş yoxdur', 'warning'); return; }
  if (!state.cart.length) { toast('Sifariş boşdur', 'warning'); return; }

  const btn = $('confirm-btn');
  btn.disabled = true; btn.textContent = 'Təsdiqlənir...';

  try {
    await database.ref('orders/' + state.currentOrderId).update({
      status: 'Təsdiqlənib',
      updatedAt: now()
    });

    toast('Sifariş #' + state.currentOrderNum + ' təsdiqləndi!', 'success');

    // Clean up
    unsubscribeFromCurrentOrder();
    state.currentOrderId = null;
    state.currentOrderNum = null;
    state.cart = [];
    renderCart();

    btn.disabled = false; btn.textContent = 'Təsdiqlə';
  } catch (err) {
    toast('Xəta: ' + err.message, 'error');
    btn.disabled = false; btn.textContent = 'Təsdiqlə';
  }
});

// ============================================
// NEW ORDER BUTTON (create pending order + open scanner)
// ============================================

$('new-order-btn').addEventListener('click', async function() {
  // Resume AudioContext on user gesture (required for mobile)
  if (state.audioCtx && state.audioCtx.state === 'suspended') {
    state.audioCtx.resume().catch(function(){});
  }
  // Open scanner - order will be created automatically on first scan
  startScanner();
});

// ============================================
// CART EDIT - Continue scanning into existing order
// ============================================

var cartEditBtn = $('cart-edit-btn');
if (cartEditBtn) {
  cartEditBtn.addEventListener('click', function() {
    if (!state.currentOrderId) { toast('Sifariş yoxdur', 'warning'); return; }
    startScanner();
  });
}

// ============================================
// SCANNER CONTROLS
// ============================================

$('scanner-close').addEventListener('click', () => { stopScanner(); $('scanner-modal').classList.add('hidden'); });
$('scanner-modal').querySelector('.modal-backdrop')?.addEventListener('click', () => { stopScanner(); $('scanner-modal').classList.add('hidden'); });

$('cam-btn').addEventListener('click', async () => {
  if (!state.scanner) return;
  try {
    await state.scanner.stop();
    const isEnv = state.cameraId?.facingMode === 'environment';
    state.cameraId = { facingMode: isEnv ? 'user' : 'environment' };
    await state.scanner.start(state.cameraId, { fps: 30, qrbox: { width: 250, height: 250 } }, t => {
      Promise.resolve(handleCode(t.trim())).catch(function(err){console.error(err);});
      try { state.scanner.pause(); } catch(e) {}
      setTimeout(function() { try { state.scanner.resume(); } catch(e) {} }, 2000);
    }, () => {});
  } catch(err) { toast('Kamera dəyişmə xətası', 'error'); }
});

$('flash-btn').addEventListener('click', async () => {
  const v = document.querySelector('#scanner-el video'); if (!v) return;
  const t = v.srcObject?.getVideoTracks()[0]; if (!t) return;
  if (!t.getCapabilities().torch) { toast('Flash dəstəklənmir', 'warning'); return; }
  state.flashOn = !state.flashOn;
  await t.applyConstraints({ advanced: [{ torch: state.flashOn }] });
  $('flash-btn').style.color = state.flashOn ? '#ff0' : '';
});

// ============================================
// REALTIME ORDERS (history)
// ============================================

function subscribeRTDB() {
  if (!database) return;
  // Listen for products (realtime)
  database.ref('products').on('value', snap => {
    state.products = snap.val() || {};
    state.productsArr = Object.entries(state.products).map(([id, v]) => ({ id, ...v }));
  }, err => { console.warn('Products load error:', err.message); });

  // Listen for orders (history - only completed)
  database.ref('orders').orderByChild('orderNumber').on('value', snap => {
    const data = snap.val() || {};
    state.orders = Object.entries(data)
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => (b.orderNumber || 0) - (a.orderNumber || 0));
    renderHistory();
  });
}

function renderHistory() {
  const completed = state.orders.filter(o => o.status === 'Təsdiqlənib' || o.status === 'completed');
  $('hist-count').textContent = completed.length;

  if (!completed.length) {
    $('history-list').innerHTML = '';
    return;
  }

  $('history-list').innerHTML = completed.map(order => {
    const itemsCount = (order.items || []).reduce((s, i) => s + (i.qty || 0), 0);
    return `
      <div class="order-card" onclick="showReview('${order.id}')">
        <div class="order-card-header">
          <div>
            <div class="order-card-number">Sifariş #${order.orderNumber}</div>
            <div class="order-card-time">${fd(order.createdAt)} ${ft(order.createdAt)}</div>
          </div>
          <div class="order-card-total">${fp(order.totalPrice || order.total || 0)}</div>
        </div>
        <div class="order-card-meta">
          <span>${itemsCount} məhsul</span>
          <span class="order-card-status completed">${order.status}</span>
        </div>
      </div>`;
  }).join('');
}

// ============================================
// REVIEW MODAL
// ============================================

function showReview(orderId) {
  const order = state.orders.find(o => o.id === orderId);
  if (!order) return;

  $('review-title').textContent = 'Sifariş #' + order.orderNumber;
  const items = (order.items || []).map(item => `
    <div class="review-item">
      <div><strong>${esc(item.name)}</strong> <span class="review-item-qty">× ${item.qty}</span></div>
      <div class="review-item-amounts">
        <span class="review-item-unit">${fp(item.price)}</span>
        <span class="review-item-total">${fp(item.price * item.qty)}</span>
      </div>
    </div>
  `).join('');

  $('review-body').innerHTML = `
    <div class="review-meta">
      <span>Tarix: ${fd(order.createdAt)} ${ft(order.createdAt)}</span>
      <span class="order-card-status completed" style="margin-left:8px">${order.status}</span>
    </div>
    <div class="review-items">${items}</div>
    <div class="review-total">Ümumi: ${fp(order.totalPrice || order.total || 0)}</div>
  `;
  $('review-modal').classList.remove('hidden');
}

window.showReview = showReview;

$('review-close').addEventListener('click', () => $('review-modal').classList.add('hidden'));
$('review-modal').querySelector('.modal-backdrop')?.addEventListener('click', () => $('review-modal').classList.add('hidden'));

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { $('scanner-modal').classList.add('hidden'); $('review-modal').classList.add('hidden'); stopScanner(); }
});

// ============================================
// PWA
// ============================================

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}

// ============================================
// INIT
// ============================================

const savedTheme = localStorage.getItem('gasham-theme') || 'light';
document.documentElement.setAttribute('data-theme', savedTheme);

subscribeRTDB();

setTimeout(() => {
  $('loading-screen').classList.add('fade-out');
  $('app').classList.remove('hidden');
  setTimeout(() => $('loading-screen').style.display = 'none', 500);
}, 500);
