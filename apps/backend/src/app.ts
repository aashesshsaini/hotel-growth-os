import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import routes from './routes';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler';

const app = express();

app.use(helmet());
app.use(cors({ origin: config.cors.origin, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(config.env === 'production' ? 'combined' : 'dev'));
app.use(rateLimit({ windowMs: config.rateLimit.windowMs, max: config.rateLimit.max }));

app.get('/health', (_req, res) => {
  res.json({ success: true, message: 'Hotel Growth OS API is healthy' });
});

app.use(config.apiPrefix, routes);
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
