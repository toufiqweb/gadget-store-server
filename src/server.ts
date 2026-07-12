import app from './app';
import { env } from './config/env';

if (process.env.NODE_ENV !== 'production') {
  app.listen(env.PORT, () => {
    console.log(`Server is running on port ${env.PORT}`);
  });
}
