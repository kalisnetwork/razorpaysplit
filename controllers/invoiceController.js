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

        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: "User not found in either collection" 
            });
        }

        // Check for creationTime property or set a default
        if (!user.createdAt || !user.createdAt._seconds) {
            console.warn("Missing creation time, setting default value");
            user.createdAt = {
                _seconds: Math.floor(Date.now() / 1000), // Use current time as default
                _nanoseconds: 0,
            };
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

        // Send email
        const response = await invoiceService.sendEmail(
            user,
            paymentId,
            amount,
            invoiceId
        );

        // Save invoice details
        await firestoreInstance.collection('sentInvoices').add({
            email: email,
            invoiceId: invoiceId,
            paymentId: paymentId,
            amount: amount,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            user: user,
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

// Adding new functions to handle payment processing and invoice update

export const handleSplitPaymentInvoice = async (req, res) => {
    try {
        const paymentResult = await processPayment(req, res);
        if (!paymentResult.success) {
            return;
        }

        const { email, paymentId, amount } = req.body;
        console.log('Updating invoice after split payment:', { email, paymentId, amount });
        await sendInvoiceEmail(req, res);
    } catch (error) {
        console.error('Error handling split payment invoice:', error);
        res.status(500).json({ success: false, message: 'Failed to handle split payment invoice', error: error.message });
    }
};

export const handleDirectPaymentInvoice = async (req, res) => {
    try {
        const paymentResult = await directPaymentOrder(req, res);
        if (!paymentResult.success) {
            return;
        }

        const { email, paymentId, amount } = req.body;
        console.log('Updating invoice after direct payment:', { email, paymentId, amount });
        await sendInvoiceEmail(req, res);
    } catch (error) {
        console.error('Error handling direct payment invoice:', error);
        res.status(500).json({ success: false, message: 'Failed to handle direct payment invoice', error: error.message });
    }
};
