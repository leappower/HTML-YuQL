/**
 * Global type definitions
 */

/**
 * Module interface for app modules
 */
export interface Module {
  init?(): Promise<void> | void;
  cleanup?(): void;
}

/**
 * User activity state
 */
export interface UserActivityState {
  firstVisit: number;
  visitCount: number;
  scrollDepth: number;
  timeOnPage: number;
  productViews: string[];
  formInteractions: number;
  popupShown: boolean;
  lastPopupTime: number;
  maxScrollReached: number;
  inProductSection: boolean;
  nonLinkClickCount: number;
}

/**
 * Translation data structure
 */
export interface Translations {
  [key: string]: string | Translations;
}

/**
 * Product data structure
 */
export interface Product {
  i18nId: string;
  category: string | null;
  subCategory: string | null;
  model: string | null;
  name: string | null;
  highlights: string | null;
  scenarios: string | null;
  usage: string | null;
  power: string | null;
  throughput: string | null;
  averageTime: string | null;
  launchTime: string | null;
  status: string | null;
  isActive: boolean;
  badge: string | null;
  badgeColor: string | null;
  imageRecognitionKey: string | null;
  packingQuantity: string | null;
  productDimensions: string | null;
  packageDimensions: string | null;
  outerBoxDimensions: string | null;
  packageType: string | null;
  color: string | null;
  netWeight: string | null;
  grossWeight: string | null;
  voltage: string | null;
  frequency: string | null;
  material: string | null;
  warrantyPeriod: string | null;
  certification: string | null;
  temperatureRange: string | null;
  controlMethod: string | null;
  energyEfficiencyGrade: string | null;
  applicablePeople: string | null;
  origin: string | null;
  barcode: string | null;
  referencePrice: string | null;
  minimumOrderQuantity: string | null;
  stockQuantity: string | null;
  brand: string | null;
}

/**
 * Language code type
 */
export type LanguageCode =
  | 'zh-CN' | 'zh-TW'
  | 'en' | 'de' | 'es' | 'fr' | 'it' | 'pt' | 'nl' | 'pl' | 'ru' | 'tr'
  | 'ja' | 'ko'
  | 'th' | 'vi' | 'id' | 'ms' | 'fil'
  | 'ar' | 'he';

/**
 * Language names mapping
 */
export interface LanguageNames {
  [key: string]: string;
}

/**
 * Error handler options
 */
export interface ErrorHandlerOptions {
  context?: string;
  showToast?: boolean;
  reportToServer?: boolean;
  showUserMessage?: string;
}

/**
 * Toast options
 */
export interface ToastOptions {
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  position?: 'top' | 'bottom' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

/**
 * Debounced function type
 */
export type DebouncedFunction<T extends (...args: any[]) => any> = {
  (...args: Parameters<T>): void;
  cancel: () => void;
  flush: () => ReturnType<T>;
};

/**
 * Throttled function type
 */
export type ThrottledFunction<T extends (...args: any[]) => any> = {
  (...args: Parameters<T>): void;
  cancel: () => void;
};

/**
 * Form data structure
 */
export interface FormData {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  country?: string;
  message?: string;
  [key: string]: any;
}

/**
 * API response structure
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Config options
 */
export interface ConfigOptions {
  language: LanguageCode;
  apiEndpoint: string;
  analyticsEnabled: boolean;
  debugMode: boolean;
  [key: string]: any;
}

/**
 * Lazy loading options
 */
export interface LazyLoadOptions {
  rootMargin?: string;
  threshold?: number | number[];
  root?: Element | null;
}

/**
 * Intersection observer callback
 */
export type IntersectionObserverCallback = (
  entries: IntersectionObserverEntry[],
  observer: IntersectionObserver
) => void;
