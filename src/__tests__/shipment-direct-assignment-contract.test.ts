import fs from 'node:fs';
import path from 'node:path';

describe('shipment direct assignment contract', () => {
  const root = process.cwd();

  test('carrier matching is only exposed through invite and offer acceptance', () => {
    const routes = fs.readFileSync(path.resolve(root, 'src/presentation/routes/shipmentRoutes.ts'), 'utf8');
    const controller = fs.readFileSync(path.resolve(root, 'src/presentation/controllers/ShipmentController.ts'), 'utf8');
    const service = fs.readFileSync(path.resolve(root, 'src/application/services/ShipmentService.ts'), 'utf8');
    const repository = fs.readFileSync(path.resolve(root, 'src/infrastructure/repositories/ShipmentRepository.ts'), 'utf8');

    expect(routes).not.toContain('assign-carrier');
    expect(controller).not.toContain('assignCarrier');
    expect(service).not.toContain('assignCarrier(');
    expect(repository).not.toContain('assignCarrierIfOpen');
    expect(routes).toContain('/:id/invite/:carrierId');
  });
});
