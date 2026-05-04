import { Module, Logger, Inject, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, HeadBucketCommand, CreateBucketCommand } from '@aws-sdk/client-s3';
import { MediaService } from './media.service';
import { MediaController } from './media.controller';
import { S3_CLIENT } from './media.constants';

const logger = new Logger('MediaModule');

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
export class MediaModule implements OnModuleInit {
  constructor(
    @Inject(S3_CLIENT) private readonly s3: S3Client,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit() {
    const bucket = this.config.get<string>('S3_BUCKET') || 'superflow-media';
    try {
      await this.s3.send(new HeadBucketCommand({ Bucket: bucket }));
      logger.log(`S3 bucket "${bucket}" exists ✓`);
    } catch {
      logger.warn(`S3 bucket "${bucket}" not found — creating…`);
      await this.s3.send(new CreateBucketCommand({ Bucket: bucket }));
      logger.log(`S3 bucket "${bucket}" created ✓`);
    }
  }
}
