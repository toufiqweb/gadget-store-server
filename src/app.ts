import express, { Request, Response } from 'express';
import { corsConfig } from './config/cors';
import routes from './routes';
import { connectDB } from './config/db';

const app = express();

app.use(corsConfig);
app.use(express.json());

// Connect to MongoDB in the background
connectDB();

app.use('/api', routes);

app.get('/', (req: Request, res: Response) => {
  res.send('Gadget Store API is running and connected to MongoDB');
});

export default app;
