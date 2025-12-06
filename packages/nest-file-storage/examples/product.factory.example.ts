// Example: Product Factory with complex data structures
import { Factory } from '@ackplus/nest-file-storage';

export class ProductFactory {
  @Factory((faker) => faker.commerce.productName())
  name: string;

  @Factory((faker) => faker.commerce.productDescription())
  description: string;

  // Generate slug from name
  @Factory((faker, ctx) => {
    return ctx.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }, ['name'])
  slug: string;

  // Price as number
  @Factory((faker) => parseFloat(faker.commerce.price({ min: 10, max: 1000 })))
  price: number;

  // Stock quantity
  @Factory((faker) => faker.number.int({ min: 0, max: 1000 }))
  stock: number;

  // Category
  @Factory((faker) => faker.helpers.arrayElement([
    'electronics',
    'clothing',
    'food',
    'books',
    'toys',
    'sports',
  ]))
  category: string;

  // Rating
  @Factory((faker) => faker.number.float({ min: 1, max: 5, precision: 0.1 }))
  rating: number;

  // Image URLs array
  @Factory((faker) => {
    const count = faker.number.int({ min: 1, max: 5 });
    return Array.from({ length: count }, () => faker.image.url());
  })
  images: string[];

  // Complex metadata object
  @Factory((faker) => ({
    weight: faker.number.float({ min: 0.1, max: 100, precision: 0.1 }),
    dimensions: {
      width: faker.number.int({ min: 1, max: 100 }),
      height: faker.number.int({ min: 1, max: 100 }),
      depth: faker.number.int({ min: 1, max: 100 }),
    },
    material: faker.commerce.productMaterial(),
    color: faker.color.human(),
  }))
  metadata: object;

  // Tags array
  @Factory((faker) => faker.helpers.arrayElements(
    ['new', 'sale', 'featured', 'bestseller', 'limited'],
    { min: 0, max: 3 }
  ))
  tags: string[];

  // Boolean flags
  @Factory((faker) => faker.datatype.boolean())
  isActive: boolean;

  @Factory((faker) => faker.datatype.boolean())
  isFeatured: boolean;

  // Dates
  @Factory((faker) => faker.date.past())
  createdAt: Date;

  @Factory((faker) => faker.date.recent())
  updatedAt: Date;
}

