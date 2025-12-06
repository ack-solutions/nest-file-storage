// Example: Seeder configuration file for CLI
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

// Import entities
import { User } from '../entities/user.entity';
import { Post } from '../entities/post.entity';
import { Comment } from '../entities/comment.entity';

// Import seeders
import { UserSeeder } from '../seeders/user.seeder';
import { PostSeeder } from '../seeders/post.seeder';
import { CommentSeeder } from '../seeders/comment.seeder';

export default {
  imports: [
    // Load environment variables
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Configure TypeORM
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('DB_HOST', 'localhost'),
        port: config.get('DB_PORT', 5432),
        username: config.get('DB_USERNAME', 'postgres'),
        password: config.get('DB_PASSWORD', 'postgres'),
        database: config.get('DB_DATABASE', 'mydb'),
        entities: [User, Post, Comment],
        synchronize: config.get('DB_SYNCHRONIZE', true),
      }),
    }),

    // Register entities
    TypeOrmModule.forFeature([User, Post, Comment]),
  ],

  // Register seeders in order of execution
  seeders: [
    UserSeeder,    // Run first (no dependencies)
    PostSeeder,    // Run second (depends on users)
    CommentSeeder, // Run third (depends on posts and users)
  ],
};

