// razorpayUtils.js
import Razorpay from 'razorpay';
import crypto from 'crypto';

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

export const createLinkedAccountRequest = async (accountDetails) => {
  try {
    console.log('Creating linked account using Razorpay API...', accountDetails);
    const response = await razorpay.accounts.create(accountDetails);
    console.log('Linked account created successfully:', response);
    return response;
  } catch (error) {
    console.error('Error creating linked account:', error);
    throw error;
  }
};

export const createRazorpayOrder = (amount, currency, receipt, linkedAccountId, commissionAmount) => {
  console.log('Creating Razorpay order with transfer details...');
  return new Promise((resolve, reject) => {
    const transferAmount = commissionAmount * 100;
    const options = {
      amount: amount * 100,
      currency,
      receipt,
      transfers: [
        {
          account: linkedAccountId,
          amount: transferAmount,
          currency: "INR",
        }
      ]
    };

    razorpay.orders.create(options, (err, order) => {
      if (err) {
        console.error('Error creating Razorpay order with transfer:', err);
        return reject(err);
      }
      console.log('Razorpay order created successfully with transfer details:', order);
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

export const createOrder = async (amount) => {
  const options = {
    amount: amount * 100,
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

export const verifyPayment = async (orderId, paymentId, signature) => {
  const body = orderId + '|' + paymentId;
  const expectedSignature = crypto
    .createHmac('sha256', razorpay.key_secret)
    .update(body.toString())
    .digest('hex');
  return expectedSignature === signature;
};