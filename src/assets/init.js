// init.js - Initialization and user tracking code
// This code runs immediately and doesn't wait for DOM ready

// Service Worker Registration
let serviceWorkerRegistration = null;

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    console.log('[Init] Service Worker is supported, attempting registration...');

    navigator.serviceWorker.register('./sw.js')
      .then((registration) => {
        console.log('[Init] Service Worker registered successfully:', registration);
        serviceWorkerRegistration = registration;

        // Handle Service Worker updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          console.log('[Init] New Service Worker installing...');

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New SW is waiting to activate
              console.log('[Init] New Service Worker is waiting to activate');
              showServiceWorkerUpdateNotification();
            }
          });
        });

        // Handle controller change (new SW activated)
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          console.log('[Init] Service Worker controller changed, reloading page...');
          window.location.reload();
        });

        // Check for existing waiting SW
        if (registration.waiting) {
          console.log('[Init] Service Worker is already waiting to activate');
          showServiceWorkerUpdateNotification();
        }
      })
      .catch((error) => {
        console.error('[Init] Service Worker registration failed:', error);
      });
  } else {
    console.warn('[Init] Service Worker is not supported in this browser');
  }
}

function showServiceWorkerUpdateNotification() {
  // Only show if we haven't shown recently
  if (localStorage.getItem('swUpdateNotificationDismissed') === Date.now().toString()) {
    return;
  }

  // Create notification element
  const notification = document.createElement('div');
  notification.id = 'sw-update-notification';
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: white;
    padding: 16px 24px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    display: flex;
    align-items: center;
    gap: 16px;
    z-index: 10001;
    animation: slideDown 0.3s ease-out;
  `;

  notification.innerHTML = `
    <span style="color: #333; font-size: 14px;">A new version is available. Click to update.</span>
    <button id="sw-update-button" style="
      background: #3498db;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
    ">Update Now</button>
    <button id="sw-dismiss-button" style="
      background: transparent;
      color: #666;
      border: none;
      padding: 4px 8px;
      cursor: pointer;
      font-size: 18px;
    ">×</button>
    <style>
      @keyframes slideDown {
        from { transform: translate(-50%, -100%); opacity: 0; }
        to { transform: translate(-50%, 0); opacity: 1; }
      }
    </style>
  `;

  document.body.appendChild(notification);

  // Add event listeners
  document.getElementById('sw-update-button').addEventListener('click', () => {
    if (serviceWorkerRegistration && serviceWorkerRegistration.waiting) {
      serviceWorkerRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
      console.log('[Init] Sent SKIP_WAITING message to Service Worker');
    }
    document.body.removeChild(notification);
  });

  document.getElementById('sw-dismiss-button').addEventListener('click', () => {
    localStorage.setItem('swUpdateNotificationDismissed', Date.now().toString());
    document.body.removeChild(notification);
  });
}

// Register Service Worker immediately
registerServiceWorker();

// User Activity Tracking for Smart Popup System
let userActivity = {
  timeOnPage: 0,
  timeOnProductSection: 0,
  inProductSection: false,
  lastActivityTime: Date.now(),
  nonLinkClickCount: 0,
  hasScrolled: false,
  scrollDepth: 0,
  popupShownCount: 0,
  maxPopupsPerSession: 4,
  popupTriggers: {
    timeOnPage: false,
    inProductSection: false,
    nonLinkClick: false,
    manual: false
  }
};

// Start tracking time
setInterval(() => {
  userActivity.timeOnPage++;

  if (userActivity.inProductSection) {
    userActivity.timeOnProductSection++;
  }
}, 1000);

// Track user activity
document.addEventListener('mousemove', () => {
  userActivity.lastActivityTime = Date.now();
});

document.addEventListener('scroll', () => {
  userActivity.lastActivityTime = Date.now();
  userActivity.hasScrolled = true;

  const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
  const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
  userActivity.scrollDepth = (winScroll / height) * 100;
});

// Track clicks on non-link elements (potential interested users)
document.addEventListener('click', (e) => {
  userActivity.lastActivityTime = Date.now();

  // Check if click was on a link or button
  const isLink = e.target.closest('a, button, [role="button"]');
  const isInput = e.target.closest('input, textarea, select');
  const isInteractive = e.target.closest('.product-card, .certificate-card, nav, header, .floating-sidebar');

  // If clicked on non-interactive area in product section, count as interest
  if (!isLink && !isInput && !isInteractive && userActivity.inProductSection) {
    userActivity.nonLinkClickCount++;
    console.log('Non-link click in product section. Count:', userActivity.nonLinkClickCount);
  }
});

// Track product section visibility
function setupProductSectionTracking() {
  const productSection = document.getElementById('produkten');
  if (!productSection) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      userActivity.inProductSection = entry.isIntersecting;
    });
  }, { threshold: 0.3 });

  observer.observe(productSection);
}

// Make userActivity available globally for debugging
window.userActivity = userActivity;