import {initializeApp} from 'firebase/app';
import {initializeAuth} from 'firebase/auth';
import * as firebaseAuth from 'firebase/auth';
import {getFirestore} from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {getStorage} from 'firebase/storage';

// Import the functions you need from the SDKs you need
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional

const firebaseConfig = {
  apiKey: "AIzaSyCcqQBiRJShQqoslpyMdxTD24a_TUMrS0E",
  authDomain: "refind-eb295.firebaseapp.com",
  projectId: "refind-eb295",
  storageBucket: "refind-eb295.firebasestorage.app",
  messagingSenderId: "608327211146",
  appId: "1:608327211146:web:4a0bc4d7df16c9842d7573",
  measurementId: "G-SVDT0BPZHH"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const reactNativePersistence = (firebaseAuth as any).getReactNativePersistence;
const auth = initializeAuth(app, {
  persistence: reactNativePersistence(AsyncStorage)
});
const db = getFirestore(app);
const storage = getStorage(app);

export { auth, db, storage };