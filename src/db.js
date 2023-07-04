// TODO: firebase database 보안 설정
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, get } from "firebase/database";

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: "tft-ranking-bot.firebaseapp.com",
  databaseURL: "https://tft-ranking-bot-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "tft-ranking-bot",
  storageBucket: "tft-ranking-bot.appspot.com",
  messagingSenderId: "992437105490",
  appId: "1:992437105490:web:05026dfb01a7f25d16008b",
  measurementId: "G-T7M94JNSYF",
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

export function setValueToDatabase(key, value) {
  return set(ref(database, key), JSON.stringify(value));
}

export async function getValueFromDatabase(key) {
  const keyRef = ref(database, key);
  const snapshot = await get(keyRef);
  if (snapshot.exists()) {
    return JSON.parse(snapshot.val());
  }
  return null;
}
