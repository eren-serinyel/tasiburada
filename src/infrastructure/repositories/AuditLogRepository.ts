import { BaseRepository } from './BaseRepository';
import { AuditLog } from '../../domain/entities/AuditLog';

export class AuditLogRepository extends BaseRepository<AuditLog> {
  constructor() {
    super(AuditLog);
  }

  async log(data: {
    adminId: string;
    action: string;
    targetType: string;
    targetId: string;
    details?: Record<string, any>;
  }): Promise<AuditLog> {
    return await this.create({
      adminId: data.adminId,
      action: data.action,
      targetType: data.targetType,
      targetId: data.targetId,
      details: data.details ?? null,
    });
  }

  async findPaginated(params: { page?: number; limit?: number; search?: string }) {
    const { page = 1, limit = 30, search } = params;
    const query = this.repository.createQueryBuilder('log');

    if (search) {
      query.andWhere(
        '(log.action LIKE :s OR log.targetType LIKE :s OR log.adminId LIKE :s)',
        { s: `%${search}%` },
      );
    }

    query.orderBy('log.createdAt', 'DESC').take(limit).skip((page - 1) * limit);
    const [logs, total] = await query.getManyAndCount();

    return {
      logs,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }
}
