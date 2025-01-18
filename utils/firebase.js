// firebase.js
import admin from 'firebase-admin';
import { readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const keyPath = new URL('./serviceAccountKey.json', import.meta.url)

let initializedAdmin;
try {
     const serviceAccount = JSON.parse(
        await readFile(keyPath)
     );
      initializedAdmin =  admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
          databaseURL: 'https://addphonebook-67776-default-rtdb.asia-southeast1.firebasedatabase.app'
        });

 } catch (error) {
    console.error("Error initializing firebase", error);
  }

export const db = initializedAdmin ?  initializedAdmin.firestore() : null;
export const firestore = initializedAdmin ? initializedAdmin.firestore() : null;
export const adminInstance = initializedAdmin;