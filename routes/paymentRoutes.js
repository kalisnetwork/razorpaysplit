// routes/paymentRoutes.js
import express from 'express';
import { processPayment, getLinkedAccountDetails, handlePaymentWebhook, createNewListing, fetchUserListings, createUserDocument, getFirebaseConfig, fetchUserDetails, createNewLinkedAccount, directPaymentOrder, uploadFiles } from '../controllers/paymentController.js';
import { createStakeholder, requestProductConfiguration, updateProductConfiguration, transferFunds } from '../controllers/linkedAccountController.js'
import upload from '../utils/fileUpload.js';

const router = express.Router();

router.post('/process', processPayment);
router.get('/linked-accounts', getLinkedAccountDetails);
router.post('/webhook', handlePaymentWebhook);
router.post('/listings',  createNewListing);
router.get('/user-listings/:userId', fetchUserListings);
router.post('/upload-files', upload.fields([
    { name: 'frontAadhaarCard', maxCount: 1 },
    { name: 'backAadhaarCard', maxCount: 1 },
    { name: 'panCard', maxCount: 1 },
    { name: 'passportPhoto', maxCount: 1 },
 ]), uploadFiles); 
router.post('/users', upload.none(),  createUserDocument);
router.get('/config', getFirebaseConfig);
router.get('/users/:userId', fetchUserDetails);

router.post('/linked-accounts', createNewLinkedAccount);

//Linked Account Routes
router.post('/accounts/:accountId/stakeholders', createStakeholder);
router.post('/accounts/:accountId/products', requestProductConfiguration);
router.patch('/accounts/:accountId/products/:productId', updateProductConfiguration);
 router.post('/transfers', transferFunds);

//Direct Payment Route
router.post('/order', directPaymentOrder);

export default router;