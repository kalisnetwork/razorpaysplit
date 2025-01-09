// utils/razorpayUtils.js
import Razorpay from 'razorpay';

const razorpay = new Razorpay({
  key_id: 'rzp_live_LtxqAtCR7grTov',
  key_secret: 'nmn17cT5dCnAvXWauzLIXLuW',
});

export const createRazorpayOrder = (amount, currency, receipt, linkedAccountId) => {
  console.log('Creating Razorpay order with transfer details...');
  return new Promise((resolve, reject) => {
    const options = {
      amount: amount * 100,
      currency,
      receipt,
      transfers: [
          {
              account: linkedAccountId,
              amount: (amount * 0.5) * 100,
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