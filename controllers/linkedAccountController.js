// controllers/LinkedAccountController.js
import { makeRazorpayRequest } from '../utils/razorpayUtils.js';
import { db } from '../utils/firebase.js';
import admin from 'firebase-admin';

// Basic validations
const validatePhone = (phone) => /^[0-9]{10}$/.test(phone);
const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export const createLinkedAccount = async (req, res) => {
  console.log('\n=== Starting Linked Account Creation ===');
  console.log('Request Body:', JSON.stringify(req.body, null, 2));

  try {
      const {
          email,
          phone,
          legal_business_name,
          contact_name,
          legal_info,
          profile,
          business_type = 'public_limited', // Set default
          customer_facing_business_name
      } = req.body;

      // Basic validation
      if (!email || !phone || !legal_business_name || !contact_name) {
          return res.status(400).json({
              success: false,
              error: 'Missing required fields',
              details: 'Email, phone, business name, and contact name are required'
          });
      }

      // Prepare account data
      const accountData = {
          email: email.toLowerCase().trim(),
          phone: phone.startsWith('+') ? phone.trim() : `+91${phone.trim()}`,
          type: 'route',
          reference_id: `ref_${Date.now()}`,
          legal_business_name: legal_business_name.trim(),
          business_type: business_type,
          contact_name: contact_name.trim(),
          customer_facing_business_name: customer_facing_business_name || legal_business_name,
          profile: {
              category: profile?.category || 'healthcare',
              subcategory: profile?.subcategory || 'clinic',
              addresses: {
                  registered: {
                      street1: profile?.addresses?.registered?.street1 || '',
                      street2: profile?.addresses?.registered?.street2 || '',
                      city: profile?.addresses?.registered?.city || '',
                      state: (profile?.addresses?.registered?.state || '').toUpperCase(),
                      postal_code: profile?.addresses?.registered?.postal_code || '',
                      country: 'IN'
                  }
              }
          },
          legal_info: {
              pan: legal_info?.pan ? legal_info.pan.toUpperCase().trim() : '',
              gst: legal_info?.gst ? legal_info.gst.trim().toUpperCase() : ''
          },
          notes: []
      };

      console.log('\nPrepared Account Data for Razorpay:');
      console.log(JSON.stringify(accountData, null, 2));

      const response = await makeRazorpayRequest('POST', '/accounts', accountData);
      const accountId = response.id;

      // Prepare Firestore document with exact structure
      const firestoreData = {
          business_type: response.business_type || 'public_limited',
          contact_name: response.contact_name,
          created_at: Math.floor(Date.now() / 1000), // Unix timestamp in seconds
          customer_facing_business_name: response.customer_facing_business_name,
          email: response.email,
          id: response.id,
          legal_business_name: response.legal_business_name,
          legal_info: {
              pan: response.legal_info?.pan || ''
          },
          notes: response.notes || [],
          phone: response.phone,
          profile: {
              addresses: {
                  registered: {
                      city: response.profile?.addresses?.registered?.city || '',
                      country: response.profile?.addresses?.registered?.country || 'IN',
                      postal_code: response.profile?.addresses?.registered?.postal_code || '',
                      state: (response.profile?.addresses?.registered?.state || '').toUpperCase(),
                      street1: response.profile?.addresses?.registered?.street1 || '',
                      street2: response.profile?.addresses?.registered?.street2 || ''
                  }
              },
              category: response.profile?.category || 'healthcare',
              subcategory: response.profile?.subcategory || 'clinic'
          },
          reference_id: response.reference_id,
          status: response.status || 'created',
          type: response.type || 'route'
      };

      // Save to Firestore with exact structure
      await db.collection('linkedAccounts').doc(accountId).set(firestoreData);

      console.log('Successfully saved to Firestore with structure:', firestoreData);

      return res.status(200).json({
          success: true,
          account: firestoreData
      });

  } catch (error) {
      console.error('\n=== Error Creating Linked Account ===');
      console.error('Error:', error);

      if (error.error?.code === 'BAD_REQUEST_ERROR') {
          return res.status(400).json({
              success: false,
              error: 'Razorpay Validation Error',
              details: error.error.description
          });
      }

      return res.status(500).json({
          success: false,
          error: 'Failed to create linked account',
          details: error.message
      });
  }
};

export const createStakeholder = async (req, res) => {
    const { accountId } = req.params;
    const {
      name,
      email,
      phone,
      addresses,
      kyc
    } = req.body;

    try {
      if (!accountId) {
        return res.status(400).json({ 
          success: false,
          error: 'accountId is missing. Create a linked account first.' 
        });
      }

      // Validate required fields
      if (!name || !email || !phone) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields',
          details: 'Name, email, and phone are required'
        });
      }

      // Validate formats
      if (!validateEmail(email)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid email format'
        });
      }

      if (!validatePhone(phone)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid phone number format'
        });
      }

      const stakeholderData = {
        name,
        email,
        phone,
        addresses: addresses || {
          residential: {
            street: 'Default Street',
            city: 'Default City',
            state: 'Default State',
            postal_code: '000000',
            country: 'IN'
          }
        },
        kyc: kyc || {}
      };
  
      const response = await makeRazorpayRequest('POST', `/accounts/${accountId}/stakeholders`, stakeholderData);
      const stakeholderId = response.id;
  
      await db.collection('linkedAccounts').doc(accountId)
        .collection('stakeholders').doc(stakeholderId)
        .set({
          ...response,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
  
      console.log('Stakeholder created successfully:', stakeholderId);
      res.status(200).json({
        success: true,
        stakeholder: response
      });
    } catch (error) {
      console.error('Failed to create stakeholder:', error);
      if (error.error?.code === 'BAD_REQUEST_ERROR') {
        return res.status(400).json({
          success: false,
          error: 'Validation Error',
          details: error.error.description,
          field: error.error.field
        });
      }
      res.status(500).json({ 
        success: false,
        error: 'Failed to create stakeholder', 
        details: error.message 
      });
    }
};

export const requestProductConfiguration = async (req, res) => {
    const { accountId } = req.params;
    try {
      if (!accountId) {
        return res.status(400).json({ 
          success: false,
          error: 'accountId is missing. Create a linked account first.' 
        });
      }
  
      const data = {
        product_name: req.body.product_name || 'route',
        tnc_accepted: true
      };

      const response = await makeRazorpayRequest('POST', `/accounts/${accountId}/products`, data);
      const productId = response.id;
  
      await db.collection('linkedAccounts').doc(accountId)
        .collection('productConfigurations').doc(productId)
        .set({
          ...response,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
  
      console.log('Product configuration requested successfully:', productId);
      res.status(200).json({
        success: true,
        product: response
      });
    } catch (error) {
      console.error('Failed to request product configuration:', error);
      if (error.error?.code === 'BAD_REQUEST_ERROR') {
        return res.status(400).json({
          success: false,
          error: 'Validation Error',
          details: error.error.description
        });
      }
      res.status(500).json({ 
        success: false,
        error: 'Failed to request product configuration', 
        details: error.message 
      });
    }
};

export const updateProductConfiguration = async (req, res) => {
    const { accountId, productId } = req.params;
    try {
      if (!accountId || !productId) {
        return res.status(400).json({ 
          success: false,
          error: 'accountId or productId is missing.' 
        });
      }
  
      const data = req.body;
      const response = await makeRazorpayRequest('PATCH', `/accounts/${accountId}/products/${productId}`, data);
  
      await db.collection('linkedAccounts').doc(accountId)
        .collection('productConfigurations').doc(productId)
        .update({
          ...response,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
  
      console.log('Product configuration updated successfully:', productId);
      res.json({
        success: true,
        product: response
      });
    } catch (error) {
      console.error('Failed to update product configuration:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to update product configuration', 
        details: error.message 
      });
    }
};

export const transferFunds = async (req, res) => {
    const { accountId } = req.body;
    try {
      if (!accountId) {
        return res.status(400).json({ 
          success: false,
          error: 'accountId is missing. Create a linked account first.' 
        });
      }
  
      const data = { 
        account: accountId, 
        amount: req.body.amount, 
        currency: req.body.currency || 'INR' 
      };
      const response = await makeRazorpayRequest('POST', '/transfers', data);
  
      await db.collection('linkedAccounts').doc(accountId)
        .collection('transfers')
        .add({
          ...response,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
  
      console.log('Funds transferred successfully:', response.id);
      res.status(200).json({
        success: true,
        transfer: response
      });
    } catch (error) {
      console.error('Failed to transfer funds:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to transfer funds', 
        details: error.message 
      });
    }
};

// Add a method to fetch linked account details
export const getLinkedAccountDetails = async (req, res) => {
    const { accountId } = req.params;
    try {
        const accountDoc = await db.collection('linkedAccounts').doc(accountId).get();
        
        if (!accountDoc.exists) {
            return res.status(404).json({
                success: false,
                error: 'Linked account not found'
            });
        }

        const stakeholdersSnapshot = await accountDoc.ref.collection('stakeholders').get();
        const productsSnapshot = await accountDoc.ref.collection('productConfigurations').get();
        
        const stakeholders = [];
        stakeholdersSnapshot.forEach(doc => stakeholders.push({ id: doc.id, ...doc.data() }));
        
        const products = [];
        productsSnapshot.forEach(doc => products.push({ id: doc.id, ...doc.data() }));

        res.status(200).json({
            success: true,
            account: {
                ...accountDoc.data(),
                stakeholders,
                products
            }
        });
    } catch (error) {
        console.error('Failed to fetch linked account details:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch linked account details',
            details: error.message
        });
    }
};