import { Injectable } from '@nestjs/common';

@Injectable()
export class NotificationsProcessor {
  // Placeholder for queue processing (Bull/RabbitMQ)
  // Will process queued notifications and update status
  process() {
    return { message: 'Notification processor not yet implemented' };
  }
}