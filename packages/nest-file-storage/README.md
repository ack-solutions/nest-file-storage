# @ackplus/nest-file-storage

A powerful and flexible database seeding library for NestJS applications with support for factories, data generation using Faker.js, and CLI commands.

## ✨ Features

- 🌱 **CLI-Based** - Simple command-line interface, no app code modifications needed
- 🏭 **Factory Pattern** - Generate realistic test data with Faker.js
- 🔄 **Multiple ORMs** - Support for TypeORM, Mongoose, and Prisma
- 📦 **Batch Operations** - Efficient bulk data insertion
- 🎯 **Selective Seeding** - Run specific seeders by name
- 🔥 **Refresh Mode** - Drop existing data before seeding
- 🧪 **Test-Friendly** - Perfect for testing and development
- 📝 **TypeScript** - Full TypeScript support with type safety

## 📦 Installation

```bash
npm install @ackplus/nest-file-storage @faker-js/faker
# or
pnpm add @ackplus/nest-file-storage @faker-js/faker
# or
yarn add @ackplus/nest-file-storage @faker-js/faker
```

**For TypeScript config files**, also install:

```bash
npm install -D ts-node typescript
```

## 🚀 Quick Start (5 Steps)

### Step 1: Create Entity

```typescript
// src/entities/user.entity.ts
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column()
  role: string;
}
```

### Step 2: Create Factory

```typescript
// src/factories/user.factory.ts
import { Factory } from '@ackplus/nest-file-storage';

export class UserFactory {
  @Factory((faker) => faker.person.fullName())
  name: string;

  @Factory((faker) => faker.internet.email())
  email: string;

  @Factory((faker) => faker.helpers.arrayElement(['admin', 'user', 'guest']))
  role: string;
}
```

### Step 3: Create Seeder

```typescript
// src/seeders/user.seeder.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Seeder, DataFactory } from '@ackplus/nest-file-storage';
import { User } from '../entities/user.entity';
import { UserFactory } from '../factories/user.factory';

@Injectable()
export class UserSeeder implements Seeder {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async seed(): Promise<void> {
    // Create factory instance
    const factory = DataFactory.createForClass(UserFactory);

    // Generate 10 users
    const users = factory.generate(10);

    // Save to database
    await this.userRepository.save(users);
    
    console.log('✅ Seeded 10 users');
  }

  async drop(): Promise<void> {
    // Clear all users
    await this.userRepository.delete({});
    
    console.log('🗑️  Dropped all users');
  }
}
```

### Step 4: Create Configuration File

Create `seeder.config.ts` in your **project root**:

```typescript
// seeder.config.ts
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './src/entities/user.entity';
import { UserSeeder } from './src/seeders/user.seeder';

export default {
  imports: [
    // Database configuration
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      password: 'postgres',
      database: 'mydb',
      entities: [User],
      synchronize: true,
    }),
    
    // Register repositories
    TypeOrmModule.forFeature([User]),
  ],
  
  // List seeders (run in order)
  seeders: [UserSeeder],
};
```

### Step 5: Run Seeder

Add script to `package.json`:

```json
{
  "scripts": {
    "seed": "nest-seed -c seeder.config.ts"
  }
}
```

Run it:

```bash
npm run seed
```

**That's it!** Your database is now seeded! 🎉

## 🖥️ CLI Commands

### Basic Usage

```bash
# Run all seeders
nest-seed -c seeder.config.ts

# Drop and reseed
nest-seed -c seeder.config.ts --refresh

# Run specific seeder
nest-seed -c seeder.config.ts --name UserSeeder

# Run multiple seeders
nest-seed -c seeder.config.ts --name UserSeeder ProductSeeder
```

### Available Options

| Option | Alias | Description | Default |
|--------|-------|-------------|---------|
| `--config` | `-c` | Path to configuration file | (required) |
| `--refresh` | `-r` | Drop data before seeding | `false` |
| `--name` | `-n` | Run specific seeder(s) | (all) |
| `--dummyData` | `-d` | Include dummy data flag | `false` |
| `--help` | `-h` | Show help | |

### Package.json Scripts

```json
{
  "scripts": {
    "seed": "nest-seed -c seeder.config.ts",
    "seed:refresh": "nest-seed -c seeder.config.ts -r",
    "seed:users": "nest-seed -c seeder.config.ts -n UserSeeder",
    "seed:watch": "nodemon --watch src/seeders --ext ts --exec nest-seed -c seeder.config.ts"
  }
}
```

## ⚙️ Configuration

### TypeORM Example

```typescript
// seeder.config.ts
import { TypeOrmModule } from '@nestjs/typeorm';
import { User, Post, Comment } from './src/entities';
import { UserSeeder, PostSeeder, CommentSeeder } from './src/seeders';

export default {
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5432,
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'mydb',
      entities: [User, Post, Comment],
      synchronize: true,
    }),
    TypeOrmModule.forFeature([User, Post, Comment]),
  ],
  seeders: [UserSeeder, PostSeeder, CommentSeeder],
};
```

### MongoDB/Mongoose Example

```typescript
// seeder.config.ts
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './src/schemas/user.schema';
import { UserSeeder } from './src/seeders/user.seeder';

export default {
  imports: [
    MongooseModule.forRoot('mongodb://localhost/mydb'),
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema }
    ]),
  ],
  seeders: [UserSeeder],
};
```

### SQLite Example

```typescript
// seeder.config.ts
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './src/entities/user.entity';
import { UserSeeder } from './src/seeders/user.seeder';

export default {
  imports: [
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: 'database.sqlite',
      entities: [User],
      synchronize: true,
    }),
    TypeOrmModule.forFeature([User]),
  ],
  seeders: [UserSeeder],
};
```

## 🏭 Factories

### Basic Factory

```typescript
import { Factory } from '@ackplus/nest-file-storage';

export class UserFactory {
  @Factory((faker) => faker.person.fullName())
  name: string;

  @Factory((faker) => faker.internet.email())
  email: string;

  @Factory((faker) => faker.datatype.number({ min: 18, max: 80 }))
  age: number;
}
```

### Using Factory

```typescript
import { DataFactory } from '@ackplus/nest-file-storage';
import { UserFactory } from './user.factory';

// Create factory
const factory = DataFactory.createForClass(UserFactory);

// Generate one object
const user = factory.generate(1)[0];

// Generate multiple objects
const users = factory.generate(10);

// Generate with overrides
const admin = factory.generate(1, { role: 'admin' })[0];
```

### Factory with Relationships

```typescript
import { Factory } from '@ackplus/nest-file-storage';

export class PostFactory {
  @Factory((faker) => faker.lorem.sentence())
  title: string;

  @Factory((faker) => faker.lorem.paragraphs(3))
  content: string;

  // Will be set manually in seeder
  authorId: number;
}
```

## 🌱 Seeders

### Basic Seeder

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Seeder, DataFactory } from '@ackplus/nest-file-storage';
import { User } from '../entities/user.entity';
import { UserFactory } from '../factories/user.factory';

@Injectable()
export class UserSeeder implements Seeder {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async seed(): Promise<void> {
    const factory = DataFactory.createForClass(UserFactory);
    const users = factory.generate(10);
    await this.userRepository.save(users);
  }

  async drop(): Promise<void> {
    await this.userRepository.delete({});
  }
}
```

### Seeder with Relationships

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Seeder, DataFactory } from '@ackplus/nest-file-storage';
import { User } from '../entities/user.entity';
import { Post } from '../entities/post.entity';
import { UserFactory } from '../factories/user.factory';
import { PostFactory } from '../factories/post.factory';

@Injectable()
export class PostSeeder implements Seeder {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Post)
    private readonly postRepository: Repository<Post>,
  ) {}

  async seed(): Promise<void> {
    // Get existing users
    const users = await this.userRepository.find();
    
    if (users.length === 0) {
      console.log('⚠️  No users found. Run UserSeeder first.');
      return;
    }

    // Create posts for each user
    const postFactory = DataFactory.createForClass(PostFactory);
    
    for (const user of users) {
      // Generate 3 posts per user
      const posts = postFactory.generate(3).map(post => ({
        ...post,
        author: user,
      }));
      
      await this.postRepository.save(posts);
    }
    
    console.log(`✅ Seeded ${users.length * 3} posts`);
  }

  async drop(): Promise<void> {
    await this.postRepository.delete({});
  }
}
```

### Conditional Seeding

```typescript
import { Injectable } from '@nestjs/common';
import { Seeder, SeederServiceOptions, DataFactory } from '@ackplus/nest-file-storage';

@Injectable()
export class UserSeeder implements Seeder {
  async seed(options?: SeederServiceOptions): Promise<void> {
    const factory = DataFactory.createForClass(UserFactory);
    
    // Seed more data if dummyData flag is set
    const count = options?.dummyData ? 100 : 10;
    const users = factory.generate(count);
    
    await this.userRepository.save(users);
    console.log(`✅ Seeded ${count} users`);
  }

  async drop(): Promise<void> {
    await this.userRepository.delete({});
  }
}
```

Run with dummy data:

```bash
nest-seed -c seeder.config.ts --dummyData
```

### MongoDB/Mongoose Seeder

```typescript
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Seeder, DataFactory } from '@ackplus/nest-file-storage';
import { User } from '../schemas/user.schema';
import { UserFactory } from '../factories/user.factory';

@Injectable()
export class UserSeeder implements Seeder {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<User>,
  ) {}

  async seed(): Promise<void> {
    const factory = DataFactory.createForClass(UserFactory);
    const users = factory.generate(10);
    await this.userModel.insertMany(users);
  }

  async drop(): Promise<void> {
    await this.userModel.deleteMany({});
  }
}
```

## 🔥 Advanced Examples

### Custom Providers in Config

```typescript
// seeder.config.ts
import { CustomService } from './src/services/custom.service';

export default {
  imports: [
    TypeOrmModule.forRoot({ /* ... */ }),
    TypeOrmModule.forFeature([User]),
  ],
  seeders: [UserSeeder],
  providers: [CustomService], // Inject custom services
};
```

### Environment-Based Configuration

```typescript
// seeder.config.ts
import * as dotenv from 'dotenv';
dotenv.config();

const isDev = process.env.NODE_ENV === 'development';

export default {
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST,
      database: isDev ? 'mydb_dev' : 'mydb_prod',
      synchronize: isDev,
    }),
    TypeOrmModule.forFeature([User, Post]),
  ],
  seeders: isDev 
    ? [UserSeeder, PostSeeder, TestDataSeeder]
    : [UserSeeder, PostSeeder],
};
```

### Batch Insert for Performance

```typescript
@Injectable()
export class UserSeeder implements Seeder {
  async seed(): Promise<void> {
    const factory = DataFactory.createForClass(UserFactory);
    const batchSize = 1000;
    const totalRecords = 10000;
    
    for (let i = 0; i < totalRecords; i += batchSize) {
      const users = factory.generate(batchSize);
      await this.userRepository.save(users);
      console.log(`✅ Seeded ${Math.min(i + batchSize, totalRecords)}/${totalRecords} users`);
    }
  }

  async drop(): Promise<void> {
    await this.userRepository.delete({});
  }
}
```

## 📚 API Reference

### DataFactory

```typescript
class DataFactory {
  // Create factory for a class
  static createForClass<T>(factoryClass: new () => T): DataFactory<T>
  
  // Generate instances
  generate(count: number, override?: Partial<T>): T[]
}
```

### Seeder Interface

```typescript
interface Seeder {
  // Seed data into database
  seed(options?: SeederServiceOptions): Promise<void>
  
  // Drop/clear data from database
  drop(options?: SeederServiceOptions): Promise<void>
}
```

### @Factory Decorator

```typescript
// Simple factory
@Factory((faker) => faker.person.fullName())
name: string;

// With options
@Factory((faker) => faker.datatype.number({ min: 1, max: 100 }))
age: number;

// Array values
@Factory((faker) => faker.helpers.arrayElement(['admin', 'user']))
role: string;
```

### SeederServiceOptions

```typescript
interface SeederServiceOptions {
  refresh?: boolean;      // Drop before seeding
  name?: string[];        // Run specific seeders
  dummyData?: boolean;    // Custom flag for your logic
}
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- Built with [NestJS](https://nestjs.com/)
- Powered by [Faker.js](https://fakerjs.dev/)
- Inspired by database seeding patterns from Laravel and other frameworks

## 📮 Support

If you have any questions or need help:
- Open an issue on [GitHub](https://github.com/ackplus/nest-file-storage/issues)
- Check the [examples](./examples/) directory
- Review the [Quick Start Guide](./QUICKSTART.md)

---

Made with ❤️ for the NestJS community
