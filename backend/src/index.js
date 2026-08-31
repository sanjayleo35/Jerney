require('dotenv').config();
const express = require('express');
const cors = require('cors');
const postRoutes = require('./routes/posts');
const commentRoutes = require('./routes/comments');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Jerney API is vibing ✨' });
});

// Routes
app.use('/api/posts', postRoutes);
app.use('/api/comments', commentRoutes);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Jerney backend running on port ${PORT}`);
});
