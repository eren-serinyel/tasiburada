import { CarrierNotificationPreferencesDto, NotificationPreferenceToggleDto } from '../../dto/CarrierDto';
import { CarrierNotificationPreferenceRepository } from '../../../infrastructure/repositories/CarrierNotificationPreferenceRepository';

const DEFAULT_PREFERENCES = [
  { notificationKey: 'newOffer', channels: { email: true, sms: true, push: true } },
  { notificationKey: 'shipmentStatus', channels: { email: true, sms: false, push: true } },
  { notificationKey: 'paymentReceived', channels: { email: true, sms: true, push: false } },
  { notificationKey: 'systemAnnouncements', channels: { email: true, sms: false, push: false } },
];

export class NotificationPreferenceService {
  private repository = new CarrierNotificationPreferenceRepository();

  /**
   * Bildirim tercihlerini getirir. Kayıt yoksa varsayılan tercihlerle oluşturur.
   */
  async getPreferences(carrierId: string): Promise<CarrierNotificationPreferencesDto> {
    let record = await this.repository.findByCarrierId(carrierId);

    if (!record) {
      record = await this.repository.create({
        carrierId,
        preferences: DEFAULT_PREFERENCES,
        quietMode: false,
        dailySummary: true,
        smsDailyLimit: 5,
        timeWindowStart: '09:00',
        timeWindowEnd: '20:00',
      });
    }

    return {
      preferences: record.preferences,
      quietMode: record.quietMode,
      dailySummary: record.dailySummary,
      smsDailyLimit: record.smsDailyLimit,
      timeWindow: {
        start: record.timeWindowStart,
        end: record.timeWindowEnd,
      },
    };
  }

  /**
   * Bildirim tercihini değiştirir (toggle).
   */
  async togglePreference(carrierId: string, data: NotificationPreferenceToggleDto): Promise<CarrierNotificationPreferencesDto> {
    let record = await this.repository.findByCarrierId(carrierId);

    if (!record) {
      record = await this.repository.create({
        carrierId,
        preferences: DEFAULT_PREFERENCES,
        quietMode: false,
        dailySummary: true,
        smsDailyLimit: 5,
        timeWindowStart: '09:00',
        timeWindowEnd: '20:00',
      });
    }

    const updatedPreferences = record.preferences.map((pref) => {
      if (pref.notificationKey === data.notificationKey) {
        return {
          ...pref,
          channels: {
            ...pref.channels,
            [data.channelKey]: data.enabled,
          },
        };
      }
      return pref;
    });

    await this.repository.update(record.id, { preferences: updatedPreferences } as any);

    return this.getPreferences(carrierId);
  }
}
