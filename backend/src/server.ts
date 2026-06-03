import express from 'express';
import { router } from './routes.js';

const app = express();
app.use(express.json());
app.use('/api', router);

const port = Number(process.env.PORT ?? 4000);
app.listen(port, () => {
  console.log(`Backend listening on http://localhost:${port}`);
});
