import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDAo6SCjBpNbNsxldHYSE3fR0NADWQTqW4",
  authDomain: "upi-fraud-2f3be.firebaseapp.com",
  projectId: "upi-fraud-2f3be",
  storageBucket: "upi-fraud-2f3be.firebasestorage.app",
  messagingSenderId: "87648844190",
  appId: "1:87648844190:web:7987c863b7d177ba847e8f",
  measurementId: "G-2ZM7P9WSNR"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
