/**
 * GASHAM - Firebase Configuration
 * Firebase Realtime Database ilə tam inteqrasiya
 */

const firebaseConfig = {
  apiKey: "AIzaSyDnbN3yJfuHejYqTv5HsisJMec0QjpaJzg",
  authDomain: "chatog-94528.firebaseapp.com",
  databaseURL: "https://chatog-94528-default-rtdb.firebaseio.com",
  projectId: "chatog-94528",
  storageBucket: "chatog-94528.firebasestorage.app",
  messagingSenderId: "877401186095",
  appId: "1:877401186095:web:04d181fbbf2aaebb64cbda"
};

// Firebase xidmətləri (global)
let database = null;

try {
  if (typeof firebase !== 'undefined') {
    firebase.initializeApp(firebaseConfig);
    database = firebase.database();
    // Offline persistence aktiv
    database.ref('.info/connected').on('value', snap => {
      console.log('Firebase bağlantısı:', snap.val() ? 'ONLINE' : 'OFFLINE');
    });
  }
} catch (err) {
  console.warn('Firebase yüklənmədi:', err.message);
}
