import cors from 'cors';
import { env } from './env';

export const corsConfig = cors({
  origin: [
    "http://localhost:3000",
    env.CLIENT_URL
  ],
  credentials: true,
});
