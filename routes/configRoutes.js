// routes/configRoutes.js
import express from 'express';
import { firebaseConfig } from '../config/config.js';

const router = express.Router();

router.get('/', firebaseConfig);

export default router;