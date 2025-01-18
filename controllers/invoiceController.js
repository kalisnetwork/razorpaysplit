// invoiceController.js
import { adminInstance } from '../utils/firebase.js';
import invoiceService from '../services/invoiceService.js';
import admin from 'firebase-admin';
import { processPayment, directPaymentOrder } from '../controllers/paymentController.js';

export const sendInvoiceEmail = async (req, res) => {
    const { email, paymentId, amount } = req.body;
    console.log("Received invoice request with:", { email, paymentId, amount });

    try {
        if (!adminInstance) {
            throw new Error("Firebase admin is not initialized");
        }

        const firestoreInstance = adminInstance.firestore();
        console.log('Querying Firestore for user:', email);

        // Try users collection
        let userDoc = await firestoreInstance
            .collection("users")
            .where("email", "==", email)
            .get();

        let user = null;

        if (!userDoc.empty) {
            user = userDoc.docs[0].data();
            console.log('User found in users collection', user);
        } else {
            // Try businessListers collection
            userDoc = await firestoreInstance
                .collection("businessListers")
                .where("email", "==", email)
                .get();
                
            if (!userDoc.empty) {
                user = userDoc.docs[0].data();
                console.log('User found in businessListers collection', user);
            }
        }

        // Create current timestamp
        const currentTimestamp = {
            _seconds: Math.floor(Date.now() / 1000),
            _nanoseconds: (Date.now() % 1000) * 1000000
        };

        // Default user template
        const defaultUser = {
            email: email,
            fullName: email.split('@')[0],
            displayName: email.split('@')[0],
            phoneNumber: 'N/A',
            countryCode: '+91',
            createdAt: currentTimestamp,
            companyName: '',
            gstNo: '',
            bankDetails: null
        };

        // If user exists, merge with defaults while preserving existing values
        if (user) {
            user = {
                ...defaultUser,
                ...user,
                // Always ensure these critical fields exist and are properly formatted
                email: user.email || email,
                fullName: user.fullName || user.displayName || email.split('@')[0],
                displayName: user.displayName || user.fullName || email.split('@')[0],
                phoneNumber: user.phoneNumber || 'N/A',
                countryCode: user.countryCode || '+91',
                // Set createdAt with proper format
                createdAt: currentTimestamp
            };
        } else {
            user = defaultUser;
        }

        // Generate invoice ID
        const date = new Date();
        const formattedDate = date.toISOString().split("T")[0].replace(/-/g, "");
        const counterDocRef = firestoreInstance.collection("counters").doc(formattedDate);
        const counterDoc = await counterDocRef.get();

        let counter = 1;
        if (counterDoc.exists) {
            counter = counterDoc.data().counter + 1;
            await counterDocRef.update({ counter });
        } else {
            await counterDocRef.set({ counter });
        }

        const invoiceId = `INV-${formattedDate}-${String(counter).padStart(4, "0")}`;
        console.log(`Generated Invoice ID: ${invoiceId}`);

        let splitDetails = null;
        if (req.body.commissionAmount) {
            splitDetails = {
                commissionAmount: req.body.commissionAmount,
                transferDetails: req.body.transferDetails || "N/A",
            };
        }

        // Send email
        const response = await invoiceService.sendEmail(
            user,
            paymentId,
            amount,
            invoiceId,
            splitDetails
        );

        // Save invoice details
        await firestoreInstance.collection('sentInvoices').add({
            email: email,
            invoiceId: invoiceId,
            paymentId: paymentId,
            amount: amount,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            user: user,
            splitDetails: splitDetails,
        });

        console.log("Email sending was successful", response);
        res.json({ success: true, ...response, invoiceId });

    } catch (error) {
        console.error('Error in sendInvoiceEmail:', error);
        
        if (error.code === 16) {
            return res.status(401).json({
                success: false,
                message: "Authentication failed. Please check Firebase credentials.",
                error: error.message
            });
        }
        
        res.status(500).json({
            success: false,
            message: "Failed to process invoice request",
            error: error.message
        });
    }
};
