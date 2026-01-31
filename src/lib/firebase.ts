import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
    apiKey: "AIzaSyBY7ljjWOu0chm7MNnBXtaf7HkT2voT9J8",
    authDomain: "studio-4014429747-1a23b.firebaseapp.com",
    projectId: "studio-4014429747-1a23b",
    storageBucket: "studio-4014429747-1a23b.firebasestorage.app",
    messagingSenderId: "1002916332511",
    appId: "1:1002916332511:web:0dece88971a71f394a7a6a"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export default app;
