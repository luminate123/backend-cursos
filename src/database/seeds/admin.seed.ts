import { DataSource, DataSourceOptions } from 'typeorm';
import { config } from 'dotenv';
import { SeederService } from './seeder.service';

config();

// Runner CLI de `pnpm seed`. SeederService solo necesita un DataSource, así que
// se instancia a mano sin levantar el contenedor de Nest: una sola definición
// del catálogo para el arranque de la app y para la línea de comandos.
const databaseUrl = process.env.DATABASE_URL;
const options: DataSourceOptions = databaseUrl
  ? { type: 'postgres', url: databaseUrl, ssl: { rejectUnauthorized: false } }
  : {
      type: 'postgres',
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
      username: process.env.POSTGRES_USER || 'edutech',
      password: process.env.POSTGRES_PASSWORD || 'edutech123',
      database: process.env.POSTGRES_DB || 'edutech_db',
    };

async function main() {
  const db = await new DataSource(options).initialize();
  try {
    await new SeederService(db).seed();
  } finally {
    await db.destroy();
  }
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
