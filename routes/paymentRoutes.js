// routes/paymentRoutes.js
import express from 'express';
import { processPayment, createNewLinkedAccount, getLinkedAccountDetails, handlePaymentWebhook, createNewListing, fetchUserListings,  createUserDocument, getFirebaseConfig, fetchUserDetails } from '../controllers/paymentController.js';

const router = express.Router();

router.post('/process', processPayment);
router.post('/linked-accounts', createNewLinkedAccount);
router.get('/linked-accounts', getLinkedAccountDetails);
router.post('/webhook', handlePaymentWebhook);
router.post('/listings', createNewListing);
router.get('/user-listings/:userId', fetchUserListings);
router.post('/users', createUserDocument);
router.get('/config', getFirebaseConfig);
router.get('/users/:userId', fetchUserDetails);

export default router;