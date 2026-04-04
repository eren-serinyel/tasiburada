export function validatePassword(password: string): string | null {
  if (!password || password.length < 8) {
    return 'Şifre en az 8 karakter olmalıdır';
  }
  if (!/[A-Z]/.test(password)) {
    return 'Şifre en az bir büyük harf içermelidir';
  }
  if (!/[0-9]/.test(password)) {
    return 'Şifre en az bir rakam içermelidir';
  }
  return null;
}
