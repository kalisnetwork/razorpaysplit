// index.js
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';

// Import routes
import paymentRoutes from './routes/paymentRoutes.js';
import linkedAccountRoutes from './routes/linkedAccountRoutes.js';
import invoiceRoutes from './routes/invoiceRoutes.js';

const app = express();
const port = process.env.PORT || 5000;

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(express.static(path.join(__dirname, 'public')));

// CORS configuration
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
    credentials: true,
    optionsSuccessStatus: 200,
}));

// Body parsing middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Routes
app.use('/api/payments', paymentRoutes);
app.use('/api/linked-accounts', linkedAccountRoutes);
app.use('/api/invoices', invoiceRoutes);

// Welcome route
app.get('/', (req, res) => {
    res.json({
        message: 'Welcome to the Payment Integration API',
        version: '1.0.0',
        endpoints: {
            payments: '/api/payments',
            linkedAccounts: '/api/linked-accounts',
            invoices: '/api/invoices'
        }
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal Server Error',
        error: process.env.NODE_ENV === 'development' ? err : {}
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
});

// Start server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
    console.log('Available endpoints:');
    console.log('- /api/payments');
    console.log('- /api/linked-accounts');
    console.log('- /api/invoices');
});

export default app;