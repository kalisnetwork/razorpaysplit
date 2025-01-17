import { makeRazorpayRequest } from '../utils/razorpayUtils.js';
import { db } from '../utils/firebase.js';

export const createLinkedAccount = async (req, res) => {
  try {
    const data = req.body;
    const response = await makeRazorpayRequest('POST', '/accounts', data);
    const accountId = response.id;
    
    await db.collection('linkedAccounts').doc(accountId).set(response);
    
    res.status(201).json(response);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create linked account', details: error.message });
  }
};

export const createStakeholder = async (req, res) => {
    const { accountId } = req.params;
    try {
      if (!accountId) {
        return res.status(400).json({ error: 'accountId is missing. Create a linked account first.' });
      }
  
      const data = req.body;
      const response = await makeRazorpayRequest('POST', `/accounts/${accountId}/stakeholders`, data);
      const stakeholderId = response.id;
  
      await db.collection('linkedAccounts').doc(accountId).collection('stakeholders').doc(stakeholderId).set(response);
  
      res.status(201).json(response);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create stakeholder', details: error.message });
    }
};

export const requestProductConfiguration = async (req, res) => {
    const { accountId } = req.params;
    try {
      if (!accountId) {
        return res.status(400).json({ error: 'accountId is missing. Create a linked account first.' });
      }
  
      const data = req.body;
      const response = await makeRazorpayRequest('POST', `/accounts/${accountId}/products`, data);
      const productId = response.id;
  
      await db.collection('linkedAccounts').doc(accountId).collection('productConfigurations').doc(productId).set(response);
  
      res.status(201).json(response);
    } catch (error) {
      res.status(500).json({ error: 'Failed to request product configuration', details: error.message });
    }
};

export const updateProductConfiguration = async (req, res) => {
    const { accountId, productId } = req.params;
    try {
      if (!accountId || !productId) {
        return res.status(400).json({ error: 'accountId or productId is missing.' });
      }
  
      const data = req.body;
      const response = await makeRazorpayRequest('PATCH', `/accounts/${accountId}/products/${productId}`, data);
  
      await db.collection('linkedAccounts').doc(accountId).collection('productConfigurations').doc(productId).update(response);
  
      res.json(response);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update product configuration', details: error.message });
    }
};

export const transferFunds = async (req, res) => {
    const { accountId } = req.body;
    try {
      if (!accountId) {
        return res.status(400).json({ error: 'accountId is missing. Create a linked account first.' });
      }
  
      const data = { account: accountId, amount: req.body.amount, currency: 'INR' };
      const response = await makeRazorpayRequest('POST', '/transfers', data);
  
      await db.collection('linkedAccounts').doc(accountId).collection('transfers').add(response);
  
      res.status(201).json(response);
    } catch (error) {
      res.status(500).json({ error: 'Failed to transfer funds', details: error.message });
    }
};