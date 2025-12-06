// Example: Complete User Factory with all features
import { Factory } from '@ackplus/nest-file-storage';

export class UserFactory {
  // Simple faker-based generation
  @Factory((faker) => faker.internet.email())
  email: string;

  @Factory((faker) => faker.person.firstName())
  firstName: string;

  @Factory((faker) => faker.person.lastName())
  lastName: string;

  // Dependent field - uses firstName and lastName
  @Factory((faker, ctx) => {
    return `${ctx.firstName}.${ctx.lastName}@example.com`.toLowerCase();
  }, ['firstName', 'lastName'])
  username: string;

  // Static value
  @Factory('user')
  role: string;

  // Random boolean
  @Factory((faker) => faker.datatype.boolean())
  isActive: boolean;

  // Password with specific length
  @Factory((faker) => faker.internet.password({ length: 12 }))
  password: string;

  // Phone number
  @Factory((faker) => faker.phone.number())
  phone: string;

  // Date in the past
  @Factory((faker) => faker.date.past({ years: 2 }))
  createdAt: Date;

  // Random from array
  @Factory((faker) => faker.helpers.arrayElement(['pending', 'active', 'suspended']))
  status: string;

  // Complex object
  @Factory((faker) => ({
    street: faker.location.streetAddress(),
    city: faker.location.city(),
    state: faker.location.state(),
    zipCode: faker.location.zipCode(),
    country: faker.location.country(),
  }))
  address: object;

  // Array of values
  @Factory((faker) => faker.helpers.arrayElements(['reading', 'gaming', 'sports', 'music'], { min: 1, max: 3 }))
  interests: string[];
}

