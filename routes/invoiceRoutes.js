// routes/invoiceRoutes.js
import express from 'express';
import { sendInvoiceEmail } from '../controllers/invoiceController.js';

const router = express.Router();

// Invoice routes
router.post('/sendInvoice', sendInvoiceEmail);

export default router;