// Safe Sample #2: Secure API with Proper Validation
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { body, validationResult } from 'express-validator';
import jwt from 'jsonwebtoken';

const app = express();

// Security middleware
app.use(helmet());
app.use(express.json({ limit: '1mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use('/api/', limiter);

// Authentication middleware
function authenticate(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (e) {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// Secure endpoint with validation
app.post('/api/users', 
  authenticate,
  [
    body('email').isEmail().normalizeEmail(),
    body('name').trim().isLength({ min: 1, max: 100 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { email, name } = req.body;
    // Use parameterized query (safe)
    const result = await db.query(
      'INSERT INTO users (email, name) VALUES (?, ?)',
      [email, name]
    );
    
    res.json({ id: result.insertId, email, name });
  }
);

export default app;
