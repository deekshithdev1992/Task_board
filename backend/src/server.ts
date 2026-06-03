import http from 'http';
import express from 'express';
import { router } from './routes.js';
import cardsRouter from './controllers/cards.controller.js';
import { authMiddleware } from './middleware/auth.js';
import { initializeRealtime } from './realtime/index.js';

const app = express();
app.use(express.json());
app.use('/api', router);
app.use('/api', authMiddleware, cardsRouter);

const port = Number(process.env.PORT ?? 4000);
const server = http.createServer(app);
initializeRealtime(server);
server.listen(port, () => {
  console.log(`Backend listening on http://localhost:${port}`);
});
