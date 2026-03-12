/**
 * Global State Management
 * Lightweight state management with Zustand-like API
 */

/**
 * Store class for managing global state
 */
class Store {
  private state: Record<string, any>;
  private listeners: Set<(state: any) => void>;
  private listenerIdCounter: number;
  private listenerIds: Map<number, (state: any) => void>;

  constructor(initialState: Record<string, any> = {}) {
    this.state = initialState;
    this.listeners = new Set();
    this.listenerIdCounter = 0;
    this.listenerIds = new Map();
  }

  /**
   * Get current state
   */
  getState(): Record<string, any> {
    return { ...this.state };
  }

  /**
   * Get specific value from state
   */
  get<T>(key: string): T | undefined {
    return this.state[key];
  }

  /**
   * Set state and notify listeners
   */
  set(partial: Record<string, any> | ((state: Record<string, any>) => Record<string, any>)): void {
    const newState = typeof partial === 'function'
      ? partial(this.state)
      : { ...this.state, ...partial };

    this.state = newState;
    this.notifyListeners();
  }

  /**
   * Update specific key in state
   */
  update(key: string, value: any): void {
    this.set({ [key]: value });
  }

  /**
   * Subscribe to state changes
   * Returns unsubscribe function
   */
  subscribe(listener: (state: any) => void): () => void {
    const id = this.listenerIdCounter++;
    this.listeners.add(listener);
    this.listenerIds.set(id, listener);

    // Call listener immediately with current state
    listener(this.state);

    // Return unsubscribe function
    return () => {
      const listenerToRemove = this.listenerIds.get(id);
      if (listenerToRemove) {
        this.listeners.delete(listenerToRemove);
        this.listenerIds.delete(id);
      }
    };
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(): void {
    this.listeners.forEach((listener) => {
      try {
        listener(this.state);
      } catch (error) {
        console.error('Error in state listener:', error);
      }
    });
  }

  /**
   * Reset state to initial value
   */
  reset(initialState: Record<string, any>): void {
    this.state = initialState;
    this.notifyListeners();
  }

  /**
   * Clear all listeners
   */
  clearListeners(): void {
    this.listeners.clear();
    this.listenerIds.clear();
  }
}

/**
 * User activity store
 */
export const userActivityStore = new Store({
  firstVisit: Date.now(),
  visitCount: 0,
  scrollDepth: 0,
  timeOnPage: 0,
  productViews: [],
  formInteractions: 0,
  popupShown: false,
  lastPopupTime: 0,
  maxScrollReached: 0,
  inProductSection: false,
  nonLinkClickCount: 0,
});

/**
 * App state store
 */
export const appStore = new Store({
  language: 'zh-CN',
  initialized: false,
  currentPage: 'home',
  theme: 'light',
  isMobile: false,
  sidebarOpen: false,
});

/**
 * Form state store
 */
export const formStore = new Store({
  submitting: false,
  success: false,
  error: null,
  data: null,
});

/**
 * Product store
 */
export const productStore = new Store({
  currentProduct: null,
  viewedProducts: [],
  favoriteProducts: [],
  filters: {
    category: null,
    subCategory: null,
    priceRange: null,
  },
});

/**
 * UI state store
 */
export const uiStore = new Store({
  toastVisible: false,
  toastMessage: '',
  toastType: 'info',
  modalVisible: false,
  modalContent: null,
  loading: false,
});

/**
 * Utility hooks for using store
 */
export function createStoreHook<T>(store: Store, selector?: (state: any) => T) {
  return (): T => {
    const initialState = selector ? selector(store.getState()) : store.getState();

    const [state, setState] = useState(initialState);

    useEffect(() => {
      const unsubscribe = store.subscribe((newState) => {
        const selectedState = selector ? selector(newState) : newState;
        setState(selectedState);
      });

      return unsubscribe;
    }, [store, selector]);

    return state as T;
  };
}

/**
 * Helper functions for specific stores
 */

/**
 * User activity helpers
 */
export const updateUserActivity = (updates: Partial<typeof userActivityStore.getState()>) => {
  userActivityStore.set((state) => ({ ...state, ...updates }));
};

export const incrementVisitCount = () => {
  const count = userActivityStore.get('visitCount') || 0;
  userActivityStore.update('visitCount', count + 1);
};

export const addProductView = (productId: string) => {
  const views = userActivityStore.get('productViews') || [];
  userActivityStore.update('productViews', [...views, productId]);
};

export const updateScrollDepth = (depth: number) => {
  const maxDepth = userActivityStore.get('maxScrollReached') || 0;
  userActivityStore.update('scrollDepth', Math.max(maxDepth, depth));
};

/**
 * App state helpers
 */
export const setAppLanguage = (language: string) => {
  appStore.update('language', language);
  localStorage.setItem('userLanguage', language);
};

export const setAppInitialized = (initialized: boolean) => {
  appStore.update('initialized', initialized);
};

export const setCurrentPage = (page: string) => {
  appStore.update('currentPage', page);
};

export const toggleSidebar = () => {
  const isOpen = uiStore.get('sidebarOpen');
  uiStore.update('sidebarOpen', !isOpen);
};

/**
 * Form state helpers
 */
export const startFormSubmit = () => {
  formStore.update('submitting', true);
};

export const setFormSuccess = (data: any) => {
  formStore.set({
    submitting: false,
    success: true,
    error: null,
    data,
  });
};

export const setFormError = (error: string) => {
  formStore.set({
    submitting: false,
    success: false,
    error,
    data: null,
  });
};

export const resetForm = () => {
  formStore.set({
    submitting: false,
    success: false,
    error: null,
    data: null,
  });
};

/**
 * UI state helpers
 */
export const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info', duration = 3000) => {
  uiStore.set({
    toastVisible: true,
    toastMessage: message,
    toastType: type,
  });

  setTimeout(() => {
    uiStore.update('toastVisible', false);
  }, duration);
};

export const hideToast = () => {
  uiStore.update('toastVisible', false);
};

export const showModal = (content: any) => {
  uiStore.set({
    modalVisible: true,
    modalContent: content,
  });
};

export const hideModal = () => {
  uiStore.set({
    modalVisible: false,
    modalContent: null,
  });
};

export const setLoading = (loading: boolean) => {
  uiStore.update('loading', loading);
};

/**
 * Product helpers
 */
export const setCurrentProduct = (product: any) => {
  productStore.update('currentProduct', product);
};

export const addFavoriteProduct = (productId: string) => {
  const favorites = productStore.get('favoriteProducts') || [];
  if (!favorites.includes(productId)) {
    productStore.update('favoriteProducts', [...favorites, productId]);
  }
};

export const removeFavoriteProduct = (productId: string) => {
  const favorites = productStore.get('favoriteProducts') || [];
  productStore.update('favoriteProducts', favorites.filter((id: string) => id !== productId));
};

export const setProductFilters = (filters: any) => {
  productStore.set((state) => ({
    ...state,
    filters: { ...state.filters, ...filters },
  }));
};

/**
 * Initialize stores from localStorage
 */
export function initializeStores(): void {
  // Load language
  const savedLanguage = localStorage.getItem('userLanguage');
  if (savedLanguage) {
    appStore.update('language', savedLanguage);
  }

  // Load user activity
  const savedActivity = localStorage.getItem('userActivity');
  if (savedActivity) {
    try {
      const activity = JSON.parse(savedActivity);
      userActivityStore.set(activity);
    } catch (error) {
      console.error('Failed to parse user activity:', error);
    }
  }

  // Load favorite products
  const savedFavorites = localStorage.getItem('favoriteProducts');
  if (savedFavorites) {
    try {
      const favorites = JSON.parse(savedFavorites);
      productStore.update('favoriteProducts', favorites);
    } catch (error) {
      console.error('Failed to parse favorite products:', error);
    }
  }
}

/**
 * Save stores to localStorage
 */
export function saveStores(): void {
  // Save user activity
  const activity = userActivityStore.getState();
  localStorage.setItem('userActivity', JSON.stringify(activity));

  // Save favorite products
  const favorites = productStore.get('favoriteProducts');
  if (favorites) {
    localStorage.setItem('favoriteProducts', JSON.stringify(favorites));
  }
}

// Auto-save stores periodically
setInterval(saveStores, 30000); // Save every 30 seconds

// Save before page unload
window.addEventListener('beforeunload', saveStores);

// Export stores
export const stores = {
  userActivity: userActivityStore,
  app: appStore,
  form: formStore,
  product: productStore,
  ui: uiStore,
};

// Export for global access
if (typeof window !== 'undefined') {
  (window as any).stores = stores;
  (window as any).Store = Store;
}
