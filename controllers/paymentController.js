// controllers/paymentController.js
import { createRazorpayOrder, verifyRazorpayPayment, createOrder, createLinkedAccountRequest } from '../utils/razorpayUtils.js';
import { db } from '../utils/firebase.js';
import admin from 'firebase-admin';
import { firebaseConfig } from '../config/config.js';


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
                    await db.collection('BusinessTransactions').doc(payment.id).set({
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
      const newAccount = await createLinkedAccountRequest(req.body);  // Changed to use the renamed function
      try {
        console.log('Attempting to write to Firestore...');
        await db.collection('LinkedAccounts').doc(newAccount.id).set(
          {
            ...newAccount,
          },
          { merge: true }
        );
        console.log(`Linked account data saved successfully in Firestore for account ID: ${newAccount.id}`);
        res.status(201).json({ success: true, account: newAccount });
      } catch (error) {
        console.error(`Failed to update linked account status for account ID: ${newAccount.id}`, error);
        res.status(500).json({ success: false, message: 'Failed to create linked account' });
      }
    } catch (error) {
      console.error('Failed to create linked account ', error);
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


export const uploadFiles = async (req, res) => {
  try {
      const files = req.files;
      console.log('Received files:', req.files);  // Add logging
      const storage = admin.storage().bucket(firebaseConfig.storageBucket);
      const uploadAndGetUrl = async (file, name) => {
          if (!file) return null;
          const fileName = `${name}-${Date.now()}-${file.originalname}`;
          const fileRef = storage.file(fileName);
          await fileRef.createWriteStream().end(file.buffer);
          return fileRef.getSignedUrl({ action: 'read', expires: '12-31-2499' }).then((signedUrls) => signedUrls[0]);
      };
      const frontAadhaarCardUrl = files.frontAadhaarCard ? await uploadAndGetUrl(files.frontAadhaarCard[0], "frontAadhaarCard") : null;
      const backAadhaarCardUrl = files.backAadhaarCard ? await uploadAndGetUrl(files.backAadhaarCard[0], "backAadhaarCard") : null;
      const panCardUrl = files.panCard ? await uploadAndGetUrl(files.panCard[0], "panCard") : null;
      const passportPhotoUrl = files.passportPhoto ? await uploadAndGetUrl(files.passportPhoto[0], "passportPhoto") : null;
      res.status(200).json({ success: true, frontAadhaarCardUrl, backAadhaarCardUrl, panCardUrl, passportPhotoUrl });
  } catch (error) {
      console.error('Error uploading files:', error);  // Add detailed logging
      res.status(500).json({ success: false, message: 'Failed to upload files', error: error });
  }
};



export const createUserDocument = async (req, res) => {
    const { email, name, mobileNumber, alternativeMobileNumber, religion, gender, dateOfBirth, 
        address, bankAccountNumber, reEnterBankAccountNumber, ifscCode, bankName, 
        bankHolderName, references, agreementChecked, frontAadhaarCardUrl, backAadhaarCardUrl, panCardUrl, passportPhotoUrl  } = req.body;

  console.log("Data before saving", req.body);

  try {

    const userRef = db.collection('businessListers').doc(email); 
    const userDoc = await userRef.get();

    if (userDoc.exists) {
      await userRef.update({
        name: name || userDoc.data().name,
        mobileNumber: mobileNumber || userDoc.data().mobileNumber,
        alternativeMobileNumber: alternativeMobileNumber || userDoc.data().alternativeMobileNumber,
        religion: religion || userDoc.data().religion,
        gender: gender || userDoc.data().gender,
        dateOfBirth: dateOfBirth || userDoc.data().dateOfBirth,
        address: address || userDoc.data().address,
        frontAadhaarCard: frontAadhaarCardUrl || userDoc.data().frontAadhaarCard,
        backAadhaarCard: backAadhaarCardUrl || userDoc.data().backAadhaarCard,
        bankAccountNumber: bankAccountNumber || userDoc.data().bankAccountNumber,
        reEnterBankAccountNumber: reEnterBankAccountNumber || userDoc.data().reEnterBankAccountNumber,
        ifscCode: ifscCode || userDoc.data().ifscCode,
        bankName: bankName || userDoc.data().bankName,
        bankHolderName: bankHolderName || userDoc.data().bankHolderName,
        panCard: panCardUrl || userDoc.data().panCard,
        passportPhoto: passportPhotoUrl || userDoc.data().passportPhoto,
        references: references || userDoc.data().references,
        agreementChecked: agreementChecked || userDoc.data().agreementChecked,
        updateTime: admin.firestore.FieldValue.serverTimestamp()
      });
    } else {
      await db.collection('businessListers').doc(email).set({
        email: email,
        name: name,
        mobileNumber: mobileNumber || null,
        alternativeMobileNumber: alternativeMobileNumber || null,
        religion: religion || null,
        gender: gender || null,
        dateOfBirth: dateOfBirth || null,
        address: address || null,
        frontAadhaarCard: frontAadhaarCardUrl,
        backAadhaarCard: backAadhaarCardUrl,
        bankAccountNumber: bankAccountNumber || null,
        reEnterBankAccountNumber: reEnterBankAccountNumber || null,
        ifscCode: ifscCode || null,
        bankName: bankName || null,
        bankHolderName: bankHolderName || null,
        panCard: panCardUrl || null,
        passportPhoto: passportPhotoUrl || null,
        references: references || null,
        agreementChecked: agreementChecked || null,
        creationTime: admin.firestore.FieldValue.serverTimestamp(),
        listings: [],
      });
    }

    console.log(`User document ${userDoc.exists ? 'updated' : 'created'} in Firestore`);
    res.status(201).json({ success: true, message: `User document ${userDoc.exists ? 'updated' : 'created'} successfully` });
  } catch (error) {
    console.error('Failed to create/update user document', error);
    res.status(500).json({ success: false, message: 'Failed to create/update user document', error:error });
  }
};


export const getFirebaseConfig = async (req, res) => {
    try {
        res.status(200).json({ success: true, firebaseConfig: firebaseConfig })
    } catch (error) {
        console.error("failed to get firebase config ", error);
        res.status(500).json({ success: false, message: "Failed to get config", error: error })
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
        res.status(500).json({ success: false, message: 'Failed to fetch user details', error:error });
    }
};


export const directPaymentOrder = async (req, res) => {
    try {
        const { amount } = req.body;
        const order = await createOrder(amount);
        res.status(201).json({ success: true, order });
        console.log('Direct payment order created successfully, order ID:', order.id);
    } catch (error) {
        console.error('Error creating direct payment order:', error);
        res.status(500).json({ success: false, message: 'Failed to create direct payment order', error:error });
    }
};