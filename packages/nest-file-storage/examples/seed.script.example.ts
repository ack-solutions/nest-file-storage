// Example: Programmatic seeding script
import { NestFactory } from '@nestjs/core';
import { SeederService } from '@ackplus/nest-file-storage';
import { AppModule } from './app.module';

async function bootstrap() {
  console.log('🚀 Starting database seeding...\n');

  // Create NestJS application context
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  try {
    // Get the seeder service
    const seeder = app.get(SeederService);

    // Run all seeders
    await seeder.run();

    console.log('\n✅ Database seeding completed successfully!');
  } catch (error) {
    console.error('\n❌ Database seeding failed:');
    console.error(error);
    process.exit(1);
  } finally {
    await app.close();
  }
}

bootstrap();

