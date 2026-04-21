import rateLimit from 'express-rate-limit';

const isTest = process.env.NODE_ENV === 'test';

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isTest ? 10000 : 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Çok fazla deneme yaptınız. 15 dakika sonra tekrar deneyin.' },
});

export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: isTest ? 10000 : 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Çok fazla şifre sıfırlama isteği. 1 saat sonra tekrar deneyin.' },
});
