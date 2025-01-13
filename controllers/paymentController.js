// controllers/paymentController.js
import { createRazorpayOrder, createLinkedAccount, fetchLinkedAccountById, verifyRazorpayPayment } from '../utils/razorpayUtils.js';
import { db } from '../utils/firebase.js';
import admin from 'firebase-admin';
import { firebaseConfig } from '../config/config.js';

// Initialize Firebase Admin (if not already initialized)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
}

export const processPayment = async (req, res) => {
  console.log('Processing payment request:', req.body);
  try {
    const { amount, currency, receipt, linkedAccountId, commissionAmount, order_id, payment_id, signature } = req.body;
    if (order_id && payment_id && signature) {
      const isValid = verifyRazorpayPayment(order_id, payment_id, signature);
      if (!isValid) {
        res.status(400).json({ success: false, message: 'Payment signature verification failed' });
        return;
      }

      try {
        const order = await createRazorpayOrder(amount, currency, receipt, linkedAccountId, commissionAmount);

        try {
          console.log('Attempting to write to Firestore...');
          await db.collection('BusinessTransactions').doc(payment_id).set({
            status: 'captured',
            amount: amount,
            currency: currency,
            orderId: order_id,
            transfer: order.transfers.length > 0 ? order.transfers[0] : null,
            captured_at: admin.firestore.FieldValue.serverTimestamp(),
          }, { merge: true });
          console.log(`Payment status updated successfully for payment ID: ${payment_id}`);
          res.status(200).json({
            success: true,
            order,
            paymentId: payment_id,
            message: `Payment captured successfully for payment ID: ${payment_id}`,
          });
        } catch (error) {
          console.error(`Failed to update payment status for payment ID: ${payment_id}`, error);
          res.status(500).json({
            success: false,
            order,
            message: 'Failed to update payment status',
          });
        }
      } catch (error) {
        console.error('Error creating order, payment verification successful but failed to process payment and transfer:', error);
        res.status(500).json({ success: false, message: 'Failed to create payment order' });
      }
    } else {
      const order = await createRazorpayOrder(amount, currency, receipt, linkedAccountId, commissionAmount);
      res.status(200).json({
        success: true,
        order,
      });
      console.log('Payment processed successfully, order ID:', order.id);
    }
  } catch (error) {
    console.error('Error processing payment:', error);
    res.status(500).json({ success: false, message: 'Payment processing failed' });
  }
};

export const createNewLinkedAccount = async (req, res) => {
  console.log('Creating new Linked account ', req.body);
  try {
    const newAccount = await createLinkedAccount(req.body);
    try {
      console.log('Attempting to write to Firestore...');
      await db.collection('LinkedAccounts').doc(newAccount.id).set(
        {
          ...newAccount,
        },
        { merge: true }
      );
      console.log(`Linked account data saved successfully in firestore for account ID: ${newAccount.id}`);
      res.status(201).json({ success: true, account: newAccount });
    } catch (error) {
      console.error(`Failed to update linked account status for account ID: ${newAccount.id}`, error);
      res.status(500).json({ success: false, message: 'Failed to create linked account' });
    }
  } catch (error) {
    console.error('failed to create linked account ', error);
    res.status(500).json({ success: false, message: 'Failed to create linked account' });
  }
};

export const getLinkedAccountDetails = async (req, res) => {
   const { email, phone } = req.body;
  try {
       console.log("Fetching linked account details", email, phone)
      const linkedAccountSnapshot = await db.collection('LinkedAccounts')
          .where('email', '==', email || "")
        .where('phone', '==', phone || "")
            .get();

        if (linkedAccountSnapshot.empty) {
            console.log("No linked account found with matching email or phone")
          return res.status(404).json({ success: false, message: 'No linked account found with matching email or phone' });
       }

      let linkedAccount = null;
       linkedAccountSnapshot.forEach(doc => {
        linkedAccount = { id: doc.id, ...doc.data() }
      });

        console.log(`Fetched linked account details from Firestore`, linkedAccount);
      res.status(200).json({ success: true, account: linkedAccount });
    } catch (error) {
        console.error('Error fetching linked account details:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch linked account details' });
    }
};

export const handlePaymentWebhook = async (req, res) => {
  console.log('Payment Webhook called', req.body);
  const event = req.body;

  if (event.event === 'payment.captured') {
    const payment = event.payload.payment.entity;
    console.log(`Payment captured successfully for payment ID: ${payment.id}`);
    try {
      console.log('Attempting to write to Firestore...');
      await db.collection('BusinessTransactions').doc(payment.id).set(
        {
          status: 'captured',
          amount: payment.amount,
          currency: payment.currency,
          orderId: payment.orderId,
          transfer: payment.transfers && payment.transfers.length > 0 ? payment.transfers[0] : null,
          captured_at: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      console.log(`Payment status updated successfully for payment ID: ${payment.id}`);
      res.status(200).json({ success: true, message: `Payment captured successfully for payment ID: ${payment.id}` });
    } catch (error) {
      console.error(`Failed to update payment status for payment ID: ${payment.id}`, error);
      res.status(500).json({ success: false, message: 'Failed to update payment status' });
    }

    return;
  }
  console.log(`Ignoring event type ${event.event}`);
  res.status(200).json({ success: true, message: 'webhook received' });
};

export const createNewListing = async (req, res) => {
    try {
        const listing = req.body;
        const userId = listing.listedBy;

        // Validate userId
        if (!userId || typeof userId !== 'string' || userId.trim() === '') {
            console.error('Invalid userId:', userId);
            return res.status(400).json({ success: false, message: 'Invalid userId' });
        }

        // Directly use URLs from the request body
        const bannerImageUrl = listing.bannerImageUrl;
        const businessLogoUrl = listing.businessLogoUrl;
        const galleryImageUrls = listing.galleryImageUrls;

        // Create the listing
        const docRef = await db.collection('businessListings').add(listing);

        // Update the user's listings
        const userRef = db.collection('businessListers').doc(userId);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
            console.error('User document does not exist for userId:', userId);
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Separate the timestamp addition
        await userRef.update({
            listings: admin.firestore.FieldValue.arrayUnion({ id: docRef.id }),
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        res.status(201).json({ success: true, message: 'Listing created successfully', listingId: docRef.id });
    } catch (error) {
        console.error('Failed to create new business listing', error);
        res.status(500).json({ success: false, message: 'Failed to create listing' });
    }
};


export const fetchUserListings = async (req, res) => {
    const userId = req.params.userId;
    try {
        console.log(`Fetching listings for user ID ${userId} from Firestore...`);
        const listingsSnapshot = await db.collection('businessListings').where('listedBy', '==', userId).get();
        
        if (listingsSnapshot.empty) {
            console.log(`No listings found for user ID: ${userId}`);
            return res.status(404).json({ success: false, message: 'No listings found' });
        }

        let listings = [];
        listingsSnapshot.forEach(doc => {
            listings.push({ id: doc.id, ...doc.data() });
        });

        console.log(`Fetched listings for user ID ${userId} from Firestore`, listings);
        res.status(200).json({ success: true, listings });
    } catch (error) {
        console.error('Error fetching user listings:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch user listings' });
    }
};

export const createUserDocument = async (req, res) => {
  const { uid, email, displayName, phone, account_number, ifsc_code, bank_name, branch_name, beneficiary_name } = req.body;
  try {
    await db.collection('businessListers').doc(uid).set(
      {
        uid: uid,
        email: email,
        displayName: displayName,
         phone: phone,
          account_number: account_number || '',
           ifsc_code: ifsc_code || '',
           bank_name: bank_name || '',
          branch_name: branch_name || '',
         beneficiary_name: beneficiary_name || '',
        creationTime: admin.firestore.FieldValue.serverTimestamp(),
        listings: [],
      },
      { merge: true }
    );
    console.log(`User created in firestore for id ${uid}`);
    res.status(201).json({ success: true, message: 'User document created successfully' });
  } catch (error) {
    console.error('failed to create user document ', error);
    res.status(500).json({ success: false, message: 'failed to create user document' });
  }
};

export const getFirebaseConfig = async (req, res) => {
  try {
       res.status(200).json({ success: true, firebaseConfig: firebaseConfig })
  } catch (error) {
     console.error("failed to get firebase config ", error);
    res.status(500).json({ success: false, message: "Failed to get config" })
  }
}

export const fetchUserDetails = async (req, res) => {
    const userId = req.params.userId;
    try {
        const userDoc = await db.collection('businessListers').doc(userId).get();
      if (!userDoc.exists) {
         console.log("User not found");
           return res.status(404).json({ success: false, message: 'User not found' });
        }
      const userDetails = userDoc.data();
        console.log(`Fetched user details for ID ${userId} from Firestore`, userDetails);
        res.status(200).json({ success: true, ...userDetails });
    } catch (error) {
        console.error('Error fetching user details:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch user details' });
    }
};