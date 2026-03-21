import { Request, Response } from 'express';
import { AppDataSource } from '../../infrastructure/database/data-source';
import { VehicleType } from '../../domain/entities/VehicleType';

export class VehicleTypeController {
  async list(req: Request, res: Response) {
    try {
      const repo = AppDataSource.getRepository(VehicleType);
      const types = await repo.createQueryBuilder('vt').orderBy('vt.id', 'ASC').getMany();
      res.status(200).json({
        success: true,
        data: types.map(t => ({
          id: t.id,
          name: t.name,
          defaultCapacityKg: t.defaultCapacityKg,
          defaultCapacityM3: t.defaultCapacityM3,
        }))
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error?.message || 'Araç türleri alınamadı' });
    }
  }
}
