// init.js - Initialization and user tracking code
// This code runs immediately and doesn't wait for DOM ready

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