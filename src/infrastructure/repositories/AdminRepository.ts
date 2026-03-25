import { BaseRepository } from './BaseRepository';
import { Admin } from '../../domain/entities/Admin';

export class AdminRepository extends BaseRepository<Admin> {
  constructor() {
    super(Admin);
  }

  async findByEmail(email: string): Promise<Admin | null> {
    return await this.repository.findOne({ where: { email } });
  }

  async findById(id: string): Promise<Admin | null> {
    return await this.repository.findOne({ where: { id } });
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.repository.update(id, { lastLogin: new Date() });
  }
}
