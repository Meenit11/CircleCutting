import express from 'express';
import cors from 'cors';
import { optimizeRoute } from './routes/optimize.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.post('/api/optimize', optimizeRoute);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'circle-cutting-api' });
});

app.listen(PORT, () => {
  console.log(`Circle Cutting API running on port ${PORT}`);
});
