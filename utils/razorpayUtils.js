// utils/razorpayUtils.js
import Razorpay from 'razorpay';
import crypto from 'crypto';

const razorpay = new Razorpay({
    key_id: 'rzp_live_LtxqAtCR7grTov',
    key_secret: 'nmn17cT5dCnAvXWauzLIXLuW',
});

export const createRazorpayOrder = (amount, currency, receipt, linkedAccountId, commissionAmount) => {
  console.log('Creating Razorpay order with transfer details...');
  return new Promise((resolve, reject) => {
        const transferAmount = commissionAmount * 100
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

export const createLinkedAccount = async (accountDetails) => {
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

export const fetchLinkedAccountById = async (accountId) => {
  try {
    console.log(`Fetching linked account details for id ${accountId} from Razorpay API...`);
      const response = await razorpay.accounts.fetch(accountId);
       console.log(`Fetched linked account for id ${accountId} from Razorpay API: `, response);
    return response;
  } catch (error) {
      console.error(`Error fetching linked account details for id ${accountId}:`, error);
      throw error
  }
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