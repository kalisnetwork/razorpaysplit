// controllers/paymentController.js
import { createRazorpayOrder, verifyRazorpayPayment, createOrder, checkTransferStatus as razorpayCheckTransferStatus } from '../utils/razorpayUtils.js';
import { db } from '../utils/firebase.js';
import admin from 'firebase-admin';
import Razorpay from 'razorpay';

// Initialize Razorpay
const razorpay = new Razorpay({
    key_id: 'rzp_live_LtxqAtCR7grTov',
    key_secret: 'nmn17cT5dCnAvXWauzLIXLuW',
});

export const processPayment = async (req, res) => {
    console.log('Processing payment request:', req.body);
    try {
        const { 
            amount, 
            currency = 'INR',
            linkedAccountId, 
            commissionAmount,
            upiId, // Add UPI ID
            order_id,
            payment_id,
            signature 
        } = req.body;

        // Payment verification flow
        if (order_id && payment_id && signature) {
            const isValid = verifyRazorpayPayment(order_id, payment_id, signature);
            if (!isValid) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Payment signature verification failed' 
                });
            }

            try {
                // Store transaction details first
                const transactionData = {
                    status: 'captured',
                    totalAmount: amount,
                    currency: currency,
                    orderId: order_id,
                    paymentId: payment_id,
                    mainAmount: amount - (commissionAmount || 0),
                    captured_at: admin.firestore.FieldValue.serverTimestamp(),
                    notes: {
                        type: 'split_payment'
                    }
                };

                // Process UPI transfer if commission exists
                if (commissionAmount && upiId) {
                    transactionData.commissionDetails = {
                        amount: commissionAmount,
                        upiId: upiId,
                        status: 'pending'
                    };

                    try {
                        // Create instant UPI transfer
                        const transferResult = await createInstantUPITransfer(
                            commissionAmount,
                            upiId,
                            `comm_${payment_id}`
                        );

                        if (transferResult.success) {
                            transactionData.commissionDetails.status = 'processed';
                            transactionData.commissionDetails.payoutId = transferResult.payout.id;
                            transactionData.commissionDetails.transferDetails = transferResult.payout;
                            transactionData.notes.commission_transferred = true;
                        }
                    } catch (transferError) {
                        console.error('UPI transfer failed:', transferError);
                        transactionData.commissionDetails.status = 'failed';
                        transactionData.commissionDetails.error = transferError.message;
                    }
                }

                // Save to Firestore
                await db.collection('BusinessTransactions').doc(payment_id).set(transactionData);

                return res.status(200).json({
                    success: true,
                    message: 'Payment processed successfully',
                    data: {
                        paymentId: payment_id,
                        totalAmount: amount,
                        commissionAmount: commissionAmount,
                        mainAmount: amount - (commissionAmount || 0),
                        transfer: transactionData.commissionDetails || null
                    }
                });

            } catch (error) {
                console.error('Error in payment/transfer:', error);
                return res.status(500).json({ 
                    success: false, 
                    message: 'Payment processed but transfer failed',
                    error: error.message 
                });
            }
        } 
        
        // Initial order creation
        else {
            if (!amount) {
                return res.status(400).json({
                    success: false,
                    message: 'Amount is required'
                });
            }

            // Create order with transfer configuration
            const orderData = {
                amount: Math.round(amount * 100),
                currency: currency,
                receipt: `rcpt_${Date.now()}`,
                transfers: linkedAccountId && commissionAmount ? [{
                    account: linkedAccountId,
                    amount: Math.round(commissionAmount * 100),
                    currency: currency,
                    on_hold: false
                }] : undefined
            };

            try {
                const order = await razorpay.orders.create(orderData);

                // Store order details
                await db.collection('PaymentOrders').doc(order.id).set({
                    ...order,
                    commission: linkedAccountId && commissionAmount ? {
                        accountId: linkedAccountId,
                        amount: commissionAmount
                    } : null,
                    created_at: admin.firestore.FieldValue.serverTimestamp()
                });

                return res.status(200).json({
                    success: true,
                    order: order
                });
            } catch (orderError) {
                console.error('Order creation failed:', orderError);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to create order',
                    error: orderError.message
                });
            }
        }
    } catch (error) {
        console.error('Payment processing error:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Payment processing failed',
            error: error.message 
        });
    }
};

export const handlePaymentWebhook = async (req, res) => {
    const event = req.body;
    console.log('Webhook received:', event);

    try {
        switch (event.event) {
            case 'payment.captured':
                const payment = event.payload.payment.entity;
                await db.collection('BusinessTransactions')
                    .doc(payment.id)
                    .set({
                        status: 'captured',
                        payment_details: payment,
                        updated_at: admin.firestore.FieldValue.serverTimestamp()
                    }, { merge: true });
                break;

            case 'transfer.processed':
                const transfer = event.payload.transfer.entity;
                await db.collection('BusinessTransactions')
                    .where('transfer.id', '==', transfer.id)
                    .get()
                    .then(async (snapshots) => {
                        if (!snapshots.empty) {
                            await snapshots.docs[0].ref.update({
                                'commissionDetails.status': 'completed',
                                'transfer.status': transfer.status,
                                transfer_processed_at: admin.firestore.FieldValue.serverTimestamp()
                            });
                        }
                    });
                break;
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Webhook processing error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

export const getPaymentDetails = async (req, res) => {
    const { paymentId } = req.params;
    try {
        const paymentDoc = await db.collection('BusinessTransactions').doc(paymentId).get();
        
        if (!paymentDoc.exists) {
            return res.status(404).json({
                success: false,
                message: 'Payment record not found'
            });
        }

        return res.status(200).json({
            success: true,
            payment: paymentDoc.data()
        });
    } catch (error) {
        console.error('Error fetching payment details:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch payment details',
            error: error.message
        });
    }
};

export const directPaymentOrder = async (req, res) => {
    try {
        const { amount, currency = 'INR' } = req.body;
        
        if (!amount) {
            return res.status(400).json({
                success: false,
                message: 'Amount is required'
            });
        }

        const order = await createOrder(amount);
        console.log('Direct payment order created successfully, order ID:', order.id);
        
        return res.status(200).json({ 
            success: true, 
            order 
        });
    } catch (error) {
        console.error('Error creating direct payment order:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Failed to create direct payment order',
            error: error.message 
        });
    }
};

// Add new endpoint to check transfer status
export const getTransferStatus = async (req, res) => {
    try {
        const { transferId } = req.params;
        const transfer = await razorpayCheckTransferStatus(transferId);
        
        res.status(200).json({
            success: true,
            transfer
        });
    } catch (error) {
        console.error('Error checking transfer status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to check transfer status',
            error: error.message
        });
    }
};
