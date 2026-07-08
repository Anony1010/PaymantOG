/**
 * GASHAM - User Panel Application v2
 * QR POS Sistemi - Tam yenilənmiş istifadəçi paneli
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

function formatDate(date) {
  const d = date instanceof Date ? date : date.toDate ? date.toDate() : new Date(date);
  return d.toLocaleDateString('az-AZ', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatTime(date) {
  const d = date instanceof Date ? date : date.toDate ? date.toDate() : new Date(date);
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
  beepAudio: null
};

// ============================================
// DOM REFS
// ============================================

const $ = id => document.getElementById(id);
const dom = {
  loading: $('loading-screen'),
  app: $('app'),
  themeToggle: $('theme-toggle'),
  newOrderBtn: $('new-order-btn'),
  adminBtn: $('admin-btn'),
  // Cart
  cartSection: $('cart-section'),
  cartItems: $('cart-items'),
  cartBadge: $('cart-badge'),
  cartItemCount: $('cart-item-count'),
  cartSubtotal: $('cart-subtotal'),
  cartTotal: $('cart-total'),
  confirmOrderBtn: $('confirm-order-btn'),
  cartSpacer: $('cart-spacer'),
  // Scanner
  scannerModal: $('scanner-modal'),
  scannerClose: $('scanner-close'),
  scannerElement: $('scanner-element'),
  flashToggle: $('flash-toggle'),
  cameraSwitch: $('camera-switch'),
  // Admin Login
  adminLoginModal: $('admin-login-modal'),
  adminLoginForm: $('admin-login-form'),
  adminCodeInput: $('admin-code-input'),
  adminLoginBtn: $('admin-login-btn'),
  adminLoginError: $('admin-login-error'),
  adminLoginClose: $('admin-login-close'),
  adminLogoutBtn: $('admin-logout-btn'),
  // Review
  reviewModal: $('review-modal'),
  reviewTitle: $('review-title'),
  reviewBody: $('review-body'),
  reviewClose: $('review-close'),
  // History
  historyList: $('history-list'),
  historyCount: $('history-count'),
  // Scan success overlay
  scanOverlay: $('scan-success-overlay')
};

// ============================================
// BEEP SOUND
// ============================================

function initBeep() {
  try {
    // Create audio context for beep
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    state.beepAudio = ctx;
  } catch (e) {
    console.warn('Audio not available');
  }
}

function playBeep() {
  try {
    const ctx = state.beepAudio;
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
  } catch (e) { /* silent */ }
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
  }, 600);
}

// ============================================
// THEME
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
  showToast(`${next === 'dark' ? 'Qaranlıq' : 'İşıqlı'} rejim`, 'info');
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

    const config = {
      fps: 30,
      qrbox: { width: 260, height: 260 },
      aspectRatio: 1.0,
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
        Html5QrcodeSupportedFormats.MAXICODE,
        Html5QrcodeSupportedFormats.CODABAR,
        Html5QrcodeSupportedFormats.ITF
      ]
    };

    await state.scanner.start(
      { facingMode: 'environment' },
      config,
      onScanSuccess,
      onScanFailure
    );

    state.scannerRunning = true;
    // Try to start flash if available
    tryFlash();
  } catch (err) {
    console.error('Scanner start error:', err);
    showToast('Kamera açılmadı: ' + err.message, 'error');
    dom.scannerModal.classList.add('hidden');
  }
}

function onScanSuccess(decodedText, decodedResult) {
  if (!state.scannerRunning) return;
  // Stop scanner briefly to prevent duplicate scans
  state.scannerRunning = false;
  if (state.scanner) {
    state.scanner.stop().catch(() => {});
  }
  dom.scannerModal.classList.add('hidden');
  showScanSuccess();
  handleScannedCode(decodedText);
}

function onScanFailure(err) {
  // Ignore continuous scan failures
}

async function tryFlash() {
  try {
    const devices = await Html5Qrcode.getCameras();
    // Flash is handled via track constraints if available
  } catch (e) { /* ignore */ }
}

function stopScanner() {
  state.scannerRunning = false;
  if (state.scanner) {
    try {
      state.scanner.stop();
      state.scanner.clear();
    } catch (e) { /* ignore */ }
  }
}

// Camera switch
async function switchCamera() {
  if (!state.scanner) return;
  try {
    await state.scanner.stop();
    const isEnv = state.cameraId.facingMode === 'environment';
    state.cameraId = { facingMode: isEnv ? 'user' : 'environment' };
    await state.scanner.start(
      state.cameraId,
      { fps: 30, qrbox: { width: 260, height: 260 } },
      onScanSuccess,
      onScanFailure
    );
    state.scannerRunning = true;
  } catch (err) {
    showToast('Kamera dəyişdirilə bilmədi', 'error');
  }
}

// Flash toggle
async function toggleFlash() {
  try {
    const video = document.querySelector('#scanner-element video');
    if (!video) return;
    const track = video.srcObject?.getVideoTracks()[0];
    if (!track) return;
    const caps = track.getCapabilities();
    if (!caps.torch) {
      showToast('Flash dəstəklənmir', 'warning');
      return;
    }
    state.flashOn = !state.flashOn;
    await track.applyConstraints({ advanced: [{ torch: state.flashOn }] });
    dom.flashToggle.style.color = state.flashOn ? '#ff0' : '';
  } catch (e) {
    showToast('Flash idarə edilə bilmədi', 'warning');
  }
}

// ============================================
// HANDLE SCANNED CODE
// ============================================

async function handleScannedCode(code) {
  const qrId = code.trim();
  try {
    const doc = await db.collection('products').doc(qrId).get();
    if (doc.exists && doc.data().status !== 'inactive') {
      const product = { id: doc.id, ...doc.data() };
      addToCart(product);
    } else {
      // Try searching by qrId field
      const snap = await db.collection('products')
        .where('qrId', '==', qrId)
        .where('status', '!=', 'inactive')
        .limit(1).get();
      if (!snap.empty) {
        const doc2 = snap.docs[0];
        addToCart({ id: doc2.id, ...doc2.data() });
      } else {
        showToast('Məhsul tapılmadı', 'error');
        // Re-enable scanner
        setTimeout(() => dom.newOrderBtn.click(), 500);
      }
    }
  } catch (err) {
    console.error('Product lookup error:', err);
    showToast('Xəta baş verdi', 'error');
    setTimeout(() => dom.newOrderBtn.click(), 500);
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
      qrId: product.qrId || product.id,
      name: product.name,
      price: parseFloat(product.price || 0),
      qty: 1,
      image: product.image || ''
    });
    showToast(`${product.name} əlavə edildi`, 'success');
  }
  renderCart();
}

function removeCartItem(id) {
  state.cart = state.cart.filter(i => i.id !== id);
  renderCart();
}

function changeQty(id, delta) {
  const item = state.cart.find(i => i.id === id);
  if (!item) return;
  item.qty = Math.max(0, item.qty + delta);
  if (item.qty === 0) {
    state.cart = state.cart.filter(i => i.id !== id);
  }
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
  const sub = getCartTotal();
  dom.cartSubtotal.textContent = formatPrice(sub);
  dom.cartTotal.textContent = formatPrice(sub);

  dom.cartItems.innerHTML = state.cart.map(item => `
    <div class="cart-item">
      <div class="cart-item-info">
        <div class="cart-item-name">${escHtml(item.name)}</div>
        <div class="cart-item-price">${formatPrice(item.price)}</div>
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
  if (state.cart.length === 0) {
    showToast('Sifariş boşdur', 'warning');
    return;
  }

  dom.confirmOrderBtn.disabled = true;
  dom.confirmOrderBtn.textContent = 'Yadda saxlanılır...';

  try {
    const orderNumber = await getNextOrderNumber();
    const orderData = {
      orderNumber: orderNumber,
      items: state.cart.map(i => ({
        qrId: i.qrId,
        name: i.name,
        price: i.price,
        qty: i.qty
      })),
      total: getCartTotal(),
      itemCount: getCartItemCount(),
      status: 'Təsdiqlənib',
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    await db.collection('orders').add(orderData);
    showToast(`Sifariş #${orderNumber} təsdiqləndi!`, 'success');
    
    // Clear cart
    state.cart = [];
    renderCart();
    dom.confirmOrderBtn.disabled = false;
    dom.confirmOrderBtn.textContent = 'Təsdiqlə';
    // Scroll to history section
    document.querySelector('.history-section').scrollIntoView({ behavior: 'smooth' });
  } catch (err) {
    console.error('Order save error:', err);
    showToast('Xəta baş verdi: ' + err.message, 'error');
    dom.confirmOrderBtn.disabled = false;
    dom.confirmOrderBtn.textContent = 'Təsdiqlə';
  }
}

async function getNextOrderNumber() {
  try {
    const snap = await db.collection('orders')
      .orderBy('orderNumber', 'desc')
      .limit(1)
      .get();
    if (snap.empty) return 1;
    return (snap.docs[0].data().orderNumber || 0) + 1;
  } catch { return Date.now() % 10000; }
}

// ============================================
// ORDER HISTORY
// ============================================

function subscribeOrders() {
  db.collection('orders')
    .orderBy('createdAt', 'desc')
    .onSnapshot(snapshot => {
      state.orders = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      renderHistory();
    }, err => {
      console.error('Orders subscription error:', err);
    });
}

function renderHistory() {
  const completed = state.orders.filter(o => o.status === 'Təsdiqlənib' || o.status === 'completed');
  dom.historyCount.textContent = completed.length;

  if (!completed.length) {
    dom.historyList.innerHTML = `
      <div class="empty-state">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" opacity="0.3">
          <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
        </svg>
        <p>Hələ heç bir sifariş yoxdur</p>
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
      <div>
        <strong>${escHtml(item.name)}</strong>
        <span style="font-size:13px;color:var(--text-secondary)"> × ${item.qty}</span>
      </div>
      <div style="text-align:right">
        <div>${formatPrice(item.price)}</div>
        <div style="font-size:13px;color:var(--accent);font-weight:600">${formatPrice(item.price * item.qty)}</div>
      </div>
    </div>
  `).join('');

  dom.reviewBody.innerHTML = `
    <div class="review-meta">
      <div>Tarix: ${formatDate(date)} ${formatTime(date)}</div>
      <div>Status: <span class="order-card-status completed">${order.status}</span></div>
    </div>
    <div>${items}</div>
    <div class="review-total">Ümumi: ${formatPrice(order.total || 0)}</div>
  `;

  dom.reviewModal.classList.remove('hidden');
}

// ============================================
// ADMIN LOGIN (Code-based)
// ============================================

const ADMIN_CODE = 'gasham66';
const SESSION_KEY = 'gasham_admin_session';

function checkAdminSession() {
  return localStorage.getItem(SESSION_KEY) === 'true';
}

function saveAdminSession() {
  localStorage.setItem(SESSION_KEY, 'true');
}

function clearAdminSession() {
  localStorage.removeItem(SESSION_KEY);
}

function openAdmin() {
  if (checkAdminSession()) {
    window.location.href = 'admin.html';
    return;
  }
  dom.adminLoginModal.classList.remove('hidden');
  dom.adminCodeInput.value = '';
  dom.adminLoginError.classList.add('hidden');
  dom.adminLogoutBtn.classList.add('hidden');
  dom.adminLoginForm.classList.remove('hidden');
  dom.adminCodeInput.focus();
}

dom.adminLoginForm.addEventListener('submit', e => {
  e.preventDefault();
  const code = dom.adminCodeInput.value.trim();
  if (code === ADMIN_CODE) {
    saveAdminSession();
    showToast('Giriş uğurlu', 'success');
    dom.adminLoginModal.classList.add('hidden');
    window.location.href = 'admin.html';
  } else {
    dom.adminLoginError.textContent = 'Yanlış kod!';
    dom.adminLoginError.classList.remove('hidden');
    dom.adminCodeInput.value = '';
    dom.adminCodeInput.focus();
  }
});

dom.adminLogoutBtn.addEventListener('click', () => {
  clearAdminSession();
  dom.adminLoginForm.classList.remove('hidden');
  dom.adminLogoutBtn.classList.add('hidden');
  dom.adminLoginError.textContent = 'Çıxış edildi';
  dom.adminLoginError.classList.remove('hidden');
  dom.adminLoginError.style.color = 'var(--success)';
});

// ============================================
// EVENT LISTENERS
// ============================================

dom.themeToggle.addEventListener('click', toggleTheme);

dom.newOrderBtn.addEventListener('click', () => {
  if (state.scannerRunning) {
    stopScanner();
    dom.scannerModal.classList.add('hidden');
  }
  startScanner();
});

dom.adminBtn.addEventListener('click', openAdmin);

// Scanner modal
dom.scannerClose.addEventListener('click', () => {
  stopScanner();
  dom.scannerModal.classList.add('hidden');
});
dom.scannerModal.querySelector('.modal-backdrop')?.addEventListener('click', () => {
  stopScanner();
  dom.scannerModal.classList.add('hidden');
});

dom.flashToggle.addEventListener('click', toggleFlash);
dom.cameraSwitch.addEventListener('click', switchCamera);

// Admin login modal
dom.adminLoginClose.addEventListener('click', () => {
  dom.adminLoginModal.classList.add('hidden');
});
dom.adminLoginModal.querySelector('.modal-backdrop')?.addEventListener('click', () => {
  dom.adminLoginModal.classList.add('hidden');
});

// Confirm order
dom.confirmOrderBtn.addEventListener('click', confirmOrder);

// Review modal
dom.reviewClose.addEventListener('click', () => dom.reviewModal.classList.add('hidden'));
dom.reviewModal.querySelector('.modal-backdrop')?.addEventListener('click', () => dom.reviewModal.classList.add('hidden'));

// Expose for inline onclick
window.addToCart = addToCart;
window.removeCartItem = removeCartItem;
window.changeQty = changeQty;
window.showReview = showReview;

// ============================================
// PWA
// ============================================

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}

// ============================================
// INIT
// ============================================

async function init() {
  initTheme();
  initBeep();
  subscribeOrders();
  // If admin session exists, show toast
  if (checkAdminSession()) {
    showToast('Admin panelə xoş gəldiniz', 'info');
  }
  setTimeout(() => {
    dom.loading.classList.add('fade-out');
    dom.app.classList.remove('hidden');
    setTimeout(() => dom.loading.style.display = 'none', 600);
  }, 600);
}

document.addEventListener('DOMContentLoaded', init);
