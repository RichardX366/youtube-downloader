import express from 'express';
import attachMiddleware, { handleError } from 'rx-express-middleware';
import { config } from 'dotenv';

config({
  path: __dirname + '/../.env',
});

export const app = express();
attachMiddleware(app);

import baseRouter from './routes';

app.use(baseRouter);

app.use(handleError());

app.listen(process.env.PORT || 3005, () =>
  console.log(`Open the website: http://localhost:${process.env.PORT || 3005}`),
);
