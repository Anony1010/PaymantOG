# GASHAM - QR POS Sistemi

**GASHAM** — Professional QR Order & Point of Sale System

## Xüsusiyyətlər

- 📱 **Mobil & PC uyumlu** — Tam responsive dizayn
- 📷 **QR Kod Oxuma** — Kamera ilə sürətli QR scan
- 🔄 **Realtime** — Firebase Firestore ilə canlı sinxronizasiya
- 🌓 **Dark / Light Mode** — İşıqlı və qaranlıq rejim
- 📊 **Admin Panel** — Tam idarəetmə paneli
- 📦 **Məhsul İdarəetməsi** — CRUD, import/export, bulk əməliyyatlar
- 🧾 **Sifariş İdarəetməsi** — Yarat, bitir, çap et, PDF
- 📈 **Dashboard** — Realtime statistika və analitika
- 📴 **Offline Dəstək** — PWA + Service Worker
- 🎨 **Glassmorphism Dizayn** — Müasir, minimal, sürətli

## Texnologiyalar

- HTML5 / CSS3 / JavaScript ES2024
- Firebase v11 (Auth, Firestore, Storage)
- html5-qrcode / jsQR
- PWA (Manifest + Service Worker)
- Glassmorphism UI

## Quraşdırma

1. Firebase layihəsi yaradın
2. `js/firebase-config.js` faylında Firebase məlumatlarınızı daxil edin
3. Firebase Authentication -> Sign-in method -> Email/Password aktiv edin
4. Firestore Database yaradın
5. Firebase Storage aktiv edin
6. Faylları Firebase Hosting-ə deploy edin və ya istənilən hostda yayımlayın

## Firebase Firestore Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

## Firebase Storage Rules

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## İstifadə

### İstifadəçi Paneli (`index.html`)
- "Yeni Sifariş" düyməsinə basın
- QR kodu oxudun
- Məhsul avtomatik sifarişə əlavə olunur
- Sifarişi idarə edin, bitirin, çap edin

### Admin Panel (`admin.html`)
- Email/Şifrə ilə daxil olun
- Dashboard-da statistikanı izləyin
- Məhsulları idarə edin
- QR scan ilə məhsul əlavə edin
- Sifarişləri izləyin

## Lisenziya

MIT
