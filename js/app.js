/**
 * GASHAM - User Panel Application v3
 * QR POS Sistemi - Təmiz, sürətli, professional
 */

// ============================================
// UTILITY FUNCTIONS
// ============================================

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || 'ℹ'}</span>
    <span class="toast-message">${message}</span>
    <button class="toast-close">&times;</button>`;
  toast.querySelector('.toast-close').onclick = () => removeToast(toast);
  container.appendChild(toast);
  setTimeout(() => removeToast(toast), 4000);
}

function removeToast(toast) {
  if (toast.classList.contains('removing')) return;
  toast.classList.add('removing');
  setTimeout(() => toast.remove(), 300);
}

function formatDate(date) {
  const d = date instanceof Date ? date : date?.toDate ? date.toDate() : new Date(date);
  return d.toLocaleDateString('az-AZ', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatTime(date) {
  const d = date instanceof Date ? date : date?.toDate ? date.toDate() : new Date(date);
  return d.toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit' });
}

function formatPrice(price) {
  return `${parseFloat(price || 0).toFixed(2)} ₼`;
}

function escHtml(text) {
  const d = document.createElement('div');
  d.textContent = text;
  return d.innerHTML;
}

// ============================================
// STATE
// ============================================

const state = {
  cart: [],
  orders: [],
  scanner: null,
  scannerRunning: false,
  cameraId: { exact: 'environment' },
  flashOn: false,
  beepCtx: null
};

// ============================================
// DOM REFS
// ============================================

const dom = {
  loading: document.getElementById('loading-screen'),
  app: document.getElementById('app'),
  themeToggle: document.getElementById('theme-toggle'),
  newOrderBtn: document.getElementById('new-order-btn'),
  // Cart
  cartSection: document.getElementById('cart-section'),
  cartItems: document.getElementById('cart-items'),
  cartBadge: document.getElementById('cart-badge'),
  cartItemCount: document.getElementById('cart-item-count'),
  cartSubtotal: document.getElementById('cart-subtotal'),
  cartTotal: document.getElementById('cart-total'),
  confirmOrderBtn: document.getElementById('confirm-order-btn'),
  cartSpacer: document.getElementById('cart-spacer'),
  // Scanner
  scannerModal: document.getElementById('scanner-modal'),
  scannerClose: document.getElementById('scanner-close'),
  scannerElement: document.getElementById('scanner-element'),
  flashToggle: document.getElementById('flash-toggle'),
  cameraSwitch: document.getElementById('camera-switch'),
  // Review
  reviewModal: document.getElementById('review-modal'),
  reviewTitle: document.getElementById('review-title'),
  reviewBody: document.getElementById('review-body'),
  reviewClose: document.getElementById('review-close'),
  // History
  historyList: document.getElementById('history-list'),
  historyCount: document.getElementById('history-count'),
  scanOverlay: document.getElementById('scan-success-overlay')
};

// ============================================
// BEEP SOUND
// ============================================

function initBeep() {
  try { state.beepCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {}
}

function playBeep() {
  try {
    const ctx = state.beepCtx;
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 1600;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.15);
  } catch (e) {}
}

// ============================================
// SCAN SUCCESS ANIMATION
// ============================================

function showScanSuccess() {
  const overlay = dom.scanOverlay;
  overlay.classList.remove('hidden', 'fade-out');
  playBeep();
  if (navigator.vibrate) navigator.vibrate(100);
  setTimeout(() => {
    overlay.classList.add('fade-out');
    setTimeout(() => {
      overlay.classList.add('hidden');
      overlay.classList.remove('fade-out');
    }, 400);
  }, 650);
}

// ============================================
// THEME
// ============================================

function toggleTheme() {
  const html = document.documentElement;
  const current = html.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', next);
  localStorage.setItem('gasham-theme', next);
}

// ============================================
// QR SCANNER (html5-qrcode)
// ============================================

async function startScanner() {
  dom.scannerModal.classList.remove('hidden');
  try {
    if (state.scanner) {
      await state.scanner.stop();
      state.scanner.clear();
    }
    state.scanner = new Html5Qrcode('scanner-element');
    await state.scanner.start(
      { facingMode: 'environment' },
      {
        fps: 30,
        qrbox: { width: 250, height: 250 },
        formatsToSupport: [
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.PDF_417,
          Html5QrcodeSupportedFormats.DATA_MATRIX,
          Html5QrcodeSupportedFormats.AZTEC,
          Html5QrcodeSupportedFormats.CODABAR,
          Html5QrcodeSupportedFormats.ITF
        ]
      },
      onScanSuccess,
      () => {}
    );
    state.scannerRunning = true;
  } catch (err) {
    console.error('Scanner error:', err);
    showToast('Kamera açılmadı: ' + err.message, 'error');
    dom.scannerModal.classList.add('hidden');
  }
}

function onScanSuccess(decodedText) {
  if (!state.scannerRunning) return;
  state.scannerRunning = false;
  if (state.scanner) state.scanner.stop().catch(() => {});
  dom.scannerModal.classList.add('hidden');
  showScanSuccess();
  handleScannedCode(decodedText);
}

function stopScanner() {
  state.scannerRunning = false;
  if (state.scanner) {
    try { state.scanner.stop(); state.scanner.clear(); } catch (e) {}
  }
}

async function switchCamera() {
  if (!state.scanner) return;
  try {
    await state.scanner.stop();
    const isEnv = state.cameraId.facingMode === 'environment';
    state.cameraId = { facingMode: isEnv ? 'user' : 'environment' };
    await state.scanner.start(state.cameraId, { fps: 30, qrbox: { width: 250, height: 250 } }, onScanSuccess, () => {});
    state.scannerRunning = true;
  } catch (err) {
    showToast('Kamera dəyişdirilə bilmədi', 'error');
  }
}

async function toggleFlash() {
  try {
    const video = document.querySelector('#scanner-element video');
    if (!video) return;
    const track = video.srcObject?.getVideoTracks()[0];
    if (!track) return;
    const caps = track.getCapabilities();
    if (!caps.torch) { showToast('Flash dəstəklənmir', 'warning'); return; }
    state.flashOn = !state.flashOn;
    await track.applyConstraints({ advanced: [{ torch: state.flashOn }] });
    document.getElementById('flash-toggle').style.color = state.flashOn ? '#ff0' : '';
  } catch (e) {}
}

// ============================================
// HANDLE SCANNED CODE
// ============================================

async function handleScannedCode(code) {
  const qrId = code.trim();
  if (!db) { showToast('Firebase bağlantısı yoxdur. Məhsul əlavə edilə bilməz.', 'error'); return; }

  try {
    // Try exact ID match
    let doc = await db.collection('products').doc(qrId).get();
    if (doc.exists && doc.data().status !== 'inactive') {
      addToCart({ id: doc.id, ...doc.data() });
      return;
    }
    // Try qrId field match
    const snap = await db.collection('products')
      .where('qrId', '==', qrId)
      .where('status', '!=', 'inactive')
      .limit(1).get();
    if (!snap.empty) {
      const d = snap.docs[0];
      addToCart({ id: d.id, ...d.data() });
      return;
    }
    showToast('Məhsul tapılmadı', 'error');
  } catch (err) {
    console.error('Product lookup error:', err);
    showToast('Xəta baş verdi', 'error');
  }
}

// ============================================
// CART MANAGEMENT
// ============================================

function addToCart(product) {
  const existing = state.cart.find(i => i.id === product.id);
  if (existing) {
    existing.qty++;
    showToast(`${product.name} sayı artırıldı (${existing.qty})`, 'success');
  } else {
    state.cart.push({
      id: product.id,
      name: product.name,
      price: parseFloat(product.price || 0),
      qty: 1
    });
    showToast(`${product.name} əlavə edildi`, 'success');
  }
  renderCart();
}

function changeQty(id, delta) {
  const item = state.cart.find(i => i.id === id);
  if (!item) return;
  item.qty = Math.max(0, item.qty + delta);
  if (item.qty === 0) state.cart = state.cart.filter(i => i.id !== id);
  renderCart();
}

function getCartTotal() {
  return state.cart.reduce((sum, i) => sum + i.price * i.qty, 0);
}

function getCartItemCount() {
  return state.cart.reduce((sum, i) => sum + i.qty, 0);
}

function renderCart() {
  const hasItems = state.cart.length > 0;
  dom.cartSection.classList.toggle('hidden', !hasItems);
  dom.cartSpacer.classList.toggle('hidden', !hasItems);
  if (!hasItems) return;

  dom.cartBadge.textContent = getCartItemCount();
  dom.cartItemCount.textContent = getCartItemCount();
  const total = getCartTotal();
  dom.cartSubtotal.textContent = formatPrice(total);
  dom.cartTotal.textContent = formatPrice(total);

  dom.cartItems.innerHTML = state.cart.map(item => `
    <div class="cart-item">
      <div class="cart-item-info">
        <span class="cart-item-name">${escHtml(item.name)}</span>
        <span class="cart-item-price">${formatPrice(item.price)}</span>
      </div>
      <div class="cart-item-actions">
        <button class="btn-qty" onclick="changeQty('${item.id}', -1)">−</button>
        <span class="cart-item-qty">${item.qty}</span>
        <button class="btn-qty" onclick="changeQty('${item.id}', 1)">+</button>
        <span class="cart-item-total">${formatPrice(item.price * item.qty)}</span>
      </div>
    </div>
  `).join('');
}

// ============================================
// ORDER CONFIRMATION
// ============================================

async function confirmOrder() {
  if (state.cart.length === 0) { showToast('Sifariş boşdur', 'warning'); return; }
  if (!db) { showToast('Firebase bağlantısı yoxdur', 'error'); return; }

  dom.confirmOrderBtn.disabled = true;
  dom.confirmOrderBtn.textContent = 'Yadda saxlanılır...';

  try {
    const orderNumber = await getNextOrderNumber();
    await db.collection('orders').add({
      orderNumber,
      items: state.cart.map(i => ({ name: i.name, price: i.price, qty: i.qty })),
      total: getCartTotal(),
      itemCount: getCartItemCount(),
      status: 'Təsdiqlənib',
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    showToast(`Sifariş #${orderNumber} təsdiqləndi!`, 'success');
    state.cart = [];
    renderCart();
    dom.confirmOrderBtn.disabled = false;
    dom.confirmOrderBtn.textContent = 'Təsdiqlə';
    // Scroll to history
    document.querySelector('.history-section').scrollIntoView({ behavior: 'smooth' });
  } catch (err) {
    showToast('Xəta: ' + err.message, 'error');
    dom.confirmOrderBtn.disabled = false;
    dom.confirmOrderBtn.textContent = 'Təsdiqlə';
  }
}

async function getNextOrderNumber() {
  try {
    const snap = await db.collection('orders').orderBy('orderNumber', 'desc').limit(1).get();
    if (snap.empty) return 1;
    return (snap.docs[0].data().orderNumber || 0) + 1;
  } catch { return Date.now() % 10000; }
}

// ============================================
// ORDER HISTORY (Realtime)
// ============================================

function subscribeOrders() {
  if (!db) return;
  db.collection('orders').orderBy('createdAt', 'desc').onSnapshot(snapshot => {
    state.orders = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    renderHistory();
  }, err => console.error('Orders subscription error:', err));
}

function renderHistory() {
  const completed = state.orders.filter(o => o.status === 'Təsdiqlənib' || o.status === 'completed');
  dom.historyCount.textContent = completed.length;

  if (!completed.length) {
    dom.historyList.innerHTML = `
      <div class="empty-state">
        <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" opacity="0.25">
          <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
          <line x1="3" y1="6" x2="21" y2="6"/>
        </svg>
        <p>Hələ heç bir sifariş yoxdur</p>
        <p class="sub">Yeni sifariş yaratmaq üçün yuxarıdakı düyməni istifadə edin</p>
      </div>`;
    return;
  }

  dom.historyList.innerHTML = completed.map(order => {
    const date = order.createdAt?.toDate ? order.createdAt.toDate() : new Date(order.createdAt);
    const itemsCount = (order.items || []).reduce((s, i) => s + (i.qty || 0), 0);
    return `
      <div class="order-card" onclick="showReview('${order.id}')">
        <div class="order-card-header">
          <div>
            <div class="order-card-number">Sifariş #${order.orderNumber}</div>
            <div class="order-card-time">${formatDate(date)} ${formatTime(date)}</div>
          </div>
          <div class="order-card-total">${formatPrice(order.total || 0)}</div>
        </div>
        <div class="order-card-meta">
          <span>${itemsCount} məhsul</span>
          <span class="order-card-status completed">${order.status}</span>
        </div>
      </div>`;
  }).join('');
}

// ============================================
// ORDER REVIEW
// ============================================

function showReview(orderId) {
  const order = state.orders.find(o => o.id === orderId);
  if (!order) return;

  dom.reviewTitle.textContent = `Sifariş #${order.orderNumber}`;
  const date = order.createdAt?.toDate ? order.createdAt.toDate() : new Date(order.createdAt);

  const items = (order.items || []).map(item => `
    <div class="review-item">
      <div><strong>${escHtml(item.name)}</strong> <span class="review-item-qty">× ${item.qty}</span></div>
      <div class="review-item-amounts">
        <span class="review-item-unit">${formatPrice(item.price)}</span>
        <span class="review-item-total">${formatPrice(item.price * item.qty)}</span>
      </div>
    </div>
  `).join('');

  dom.reviewBody.innerHTML = `
    <div class="review-meta">
      <span>Tarix: ${formatDate(date)} ${formatTime(date)}</span>
      <span class="order-card-status completed" style="margin-left:8px">${order.status}</span>
    </div>
    <div class="review-items">${items}</div>
    <div class="review-total">Ümumi: ${formatPrice(order.total || 0)}</div>
  `;
  dom.reviewModal.classList.remove('hidden');
}

// ============================================
// EVENT LISTENERS
// ============================================

dom.themeToggle.addEventListener('click', toggleTheme);

dom.newOrderBtn.addEventListener('click', () => {
  if (state.scannerRunning) { stopScanner(); dom.scannerModal.classList.add('hidden'); }
  startScanner();
});

dom.scannerClose.addEventListener('click', () => { stopScanner(); dom.scannerModal.classList.add('hidden'); });
dom.scannerModal.querySelector('.modal-backdrop')?.addEventListener('click', () => { stopScanner(); dom.scannerModal.classList.add('hidden'); });
dom.flashToggle.addEventListener('click', toggleFlash);
dom.cameraSwitch.addEventListener('click', switchCamera);
dom.confirmOrderBtn.addEventListener('click', confirmOrder);
dom.reviewClose.addEventListener('click', () => dom.reviewModal.classList.add('hidden'));
dom.reviewModal.querySelector('.modal-backdrop')?.addEventListener('click', () => dom.reviewModal.classList.add('hidden'));

// Keyboard shortcut: Escape to close modals
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    dom.scannerModal.classList.add('hidden');
    dom.reviewModal.classList.add('hidden');
    stopScanner();
  }
});

// Expose functions
window.changeQty = changeQty;
window.showReview = showReview;

// ============================================
// PWA
// ============================================

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}

// ============================================
// INIT
// ============================================

function init() {
  const savedTheme = localStorage.getItem('gasham-theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);

  initBeep();
  subscribeOrders();

  setTimeout(() => {
    dom.loading.classList.add('fade-out');
    dom.app.classList.remove('hidden');
    setTimeout(() => dom.loading.style.display = 'none', 600);
  }, 500);
}

document.addEventListener('DOMContentLoaded', init);
