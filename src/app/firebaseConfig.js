import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth, getReactNativePersistence, initializeAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCtOOmLUqLaPFYtF_eBk9--Pmme7Y4ps2c",
  authDomain: "avaliacao-4.firebaseapp.com",
  projectId: "avaliacao-4",
  storageBucket: "avaliacao-4.firebasestorage.app",
  messagingSenderId: "941872190261",
  appId: "1:941872190261:web:43b0e39bcbc857308ff27c",
  databaseURL: "https://avaliacao-4-default-rtdb.firebaseio.com"
};

export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = (() => {
  try {
    return initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch (e) {
    return getAuth(app);
  }
})();

export const db = getFirestore(app);