export interface Product {
  id: string;
  name: string;
  brand: string;
  price: number;
  image: string;
  category: 'new' | 'used' | 'rental' | 'lesson';
  description?: string;
  rating?: number;
  reviewCount?: number;
}

export interface SkiResort {
  id: string;
  name: string;
  location: string;
  image?: string;
}

export interface RentalItem extends Product {
  resort: SkiResort;
  duration: string;
  equipment: string[];
}

export interface LessonItem extends Product {
  resort: SkiResort;
  duration: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  maxStudents: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  verified: boolean;
}
