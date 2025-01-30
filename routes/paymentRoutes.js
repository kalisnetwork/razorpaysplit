// routes/paymentRoutes.js
import express from 'express';
import { 
    processPayment, 
    handlePaymentWebhook, 
    getPaymentDetails,
    directPaymentOrder,
    checkTransferStatus
} from '../controllers/paymentController.js';

const router = express.Router();

// Existing routes
router.post('/process', processPayment);
router.post('/webhook', handlePaymentWebhook);
router.get('/details/:paymentId', getPaymentDetails);
router.post('/order', directPaymentOrder);

// New route for checking transfer status
router.get('/transfer/:transferId', checkTransferStatus);

export default router;