// routes/linkedAccountRoutes.js
import express from 'express';
import {
    createLinkedAccount,
    createStakeholder,
    requestProductConfiguration,
    updateProductConfiguration,
    transferFunds,
    getLinkedAccountDetails
} from '../controllers/linkedAccountController.js';

const router = express.Router();

router.post('/', createLinkedAccount);
router.get('/:accountId', getLinkedAccountDetails);
router.post('/:accountId/stakeholders', createStakeholder);
router.post('/:accountId/products', requestProductConfiguration);
router.patch('/:accountId/products/:productId', updateProductConfiguration);
router.post('/transfer', transferFunds);

export default router;