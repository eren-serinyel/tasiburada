import * as nodemailer from 'nodemailer';

const SMTP_HOST = process.env.SMTP_HOST || '';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10);
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const SMTP_FROM = process.env.SMTP_FROM || `"Taşıburada" <noreply@tasiburada.com>`;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  private getTransporter(): nodemailer.Transporter {
    if (!this.transporter) {
      if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
        console.warn('⚠️ SMTP yapılandırması eksik (SMTP_HOST, SMTP_USER, SMTP_PASS). E-postalar konsola yazdırılacak.');
        // Return a mock transporter for development
        return {
          sendMail: async (mailOptions: any) => {
            console.log('📧 [MOCK EMAIL SENT]');
            console.log(`PO: ${mailOptions.from}`);
            console.log(`TO: ${mailOptions.to}`);
            console.log(`SUBJECT: ${mailOptions.subject}`);
            console.log(`BODY: ${mailOptions.html?.substring(0, 100)}...`);
            return { messageId: 'mock-id' };
          }
        } as any;
      }
      this.transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: SMTP_PORT,
        secure: SMTP_PORT === 465,
        auth: {
          user: SMTP_USER,
          pass: SMTP_PASS,
        },
      });
    }
    return this.transporter;
  }

  async sendPasswordReset(
    to: string,
    token: string,
    userType: 'customer' | 'carrier'
  ): Promise<void> {
    const resetUrl = `${FRONTEND_URL}/sifre-sifirla?token=${token}&userType=${userType}`;
    await this.getTransporter().sendMail({
      from: SMTP_FROM,
      to,
      subject: 'Şifre Sıfırlama Talebi — Taşıburada',
      html: `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px">
          <h2 style="color:#1d4ed8">Şifrenizi Sıfırlayın</h2>
          <p>Aşağıdaki bağlantıya tıklayarak şifrenizi sıfırlayabilirsiniz.
             Bu bağlantı <strong>60 dakika</strong> geçerlidir.</p>
          <a href="${resetUrl}"
             style="display:inline-block;margin:16px 0;padding:12px 24px;background:#1d4ed8;color:#fff;border-radius:6px;text-decoration:none;font-weight:600">
            Şifremi Sıfırla
          </a>
          <p style="color:#6b7280;font-size:13px">
            Bu isteği siz yapmadıysanız bu e-postayı görmezden gelebilirsiniz.
          </p>
        </div>
      `,
    });
  }

  async sendVerificationEmail(
    to: string,
    token: string,
    userType: 'customer' | 'carrier'
  ): Promise<void> {
    const verifyUrl = `${FRONTEND_URL}/eposta-dogrula?token=${token}&userType=${userType}`;
    await this.getTransporter().sendMail({
      from: SMTP_FROM,
      to,
      subject: 'E-posta Adresinizi Doğrulayın — Taşıburada',
      html: `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px">
          <h2 style="color:#1d4ed8">E-posta Doğrulama</h2>
          <p>Hesabınızı etkinleştirmek için aşağıdaki bağlantıya tıklayın.</p>
          <a href="${verifyUrl}"
             style="display:inline-block;margin:16px 0;padding:12px 24px;background:#1d4ed8;color:#fff;border-radius:6px;text-decoration:none;font-weight:600">
            E-postamı Doğrula
          </a>
          <p style="color:#6b7280;font-size:13px">
            Bu isteği siz yapmadıysanız bu e-postayı görmezden gelebilirsiniz.
          </p>
        </div>
      `,
    });
  }
}

export const emailService = new EmailService();
