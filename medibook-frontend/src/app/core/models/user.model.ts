export interface User {
  userId: number;
  fullName: string;
  email: string;
  phone?: string;
  role: 'Patient' | 'Provider' | 'Admin';
  provider: 'Local' | 'Google';
  isActive: boolean;
  createdAt: string;
  profilePicUrl?: string;

  // Provider-specific fields
  providerId?: number;
  verified?: boolean;
  specialization?: string;
  qualification?: string;
  experienceYears?: number;
  bio?: string;
  clinicName?: string;
  clinicAddress?: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
  token?: string;
  email?: string;
  fullName?: string;
  role?: string;
}

export interface RegisterDto {
  fullName: string;
  email: string;
  password: string;
  phone?: string;
  role: 'Patient' | 'Provider';
}

export interface LoginDto {
  email: string;
  password: string;
}
