// index.js
import express from 'express';
import bodyParser from 'body-parser';
import path from 'path'; // Import the path module
import { fileURLToPath } from 'url'; // Import fileURLToPath
import paymentRoutes from './routes/paymentRoutes.js';

const app = express();

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use('/api/payments', paymentRoutes);


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`server run on http://localhost:${PORT}`);
});