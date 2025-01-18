// invoiceRoutes.js
import express from 'express';
import { sendInvoiceEmail } from '../controllers/invoiceController.js';

const router = express.Router();

router.post('/sendInvoice', sendInvoiceEmail);

export default router;