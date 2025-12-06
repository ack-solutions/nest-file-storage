// seeder.config.ts - Place this file in your project root
// This is the recommended way to configure seeders

import { TypeOrmModule } from '@nestjs/typeorm';
// Import your entities
import { User } from './src/database/entities/user.entity';
import { Post } from './src/database/entities/post.entity';

// Import your seeders
import { UserSeeder } from './src/database/seeders/user.seeder';
import { PostSeeder } from './src/database/seeders/post.seeder';

export default {
  imports: [
    // Configure your database connection
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5432,
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_DATABASE || 'mydb',
      entities: [User, Post],
      synchronize: true,
    }),
    
    // Register entities for injection
    TypeOrmModule.forFeature([User, Post]),
  ],
  
  // List your seeders in order of execution
  seeders: [
    UserSeeder,  // Run first
    PostSeeder,  // Run second (depends on users)
  ],
};

