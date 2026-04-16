
export enum AppSection {
  HOME = 'home',
  JADE_APPRAISAL = 'jade-appraisal',
  TRY_ON_CLOTHES = 'try-on-clothes',
  ADVANCED_TRY_ON = 'advanced-try-on',
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
  LICENSE_PLATE = 'license-plate',
  MBTI_TEST = 'mbti-test',
  DEPRESSION_TEST = 'depression-test',
  MARRIAGE_ANALYSIS = 'marriage-analysis',
  WEALTH_ANALYSIS = 'wealth-analysis',
  AI_EYE_DIAGNOSIS = 'eye-diagnosis',
  EQ_TEST = 'eq-test',
  IQ_TEST = 'iq-test',
  BIG_FIVE = 'big-five',
  ZI_WEI = 'zi-wei',
  FACE_AGE = 'face-age',
  PERSONAL_NAMING = 'personal-naming',
  COMPANY_NAMING = 'company-naming',
  APP_DOWNLOAD = 'app-download'
}

/**
 * 用户数据类型 - 对应后端 auth_v2 返回的用户对象结构
 */
export interface User {
  id: string;
  username: string;
  nickname?: string;
  credits: number;
  /** 是否为管理员 */
  is_admin?: boolean;
  /** 奖励积分（后期字段，可能为空） */
  points?: number;
  /** 推广佣金余额（后期字段，可能为空） */
  commission_balance?: number;
  /** 设备 ID */
  device_id?: string;
  /** 推荐人 ID */
  referrer_id?: string | null;
  /** 注册环境：wechat / qq / browser / other */
  register_env?: string;
  /** 微信 OpenID */
  wechat_openid?: string;
  /** 头像 URL */
  avatar_url?: string;
  /** 邀请码 */
  invite_code?: string;
  /** 注册时间 */
  created_at?: string;
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
