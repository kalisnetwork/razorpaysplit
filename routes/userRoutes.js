// routes/userRoutes.js
import express from 'express';
import { 
    createUserDocument, 
    fetchUserDetails 
} from '../controllers/paymentController.js';
import upload from '../utils/fileUpload.js';

const router = express.Router();

router.post('/', upload.none(), createUserDocument);
router.get('/:userId', fetchUserDetails);

export default router;