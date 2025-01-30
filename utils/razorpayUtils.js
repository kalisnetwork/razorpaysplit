// utils/razorpayUtils.js
import Razorpay from 'razorpay';
import crypto from 'crypto';

// Create Razorpay instance
const razorpay = new Razorpay({
  key_id: 'rzp_live_LtxqAtCR7grTov',
  key_secret: 'nmn17cT5dCnAvXWauzLIXLuW',
});

export const makeRazorpayRequest = async (method, url, data = null) => {
  try {
    console.log(`[Razorpay Request] ${method} ${url}`, data);
    const apiPath = url.substring(1);
    const [resource, action] = apiPath.split('/');

    let response;
    switch (method.toUpperCase()) {
      case 'POST':
        response = await razorpay[resource].create(data);
        break;
      case 'GET':
        response = await razorpay[resource].fetch(action);
        break;
      case 'PATCH':
        response = await razorpay[resource].update(action, data);
        break;
      default:
        throw new Error(`Unsupported HTTP method: ${method}`);
    }

    console.log('[Razorpay Response]', response);
    return response;
  } catch (error) {
    console.error('[Razorpay Error]', error.response?.data || error.message);
    throw error;
  }
};

export const processInstantTransfer = async (paymentId, linkedAccountId, amount, currency = 'INR') => {
  try {
    const transferAmount = Math.round(amount * 100);
    return await razorpay.payments.transfer(paymentId, {
      transfers: [{
        account: linkedAccountId,
        amount: transferAmount,
        currency: currency,
        on_hold: false,
        notes: {
          purpose: "instant_commission_transfer"
        }
      }]
    });
  } catch (error) {
    console.error('Transfer error:', error);
    throw error;
  }
};

export const createRazorpayOrder = (amount, currency, receipt, linkedAccountId, commissionAmount) => {
  console.log('Creating Razorpay order with transfer details...');
  return new Promise((resolve, reject) => {
    const amountInPaise = Math.round(amount * 100);
    const transferAmount = Math.round(commissionAmount * 100);
    
    const options = {
      amount: amountInPaise,
      currency: currency || 'INR',
      receipt: receipt,
      transfers: [{
        account: linkedAccountId,
        amount: transferAmount,
        currency: currency || 'INR',
        on_hold: false
      }]
    };

    razorpay.orders.create(options, (err, order) => {
      if (err) {
        console.error('Error creating Razorpay order:', err);
        return reject(err);
      }
      console.log('Order created:', order);
      resolve(order);
    });
  });
};

export const verifyRazorpayPayment = (order_id, payment_id, signature) => {
  console.log('Verifying Razorpay payment signature...');
  const body = order_id + '|' + payment_id;
  const expectedSignature = crypto
    .createHmac('sha256', razorpay.key_secret)
    .update(body.toString())
    .digest('hex');
  const isValid = expectedSignature === signature;
  console.log('Razorpay payment signature verified:', isValid);
  return isValid;
};

export const createInstantTransfer = async (paymentId, linkedAccountId, amount, currency = 'INR') => {
  try {
    const transferAmount = Math.round(amount * 100);
    const transfer = await razorpay.payments.transfer(paymentId, {
      transfers: [{
        account: linkedAccountId,
        amount: transferAmount,
        currency: currency,
        on_hold: false,
        notes: {
          purpose: "instant_commission_transfer"
        }
      }]
    });
    console.log('Instant transfer created:', transfer);
    return transfer;
  } catch (error) {
    console.error('Error creating instant transfer:', error);
    throw error;
  }
};
export const createOrder = async (amount) => {
  if (!amount || amount <= 0) {
    throw new Error('Invalid amount');
  }

  const options = {
    amount: Math.round(amount * 100),
    currency: 'INR',
    receipt: 'receipt_' + Date.now(),
  };

  try {
    const order = await razorpay.orders.create(options);
    return order;
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    throw error;
  }
};

// Add function to check transfer status
export const checkTransferStatus = async (transferId) => {
  try {
    console.log('Checking transfer status for:', transferId);
    const transfer = await razorpay.transfers.fetch(transferId);
    console.log('Transfer status:', transfer.status);
    return transfer;
  } catch (error) {
    console.error('Error checking transfer status:', error);
    throw error;
  }
};

// Add function to reverse transfer if needed
export const reverseTransfer = async (transferId, amount = null) => {
  try {
    console.log('Reversing transfer:', transferId);
    const reversal = await razorpay.transfers.reverse(transferId, {
      amount: amount ? Math.round(amount * 100) : undefined
    });
    console.log('Transfer reversed successfully:', reversal);
    return reversal;
  } catch (error) {
    console.error('Error reversing transfer:', error);
    throw error;
  }
};

// Add function to fetch all transfers for a payment
export const getPaymentTransfers = async (paymentId) => {
  try {
    console.log('Fetching transfers for payment:', paymentId);
    const transfers = await razorpay.payments.fetchTransfers(paymentId);
    console.log('Transfers fetched successfully:', transfers);
    return transfers;
  } catch (error) {
    console.error('Error fetching payment transfers:', error);
    throw error;
  }
};