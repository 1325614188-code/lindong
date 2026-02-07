
export enum AppSection {
  HOME = 'home',
  TRY_ON_CLOTHES = 'try-on-clothes',
  TRY_ON_ACCESSORIES = 'try-on-accessories',
  HAIRSTYLE = 'hairstyle',
  MAKEUP = 'makeup',
  BEAUTY_SCORE = 'beauty-score',
  COUPLE_FACE = 'couple-face',
  TONGUE_DIAGNOSIS = 'tongue-diagnosis',
  FACE_COLOR = 'face-color',
  FACE_READING = 'face-reading',
  FENG_SHUI = 'feng-shui',
  CALENDAR = 'calendar',
  LICENSE_PLATE = 'license-plate'
}

export interface AnalysisResult {
  score: number;
  report: string;
  parts?: {
    name: string;
    description: string;
  }[];
}

export interface HairstyleResult {
  name: string;
  imageUrl: string;
}
