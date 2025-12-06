import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Welcome to File Storage API! Visit /api for Swagger documentation.';
  }
}
