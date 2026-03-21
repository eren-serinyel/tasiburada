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
}
