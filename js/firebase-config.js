/**
 * GASHAM - Firebase Configuration
 * Bu fayl Firebase bağlantısını konfiqurasiya edir.
 * Öz Firebase layihənizin məlumatlarını daxil edin.
 */
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Firebase-i başlat
firebase.initializeApp(firebaseConfig);

// Xidmətlər
const db = firebase.firestore();
const auth = firebase.auth();
const storage = firebase.storage();

// Realtime əlaqə üçün Firestore settings
db.settings({
  cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED,
  merge: true
});
db.enablePersistence()
  .catch(err => console.warn('Firestore persistence error:', err));
