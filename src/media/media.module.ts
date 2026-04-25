import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client } from '@aws-sdk/client-s3';
import { MediaService } from './media.service';
import { MediaController } from './media.controller';
import { S3_CLIENT } from './media.constants';

@Module({
  controllers: [MediaController],
  providers: [
    {
      provide: S3_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const endpoint = config.get<string>('S3_ENDPOINT');
        const region = config.get<string>('S3_REGION') || 'us-east-1';
        const accessKeyId = config.get<string>('S3_ACCESS_KEY');
        const secretAccessKey = config.get<string>('S3_SECRET_KEY');

        if (!endpoint || !accessKeyId || !secretAccessKey) {
          throw new Error('S3/MinIO is not configured');
        }

        return new S3Client({
          endpoint,
          region,
          forcePathStyle: config.get<string>('S3_FORCE_PATH_STYLE') !== 'false',
          credentials: { accessKeyId, secretAccessKey },
        });
      },
    },
    MediaService,
  ],
  exports: [MediaService, S3_CLIENT],
})
export class MediaModule {}
