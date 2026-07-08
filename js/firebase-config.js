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
let currentUser = null;

try {
  if (typeof firebase !== 'undefined') {
    firebase.initializeApp(firebaseConfig);
    database = firebase.database();

    // Auto sign-in so database operations are authenticated
    firebase.auth().signInWithEmailAndPassword('gasham@admin.com', 'gasham66')
      .then(userCredential => {
        currentUser = userCredential.user;
        console.log('Firebase auth ok:', currentUser.email);
      })
      .catch(err => {
        console.warn('Firebase auth error:', err.message);
        // If user doesn't exist, create one
        if (err.code === 'auth/user-not-found') {
          firebase.auth().createUserWithEmailAndPassword('gasham@admin.com', 'gasham66')
            .then(userCredential => {
              currentUser = userCredential.user;
              console.log('Firebase user created:', currentUser.email);
            })
            .catch(regErr => {
              console.warn('User creation error:', regErr.message);
            });
        }
      });
  }
} catch (err) {
  console.warn('Firebase yuklenmedi:', err.message);
}
