/**
 * Performance Monitoring Module
 * Web Vitals and performance metrics tracking
 */

/**
 * Performance metric types
 */
export const MetricType = {
  LCP: 'LCP', // Largest Contentful Paint
  FID: 'FID', // First Input Delay
  FCP: 'FCP', // First Contentful Paint
  CLS: 'CLS', // Cumulative Layout Shift
  TTFB: 'TTFB', // Time to First Byte
  FMP: 'FMP', // First Meaningful Paint
  TTI: 'TTI', // Time to Interactive
} as const;

/**
 * Performance data structure
 */
export interface PerformanceMetric {
  type: typeof MetricType[keyof typeof MetricType];
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  timestamp: number;
  url: string;
  userAgent: string;
}

/**
 * Performance thresholds
 */
const thresholds = {
  LCP: { good: 2500, poor: 4000 },
  FID: { good: 100, poor: 300 },
  FCP: { good: 1800, poor: 3000 },
  CLS: { good: 0.1, poor: 0.25 },
  TTFB: { good: 800, poor: 1800 },
};

/**
 * Performance Monitor class
 */
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetric[] = [];
  private enabled = true;
  private reportingEnabled = false;
  private observer?: PerformanceObserver;

  private constructor() {
    this.setupObservers();
  }

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * Configure performance monitor
   */
  configure(options: { enabled?: boolean; reportingEnabled?: boolean }): void {
    if (options.enabled !== undefined) {
      this.enabled = options.enabled;
    }
    if (options.reportingEnabled !== undefined) {
      this.reportingEnabled = options.reportingEnabled;
    }
  }

  /**
   * Setup performance observers
   */
  private setupObservers(): void {
    if (!window.PerformanceObserver) {
      console.warn('PerformanceObserver is not supported');
      return;
    }

    try {
      this.observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.handlePerformanceEntry(entry);
        }
      });

      this.observer.observe({ entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift', 'paint', 'navigation'] });
    } catch (error) {
      console.error('Failed to setup performance observer:', error);
    }
  }

  /**
   * Handle performance entry
   */
  private handlePerformanceEntry(entry: PerformanceEntry): void {
    let metric: PerformanceMetric | null = null;

    switch (entry.entryType) {
      case 'largest-contentful-paint':
        metric = this.createMetric(MetricType.LCP, entry.startTime);
        break;
      case 'first-input':
        metric = this.createMetric(MetricType.FID, (entry as any).processingStart - entry.startTime);
        break;
      case 'layout-shift':
        if (!(entry as any).hadRecentInput) {
          metric = this.createMetric(MetricType.CLS, (entry as any).value);
        }
        break;
      case 'paint':
        if (entry.name === 'first-contentful-paint') {
          metric = this.createMetric(MetricType.FCP, entry.startTime);
        }
        break;
      case 'navigation':
        const navEntry = entry as PerformanceNavigationTiming;
        metric = this.createMetric(MetricType.TTFB, navEntry.responseStart);
        break;
    }

    if (metric) {
      this.metrics.push(metric);
      this.logMetric(metric);
      this.reportMetric(metric);
    }
  }

  /**
   * Create performance metric
   */
  private createMetric(type: typeof MetricType[keyof typeof MetricType], value: number): PerformanceMetric {
    const threshold = thresholds[type];
    let rating: 'good' | 'needs-improvement' | 'poor';

    if (threshold) {
      if (value <= threshold.good) {
        rating = 'good';
      } else if (value <= threshold.poor) {
        rating = 'needs-improvement';
      } else {
        rating = 'poor';
      }
    } else {
      rating = 'needs-improvement';
    }

    return {
      type,
      value,
      rating,
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
    };
  }

  /**
   * Log metric to console
   */
  private logMetric(metric: PerformanceMetric): void {
    const symbol = metric.rating === 'good' ? '✅' : metric.rating === 'needs-improvement' ? '⚠️' : '❌';
    console.log(`${symbol} [Performance] ${metric.type}: ${metric.value.toFixed(2)}ms (${metric.rating})`);
  }

  /**
   * Report metric to external service
   */
  private reportMetric(metric: PerformanceMetric): void {
    if (!this.reportingEnabled) {
      return;
    }

    if (window.Sentry) {
      window.Sentry.addBreadcrumb({
        message: `${metric.type}: ${metric.value.toFixed(2)}ms`,
        category: 'performance',
        level: metric.rating === 'poor' ? 'error' : metric.rating === 'needs-improvement' ? 'warning' : 'info',
        data: metric,
      });
    }

    if (window.gtag) {
      window.gtag('event', 'timing_complete', {
        name: metric.type,
        value: Math.round(metric.value),
        event_label: metric.rating,
      });
    }
  }

  /**
   * Get all metrics
   */
  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  /**
   * Get metrics by type
   */
  getMetricsByType(type: typeof MetricType[keyof typeof MetricType]): PerformanceMetric[] {
    return this.metrics.filter((m) => m.type === type);
  }

  /**
   * Get latest metric by type
   */
  getLatestMetric(type: typeof MetricType[keyof typeof MetricType]): PerformanceMetric | null {
    const typeMetrics = this.getMetricsByType(type);
    return typeMetrics.length > 0 ? typeMetrics[typeMetrics.length - 1] : null;
  }

  /**
   * Get performance summary
   */
  getSummary(): Record<string, { value: number; rating: string; count: number }> {
    const summary: Record<string, any> = {};

    for (const type of Object.values(MetricType)) {
      const metrics = this.getMetricsByType(type);
      if (metrics.length > 0) {
        const latest = metrics[metrics.length - 1];
        summary[type] = {
          value: latest.value,
          rating: latest.rating,
          count: metrics.length,
        };
      }
    }

    return summary;
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.metrics = [];
  }

  /**
   * Measure custom performance
   */
  static measure(markName: string, startMark?: string): number {
    if (!window.performance) {
      return 0;
    }

    try {
      if (startMark) {
        window.performance.measure(markName, startMark);
      }
      return window.performance.now();
    } catch (error) {
      console.error('Performance measurement failed:', error);
      return 0;
    }
  }

  /**
   * Mark performance point
   */
  static mark(markName: string): void {
    if (!window.performance) {
      return;
    }

    try {
      window.performance.mark(markName);
    } catch (error) {
      console.error('Performance mark failed:', error);
    }
  }

  /**
   * Get resource timing data
   */
  getResourceTiming(): PerformanceResourceTiming[] {
    if (!window.performance || !window.performance.getEntriesByType) {
      return [];
    }

    try {
      return window.performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    } catch (error) {
      console.error('Failed to get resource timing:', error);
      return [];
    }
  }

  /**
   * Get slow resources (>2s)
   */
  getSlowResources(threshold: number = 2000): PerformanceResourceTiming[] {
    const resources = this.getResourceTiming();
    return resources.filter((r) => r.duration > threshold);
  }
}

// Export singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance();

// Export for global access
if (typeof window !== 'undefined') {
  (window as any).PerformanceMonitor = PerformanceMonitor;
  (window as any).performanceMonitor = performanceMonitor;
}

/**
 * Initialize performance monitoring automatically
 */
if (typeof window !== 'undefined' && window.addEventListener) {
  window.addEventListener('load', () => {
    console.log('Performance monitoring initialized');
  });
}
