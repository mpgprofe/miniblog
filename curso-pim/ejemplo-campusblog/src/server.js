import { createApp } from './app.js';
import { openDb } from './db.js';
import { seed } from './seed.js';

const db = openDb();
if (process.env.SEED === '1') seed(db);
const port = Number(process.env.PORT ?? 3000);
createApp(db).listen(port, () => console.log(`CampusBlog escuchando en http://localhost:${port}`));
