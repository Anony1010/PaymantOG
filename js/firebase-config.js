/**
 * GASHAM - Firebase Configuration
 * Firebase Realtime Database (mixx-f7914)
 */

const firebaseConfig = {
  apiKey: "AIzaSyCcDSed2r8H6TjRZHW4gDXo6Ui-TniessM",
  authDomain: "mixx-f7914.firebaseapp.com",
  databaseURL: "https://mixx-f7914-default-rtdb.firebaseio.com",
  projectId: "mixx-f7914",
  storageBucket: "mixx-f7914.firebasestorage.app",
  messagingSenderId: "144282948974",
  appId: "1:144282948974:web:ca3e301ec3550226dd5d7f"
};

let database = null;

try {
  if (typeof firebase !== 'undefined') {
    firebase.initializeApp(firebaseConfig);
    database = firebase.database();
  }
} catch (err) {
  console.warn('Firebase yüklənmədi:', err.message);
}
