import { Request, Response } from 'express';
import { CarrierDocumentService } from '../../application/services/carrier/CarrierDocumentService';

export class CarrierDocumentController {
  private documentService = new CarrierDocumentService();

  private ensureCarrier(req: Request, res: Response): string | null {
    if (!req.carrierId) {
      res.status(401).json({ success: false, message: 'Kimlik doğrulaması gerekli.' });
      return null;
    }

    const requestedId = req.params?.carrierId;
    if (requestedId && requestedId !== req.carrierId) {
      res.status(403).json({ success: false, message: 'Bu kaynağa erişim yetkiniz yok.' });
      return null;
    }

    return requestedId || req.carrierId;
  }

  getDocuments = async (req: Request, res: Response) => {
    const carrierId = this.ensureCarrier(req, res);
    if (!carrierId) return;
    try {
      const docs = await this.documentService.getDocumentsForCarrier(carrierId);
      res.status(200).json({ success: true, data: docs });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message || 'Belgeler alınamadı.' });
    }
  };

  updateDocuments = async (req: Request, res: Response) => {
    const carrierId = this.ensureCarrier(req, res);
    if (!carrierId) return;
    try {
      if (req.file) {
        const rawType = String(req.body?.type || '').trim();
        if (!rawType) {
          res.status(400).json({ success: false, message: 'Belge tipi (type) zorunludur.' });
          return;
        }

        const fileUrl = `/uploads/documents/${req.file.filename}`;
        const result = await this.documentService.saveDocumentsDraft(carrierId, [
          { type: rawType, fileUrl }
        ]);
        res.status(200).json({ success: true, allRequiredHaveDoc: result.allRequiredHaveDoc, fileUrl });
        return;
      }

      const documents = Array.isArray(req.body?.documents) ? req.body.documents : [];
      const result = await this.documentService.saveDocumentsDraft(carrierId, documents);
      res.status(200).json({ success: true, allRequiredHaveDoc: result.allRequiredHaveDoc });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message || 'Belgeler güncellenemedi.' });
    }
  };
}
