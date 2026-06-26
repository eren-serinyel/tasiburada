import { AppDataSource } from '../../infrastructure/database/data-source';
import { Message } from '../../domain/entities/Message';
import { Shipment, ShipmentStatus } from '../../domain/entities/Shipment';
import { ForbiddenError, NotFoundError, ValidationError } from '../../domain/errors/AppError';
import { PlatformPolicyService } from './PlatformPolicyService';
import { ContactFilterSurface } from '../../domain/entities/ContactFilterLog';

interface SendMessagePayload {
  shipmentId: string;
  content: string;
}

interface MessageDto {
  id: string;
  shipmentId: string;
  senderType: 'customer' | 'carrier';
  senderId: string;
  content: string;
  isRead: boolean;
  createdAt: string;
}

export class MessageService {
  private messageRepo = AppDataSource.getRepository(Message);
  private shipmentRepo = AppDataSource.getRepository(Shipment);
  private platformPolicy = new PlatformPolicyService();

  async sendMessage(
    senderType: 'customer' | 'carrier',
    senderId: string,
    payload: SendMessagePayload,
  ): Promise<MessageDto> {
    if (!payload.content?.trim()) {
      throw new ValidationError('Mesaj içeriği boş olamaz.');
    }

    if (payload.content.length > 2000) {
      throw new ValidationError('Mesaj en fazla 2000 karakter olabilir.');
    }

    const shipment = await this.shipmentRepo.findOne({ where: { id: payload.shipmentId } });
    if (!shipment) {
      throw new NotFoundError('Taşıma talebi bulunamadı.');
    }

    const isParticipant =
      (senderType === 'customer' && shipment.customerId === senderId) ||
      (senderType === 'carrier' && shipment.carrierId === senderId);

    if (!isParticipant) {
      throw new ForbiddenError('Bu taşımaya mesaj gönderme yetkiniz yok.');
    }

    const allowedStatuses = [ShipmentStatus.MATCHED, ShipmentStatus.IN_TRANSIT, ShipmentStatus.COMPLETED];
    if (!allowedStatuses.includes(shipment.status)) {
      throw new ForbiddenError('Mesajlaşma yalnızca eşleşme sonrası kullanılabilir.');
    }

    await this.platformPolicy.enforceNoContactInfo({
      actorType: senderType,
      actorId: senderId,
      surface: ContactFilterSurface.OFFER_MESSAGE,
      text: payload.content,
      shipmentId: payload.shipmentId,
    });

    const message = this.messageRepo.create({
      shipmentId: payload.shipmentId,
      senderType,
      senderId,
      content: payload.content.trim(),
    });

    const saved = await this.messageRepo.save(message);
    return this.toDto(saved);
  }

  async getMessages(
    viewerType: 'customer' | 'carrier',
    viewerId: string,
    shipmentId: string,
  ): Promise<MessageDto[]> {
    const shipment = await this.shipmentRepo.findOne({ where: { id: shipmentId } });
    if (!shipment) {
      throw new NotFoundError('Taşıma talebi bulunamadı.');
    }

    const isParticipant =
      (viewerType === 'customer' && shipment.customerId === viewerId) ||
      (viewerType === 'carrier' && shipment.carrierId === viewerId);

    if (!isParticipant) {
      throw new ForbiddenError('Bu taşımanın mesajlarına erişim yetkiniz yok.');
    }

    const messages = await this.messageRepo.find({
      where: { shipmentId },
      order: { createdAt: 'ASC' },
    });

    await this.messageRepo
      .createQueryBuilder()
      .update(Message)
      .set({ isRead: true })
      .where('shipmentId = :shipmentId', { shipmentId })
      .andWhere('senderType != :viewerType', { viewerType })
      .andWhere('isRead = :isRead', { isRead: false })
      .execute();

    return messages.map(m => this.toDto(m));
  }

  private toDto(message: Message): MessageDto {
    return {
      id: message.id,
      shipmentId: message.shipmentId,
      senderType: message.senderType,
      senderId: message.senderId,
      content: message.content,
      isRead: message.isRead,
      createdAt: message.createdAt instanceof Date ? message.createdAt.toISOString() : String(message.createdAt),
    };
  }
}
