import admin from 'firebase-admin';
import { readFile } from 'fs/promises';

// Read the service account key file
const serviceAccount = JSON.parse(
  await readFile(new URL('./serviceAccountKey.json', import.meta.url))
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://addphonebook-67776-default-rtdb.asia-southeast1.firebasedatabase.app'
});

export const db = admin.firestore();
