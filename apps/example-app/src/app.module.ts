import { Module } from '@nestjs/common';
import { NestFileStorageModule, FileStorageEnum } from '@ackplus/nest-file-storage';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { FileController } from './file.controller';

@Module({
  imports: [
    // Configure file storage with local storage
    NestFileStorageModule.forRoot({
      storage: FileStorageEnum.LOCAL,
      localConfig: {
        rootPath: './uploads',
        baseUrl: 'http://localhost:3000/uploads',
      },
    }),
  ],
  controllers: [AppController, FileController],
  providers: [AppService],
})
export class AppModule {}
