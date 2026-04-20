import fs from 'node:fs';
import path from 'node:path';
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

  downloadDocument = async (req: Request, res: Response) => {
    const carrierId = this.ensureCarrier(req, res);
    if (!carrierId) return;
    try {
      const doc = await this.documentService.getDocumentById(carrierId, req.params.documentId);
      const filePath = this.resolveDocumentPath(doc.fileUrl);
      if (!filePath || !fs.existsSync(filePath)) {
        res.status(404).json({ success: false, message: 'Belge dosyası bulunamadı.' });
        return;
      }

      res.download(filePath, path.basename(filePath));
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message || 'Belge indirilemedi.' });
    }
  };

  deleteDocument = async (req: Request, res: Response) => {
    const carrierId = this.ensureCarrier(req, res);
    if (!carrierId) return;
    try {
      const deleted = await this.documentService.deleteDocument(carrierId, req.params.documentId);
      const filePath = this.resolveDocumentPath(deleted.fileUrl);
      if (filePath && fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch {
          // no-op: DB delete is the source of truth
        }
      }
      res.status(200).json({ success: true, message: 'Belge silindi.' });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message || 'Belge silinemedi.' });
    }
  };

  private resolveDocumentPath(fileUrl?: string): string | null {
    const normalizedUrl = `/${String(fileUrl || '').trim().replace(/^\/+/, '').replace(/\\/g, '/')}`;
    if (!normalizedUrl.startsWith('/uploads/')) {
      return null;
    }

    const uploadsRoot = path.resolve(process.cwd(), 'uploads');
    const resolved = path.resolve(process.cwd(), normalizedUrl.replace(/^\//, ''));
    if (!resolved.startsWith(uploadsRoot + path.sep) && resolved !== uploadsRoot) {
      return null;
    }

    return resolved;
  }
}
