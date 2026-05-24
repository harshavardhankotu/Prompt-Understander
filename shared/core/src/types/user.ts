export type UserRole = 'retail_buyer' | 'enterprise_buyer' | 'solo_provider' | 'agency_provider' | 'admin';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  city?: string;
  state?: string;
  pincode?: string;
  phone?: string;
  gstNumber?: string;
  trustScore: number;
  omniScore: number;
  isVerified: boolean;
  aadhaarVerified: boolean;
  createdAt: string;
}
