/**
 * GASHAM - Firebase Configuration
 * Öz Firebase layihənizin məlumatlarını daxil edin.
 * Firebase xidmətləri əlçatan olmasa belə app işləməyə davam edir.
 */

// Firebase konfiqurasiya - Öz məlumatlarınızı daxil edin
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Firebase xidmətləri
let db = null;
let auth = null;
let storage = null;

try {
  // Firebase-i başlat
  if (typeof firebase !== 'undefined') {
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    auth = firebase.auth();
    storage = firebase.storage();

    // Realtime settings
    db.settings({
      cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED,
      merge: true
    });
    db.enablePersistence()
      .catch(err => console.warn('Firestore persistence xətası:', err));
  }
} catch (err) {
  console.warn('Firebase yüklənmədi. Offline rejimdə işləyir.', err.message);
}
