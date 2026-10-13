export type LandingRole = 'customer' | 'professional' | 'partner' | 'franchise' | 'promoter' | 'admin';

export interface ServiceCategory {
  id: string;
  name: string;
  nameHi: string;
  subCategory: string;
  image: string;
  startingPrice: number;
  rating: number;
  description: string;
  badge?: string;
}
