import { Request, Response } from 'express';
import { CarrierSearchService } from '../../application/services/carrier/CarrierSearchService';

export class CarrierSearchController {
	private searchService = new CarrierSearchService();

	search = async (req: Request, res: Response) => {
		try {
			const data = await this.searchService.search(req.query);
			res.status(200).json({ success: true, data });
		} catch (error: any) {
			res.status(400).json({ success: false, message: error?.message || 'Nakliyeci araması başarısız.' });
		}
	};

	getAvailabilitySummary = async (req: Request, res: Response) => {
		try {
			const date = typeof req.query.date === 'string' ? req.query.date.trim() : '';
			if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
				res.status(400).json({ success: false, message: 'Geçerli bir tarih belirtin (YYYY-MM-DD).' });
				return;
			}
			const data = await this.searchService.getAvailabilitySummary(date);
			res.status(200).json({ success: true, data });
		} catch (error: any) {
			res.status(400).json({ success: false, message: error?.message || 'Müsaitlik özeti alınamadı.' });
		}
	};
}
