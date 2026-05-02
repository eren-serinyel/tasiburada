import { Notification } from '../../domain/entities/Notification';
import { BaseRepository } from './BaseRepository';
import { Brackets } from 'typeorm';

type NotificationListFilters = {
  page?: number;
  limit?: number;
  status?: string;
  type?: string;
  severity?: string;
};

export class NotificationRepository extends BaseRepository<Notification> {
  constructor() {
    super(Notification);
  }

  async createNotification(data: Partial<Notification>): Promise<Notification> {
    return this.create(data);
  }

  async findByUser(userId: string, userType: string): Promise<Notification[]> {
    const result = await this.listForRecipient(userId, userType, { page: 1, limit: 200 });
    return result.items;
  }

  async findByDedupeKey(dedupeKey: string): Promise<Notification | null> {
    if (!dedupeKey) return null;
    return this.repository.findOne({ where: { dedupeKey } });
  }

  async listForRecipient(userId: string, userType: string, filters: NotificationListFilters = {}) {
    const page = Math.max(1, Number(filters.page || 1));
    const limit = Math.min(200, Math.max(1, Number(filters.limit || 50)));

    const qb = this.repository
      .createQueryBuilder('n')
      .where(
        new Brackets((scopeQb) => {
          scopeQb
            .where('(n.recipientUserId = :userId AND n.recipientRole = :userType)', { userId, userType })
            .orWhere('(n.recipientUserId IS NULL AND n.userId = :legacyUserId AND n.userType = :legacyUserType)', {
              legacyUserId: userId,
              legacyUserType: userType,
            });
        }),
      );

    if (filters.status) {
      const status = filters.status.toLowerCase();
      if (status === 'read') {
        qb.andWhere('(n.status = :readStatus OR (n.status IS NULL AND n.isRead = true))', { readStatus: 'read' });
      } else if (status === 'unread') {
        qb.andWhere('(n.status = :unreadStatus OR (n.status IS NULL AND n.isRead = false))', { unreadStatus: 'unread' });
      } else {
        qb.andWhere('n.status = :status', { status });
      }
    }

    if (filters.type) {
      qb.andWhere('n.type = :type', { type: filters.type });
    }

    if (filters.severity) {
      qb.andWhere('n.severity = :severity', { severity: filters.severity });
    }

    qb.orderBy('n.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();
    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async markAsRead(id: string): Promise<void> {
    await this.repository
      .createQueryBuilder()
      .update(Notification)
      .set({
        isRead: true,
        status: 'read' as any,
        readAt: new Date(),
      } as any)
      .where('id = :id', { id })
      .execute();
  }

  async markAllAsRead(userId: string, userType: string): Promise<void> {
    await this.repository
      .createQueryBuilder()
      .update(Notification)
      .set({
        isRead: true,
        status: 'read' as any,
        readAt: new Date(),
      } as any)
      .where(
        new Brackets((scopeQb) => {
          scopeQb
            .where('(recipientUserId = :userId AND recipientRole = :userType)', { userId, userType })
            .orWhere('(recipientUserId IS NULL AND userId = :legacyUserId AND userType = :legacyUserType)', {
              legacyUserId: userId,
              legacyUserType: userType,
            });
        }),
      )
      .andWhere('(status = :unreadStatus OR (status IS NULL AND isRead = :isRead))', {
        unreadStatus: 'unread',
        isRead: false,
      })
      .execute();
  }

  async getUnreadCount(userId: string, userType: string): Promise<number> {
    const result = await this.repository
      .createQueryBuilder('n')
      .select('COUNT(*)', 'count')
      .where(
        new Brackets((scopeQb) => {
          scopeQb
            .where('(n.recipientUserId = :userId AND n.recipientRole = :userType)', { userId, userType })
            .orWhere('(n.recipientUserId IS NULL AND n.userId = :legacyUserId AND n.userType = :legacyUserType)', {
              legacyUserId: userId,
              legacyUserType: userType,
            });
        }),
      )
      .andWhere('(n.status = :unreadStatus OR (n.status IS NULL AND n.isRead = false))', { unreadStatus: 'unread' })
      .getRawOne<{ count: string }>();

    return Number(result?.count || 0);
  }
}
