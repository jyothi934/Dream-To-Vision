require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const { generalLimiter } = require('./middleware/rateLimiter');
const { errorHandler, notFound } = require('./middleware/errorHandler');

const healthRouter = require('./routes/health');
const dreamsRouter = require('./routes/dreams');
const videosRouter = require('./routes/videos');

const app = express();

// ── Security ──────────────────────────────────────────────
app.use(helmet());

// ── CORS ──────────────────────────────────────────────────
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  'http://localhost:5173',
  'http://localhost:3000',
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origin ${origin} not allowed`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// ── Body parsing ──────────────────────────────────────────
// Note: multer handles multipart/form-data separately in routes/videos.js
// JSON limit raised to 50kb for metadata; file uploads bypass this via multer
app.use(express.json({ limit: '50kb' }));
app.use(express.urlencoded({ extended: true, limit: '50kb' }));

// ── Logging ───────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// ── Rate limiting ─────────────────────────────────────────
app.use(generalLimiter);

// ── Routes ────────────────────────────────────────────────
app.use('/api/health', healthRouter);
app.use('/api/dreams', dreamsRouter);
app.use('/api', videosRouter);

// ── 404 + Error handlers ──────────────────────────────────
app.use(notFound);
app.use(errorHandler);

module.exports = app;
