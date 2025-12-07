export interface GeneratedAccount {
  id: string;
  email: string;
  passwordPlain: string;
  passwordMd5: string;
  status: 'PENDING' | 'SUCCESS' | 'ERROR';
  createdAt: string;
  errorMessage?: string;
}

export interface ApiConfig {
  count: number;
  delayMs: number;
}

export interface RegistrationPayload {
  account: string;
  pwd: string;
  user_type: number;
  user_email: string;
  code: string;
  captcha: string;
  telegram: string;
  whatsapp: string;
}