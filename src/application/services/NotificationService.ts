import { Notification } from '../../domain/entities/Notification';
import { NotificationRepository } from '../../infrastructure/repositories/NotificationRepository';

export class NotificationService {
  private notificationRepository = new NotificationRepository();

  async createNotification(
    userId: string,
    userType: 'customer' | 'carrier',
    type: string,
    title: string,
    message: string,
    relatedId?: string
  ): Promise<Notification> {
    return this.notificationRepository.createNotification({
      userId,
      userType,
      type,
      title,
      message,
      relatedId: relatedId || undefined,
      isRead: false
    });
  }

  async getNotifications(userId: string, userType: 'customer' | 'carrier'): Promise<Notification[]> {
    return this.notificationRepository.findByUser(userId, userType);
  }

  async markRead(id: string): Promise<void> {
    await this.notificationRepository.markAsRead(id);
  }

  async markAllRead(userId: string, userType: 'customer' | 'carrier'): Promise<void> {
    await this.notificationRepository.markAllAsRead(userId, userType);
  }

  async getUnreadCount(userId: string, userType: 'customer' | 'carrier'): Promise<number> {
    return this.notificationRepository.getUnreadCount(userId, userType);
  }
}
