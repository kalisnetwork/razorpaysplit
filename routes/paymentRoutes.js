// routes/paymentRoutes.js
import express from 'express';
import { 
    processPayment, 
    handlePaymentWebhook, 
    getPaymentDetails,
    directPaymentOrder,
    getTransferStatus // Update import to getTransferStatus
} from '../controllers/paymentController.js';

const router = express.Router();

// Existing routes
router.post('/process', processPayment);
router.post('/webhook', handlePaymentWebhook);
router.get('/details/:paymentId', getPaymentDetails);
router.post('/order', directPaymentOrder);

// New route for checking transfer status
router.get('/transfer/:transferId', getTransferStatus);

export default router;
