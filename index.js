import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import paymentRoutes from './routes/paymentRoutes.js';
import invoiceRoutes from './routes/invoiceRoutes.js';
import cors from 'cors';
import multer from 'multer';

const app = express();
const port = process.env.PORT || 5000;

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Enable CORS
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:5500',
    /^http:\/\/localhost:\d{4}$/
  ],
    credentials: true,
    optionsSuccessStatus: 200,
}));

// Built-in express body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// Multer setup for file uploads
const upload = multer();
app.use(upload.fields([
    { name: 'bannerImageUrl', maxCount: 1 },
    { name: 'businessLogoUrl', maxCount: 1 },
    { name: 'galleryImageUrls', maxCount: 10 }
]));


// Use payment routes
app.use('/api/payments', paymentRoutes);
app.use('/api/invoices', invoiceRoutes);

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
    console.log(`Server running at http://localhost:${port}`);
});