import http from 'http';
import express from 'express';
import { router } from './routes.js';
import cardsRouter, { setCardService } from './controllers/cards.controller.js';
import { authMiddleware } from './middleware/auth.js';
import { initializeRealtime } from './realtime/index.js';
import { initDatabase } from './database/init.js';
import { CardService as CardServiceImpl } from './services/cardService.js';

async function start() {
  const app = express();
  app.use(express.json());
  app.use('/api', router);
  app.use('/api', authMiddleware, cardsRouter);

  const db = await initDatabase();
  const cardService: CardServiceImpl = new CardServiceImpl(db);
  // strictFunctionTypes prevents direct assignment (contravariant params),
  // but the class structurally matches the controller's interface at runtime
  setCardService(cardService as unknown as Parameters<typeof setCardService>[0]);

  const port = Number(process.env.PORT ?? 4000);
  const server = http.createServer(app);
  initializeRealtime(server);
  server.listen(port, () => {
    console.log(`Backend listening on http://localhost:${port}`);
  });
}

start();
