import { Notification } from '../../domain/entities/Notification';
import { BaseRepository } from './BaseRepository';

export class NotificationRepository extends BaseRepository<Notification> {
  constructor() {
    super(Notification);
  }

  async createNotification(data: Partial<Notification>): Promise<Notification> {
    return this.create(data);
  }

  async findByUser(userId: string, userType: string): Promise<Notification[]> {
    return this.repository.find({
      where: { userId, userType },
      order: { createdAt: 'DESC' }
    });
  }

  async markAsRead(id: string): Promise<void> {
    await this.repository.update(id, { isRead: true } as Partial<Notification>);
  }

  async markAllAsRead(userId: string, userType: string): Promise<void> {
    await this.repository
      .createQueryBuilder()
      .update(Notification)
      .set({ isRead: true })
      .where('userId = :userId', { userId })
      .andWhere('userType = :userType', { userType })
      .andWhere('isRead = :isRead', { isRead: false })
      .execute();
  }

  async getUnreadCount(userId: string, userType: string): Promise<number> {
    return this.repository.count({
      where: { userId, userType, isRead: false }
    });
  }
}
