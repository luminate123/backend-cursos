import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const databaseUrl = configService.get<string>('DATABASE_URL');
        const base = {
          type: 'postgres' as const,
          autoLoadEntities: true,
          synchronize: false,
          logging: configService.get<string>('NODE_ENV') !== 'production',
          migrations: [__dirname + '/migrations/*{.ts,.js}'],
          migrationsRun: true,
          ssl: databaseUrl ? { rejectUnauthorized: false } : false,
        };
        if (databaseUrl) {
          return { ...base, url: databaseUrl };
        }
        return {
          ...base,
          host: configService.get<string>('POSTGRES_HOST'),
          port: configService.get<number>('POSTGRES_PORT'),
          username: configService.get<string>('POSTGRES_USER'),
          password: configService.get<string>('POSTGRES_PASSWORD'),
          database: configService.get<string>('POSTGRES_DB'),
        };
      },
    }),
  ],
})
export class DatabaseModule {}