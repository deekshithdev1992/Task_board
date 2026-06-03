import express from 'express';

export const router = express.Router();

router.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

router.get('/cards/:cardId', (_req, res) => {
  res.status(501).json({ error: 'Card detail endpoint not implemented yet' });
});
