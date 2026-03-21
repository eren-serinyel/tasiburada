import { Router } from 'express';
import { ServiceType } from '../../domain/entities/ServiceType';
import { ScopeOfWork } from '../../domain/entities/ScopeOfWork';
import { ServiceTypeRepository } from '../../infrastructure/repositories/ServiceTypeRepository';
import { ScopeOfWorkRepository } from '../../infrastructure/repositories/ScopeOfWorkRepository';

const router = Router();
const serviceTypeRepo = new ServiceTypeRepository();
const scopeRepo = new ScopeOfWorkRepository();

router.get('/service-types', async (req, res) => {
    try {
        const list = await serviceTypeRepo.findAll();
        res.json({ success: true, data: list });
    } catch (error: any) {
        res.status(400).json({ success: false, message: error.message });
    }
});

router.get('/scope-of-works', async (req, res) => {
    try {
        const list = await scopeRepo.findAll();
        res.json({ success: true, data: list });
    } catch (error: any) {
        res.status(400).json({ success: false, message: error.message });
    }
});

export default router;
