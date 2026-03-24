export const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

export const APP_CONFIG = {
  apiBaseUrl: API_BASE_URL,
  tokenKey: 'authToken',
  userTypeKey: 'userType',
  userIdKey: 'userId',
} as const;
