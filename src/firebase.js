import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBbdQ90fl5ZI-YF6nCK8bXC66sgEQka1bg",
  authDomain: "stranger-video-chat-88389.firebaseapp.com",
  projectId: "stranger-video-chat-88389",
  storageBucket: "stranger-video-chat-88389.firebasestorage.app",
  messagingSenderId: "649824908167",
  appId: "1:649824908167:web:e276d80ca3df215800d922",
  measurementId: "G-SYPX5SKHG3"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

export default app;
