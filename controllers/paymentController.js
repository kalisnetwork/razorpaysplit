// controllers/paymentController.js
import { createRazorpayOrder } from '../utils/razorpayUtils.js';

export const processPayment = async (req, res) => {
  console.log('Processing payment request:', req.body);
  try {
    const { amount, currency, receipt, linkedAccountId, commissionAmount } = req.body;
    const order = await createRazorpayOrder(amount, currency, receipt, linkedAccountId, commissionAmount);

    res.status(200).json({
      success: true,
      order,
    });
    console.log('Payment processed successfully, order ID:', order.id);

  } catch (error) {
    console.error('Error processing payment:', error);
    res.status(500).json({ success: false, message: 'Payment processing failed' });
  }
};