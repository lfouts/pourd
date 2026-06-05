export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'created_at'>;
        Update: Partial<Omit<Profile, 'id' | 'created_at'>>;
      };
      wines: {
        Row: Wine;
        Insert: Omit<Wine, 'id' | 'created_at'>;
        Update: Partial<Omit<Wine, 'id' | 'created_at'>>;
      };
      venues: {
        Row: Venue;
        Insert: Omit<Venue, 'id' | 'created_at'>;
        Update: Partial<Omit<Venue, 'id' | 'created_at'>>;
      };
      checkins: {
        Row: Checkin;
        Insert: Omit<Checkin, 'id' | 'created_at'>;
        Update: Partial<Omit<Checkin, 'id' | 'created_at'>>;
      };
    };
  };
}

export interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  total_checkins: number;
  created_at: string;
}

export interface Wine {
  id: string;
  name: string;
  winery: string;
  varietals: string[];
  region: string[] | null;
  country: string | null;
  vintage: number | null;
  label_image_url: string | null;
  official_notes: string | null;
  avg_rating: number | null;
  total_checkins: number;
  created_at: string;
}

export interface Venue {
  id: string;
  name: string;
  type: 'restaurant' | 'bar' | 'winery' | 'shop' | 'home' | 'other';
  address: string | null;
  city: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
}

export interface Checkin {
  id: string;
  user_id: string;
  wine_id: string;
  venue_id: string | null;
  rating: number;
  description: string | null;
  guessed_notes: string[] | null;
  actual_notes: string[] | null;
  serving_style: 'glass' | 'bottle' | 'tasting' | null;
  photo_url: string | null;
  is_public: boolean;
  created_at: string;
}

export interface Clink {
  id: string;
  checkin_id: string;
  user_id: string;
  created_at: string;
}

export interface CheckinWithDetails extends Checkin {
  wine: Wine;
  venue: Venue | null;
  profile: Profile;
  clinks: Pick<Clink, 'user_id'>[];
}
