import { PRODUCT_DEFAULTS, PRODUCT_SERIES } from './product-list.js';
import { IMAGE_ASSETS } from './image-assets.js';

// utils.js - Shared asset and product helpers
(function attachAppUtils(global) {
  function resolveImage(imageKey) {
    return IMAGE_ASSETS[imageKey] || '';
  }

  function applyImageAssets(root = document) {
    root.querySelectorAll('[data-image-key]').forEach((img) => {
      const src = resolveImage(img.dataset.imageKey);
      if (src) img.src = src;
    });

    root.querySelectorAll('[data-poster-key]').forEach((video) => {
      const poster = resolveImage(video.dataset.posterKey);
      if (poster) video.poster = poster;
    });

    root.querySelectorAll('[data-bg-image-key]').forEach((el) => {
      const bg = resolveImage(el.dataset.bgImageKey);
      if (bg) el.style.backgroundImage = `url('${bg}')`;
    });
  }

  function buildProductCatalog() {
    let nextId = 1;
    return PRODUCT_SERIES.flatMap((series) =>
      series.products.map((product) => {
        const imageKey = product.productImageKey || `product_${series.key}`;
        const imageUrl = product.imageUrl || resolveImage(imageKey);
        return {
          ...PRODUCT_DEFAULTS,
          id: nextId++,
          category: series.key,
          filterKey: series.key,
          imageKey,
          productImageKey: imageKey,
          imageUrl,
          productImage: imageUrl,
          ...product
        };
      })
    );
  }

  function getSeriesFilters() {
    return PRODUCT_SERIES.map((series) => ({
      key: series.key,
      filterKey: `filter_${series.key}`
    }));
  }

  global.AppUtils = {
    IMAGE_ASSETS,
    PRODUCT_SERIES,
    resolveImage,
    applyImageAssets,
    buildProductCatalog,
    getSeriesFilters
  };
})(window);
