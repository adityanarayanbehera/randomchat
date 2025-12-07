// frontend/src/lib/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: "random-chat-78436.firebaseapp.com",
  projectId: "random-chat-78436",
  storageBucket: "random-chat-78436.firebasestorage.app",
  messagingSenderId: "92339027025",
  appId: "1:92339027025:web:6739f90d1764d64fa30c70",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return {
      success: true,
      user: {
        email: result.user.email,
        displayName: result.user.displayName,
        photoURL: result.user.photoURL,
        googleId: result.user.uid,
      },
    };
  } catch (error) {
    console.error("Google sign-in error:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};
