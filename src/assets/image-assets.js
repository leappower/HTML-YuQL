// 图片路径配置：统一使用 /images 前缀（dev/production 均通过 webpack 映射到 src/assets/images）
const IMAGE_PATH_PREFIX = 'images';

// ─── WebP 图片路径 ────────────────────────────────────────────────────────────
// 所有本地图片均已转换为 WebP（IE 已于 2022 年停止支持，WebP 全球支持率 97%+）
// 产品图列表由 optimize-images.js 自动生成 image-manifest.json，构建时静态 import
// 不再需要运行时 fetch，IMAGE_ASSETS 在模块加载时同步可用

import manifest from './images/image-manifest.json';

/** 返回图片的 WebP 路径 */
export function resolveImage(key) {
  return `${IMAGE_PATH_PREFIX}/${key}.webp`;
}

/** 生成 <img> 标签 HTML（直接 WebP，无需 <picture> fallback） */
export function imgTag(key, altText = '', cssClass = '', extraAttrs = '') {
  const src = `${IMAGE_PATH_PREFIX}/${key}.webp`;
  return `<img src="${src}" alt="${altText}" class="${cssClass}" ${extraAttrs} loading="lazy" decoding="async">`;
}

/**
 * @deprecated 使用 resolveImage(key) 代替
 */
export function resolveOptimizedImage(key) {
  return resolveImage(key);
}

/**
 * @deprecated 使用 imgTag(key, ...) 代替
 */
export function pictureTag(key, altText = '', cssClass = '', extraAttrs = '') {
  return imgTag(key, altText, cssClass, extraAttrs);
}

// ─── 非产品图（路径固定，不来自 manifest）────────────────────────────────────
const NON_PRODUCT_KEYS = new Set(['LOGO_HTML', 'LOGO_HTML_2', 'WORKSHOP_BGM']);

// ─── 从 manifest 构建产品图映射（构建时静态解析，运行时同步可用）────────────
const productImages = {};
for (const key of (manifest.images || [])) {
  if (!NON_PRODUCT_KEYS.has(key)) {
    productImages[key] = `${IMAGE_PATH_PREFIX}/${key}.webp`;
  }
}

// ─── 完整图片资源表 ──────────────────────────────────────────────────────────
export const IMAGE_ASSETS = {
  // 静态资源（logo、背景、外部 URL）
  logo:                `${IMAGE_PATH_PREFIX}/LOGO_HTML.webp`,
  logo_dark:           `${IMAGE_PATH_PREFIX}/LOGO_HTML_2.webp`,
  hero_bg:             `${IMAGE_PATH_PREFIX}/WORKSHOP_BGM.webp`,
  hero_main:           'https://img0.baidu.com/it/u=3626245982,2742441385&fm=253&fmt=auto&app=138&f=JPEG?w=751&h=500',
  factory_video_poster:'https://images.unsplash.com/photo-1581094794329-c8112a89af12?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
  factory_gallery_1:   'https://img2.baidu.com/it/u=168332913,1085575385&fm=253&fmt=auto&app=120&f=JPEG?w=1067&h=800',
  factory_gallery_2:   'https://img1.baidu.com/it/u=3546157132,670778482&fm=253&fmt=auto&app=120&f=JPEG?w=889&h=500',
  factory_gallery_3:   'https://img2.baidu.com/it/u=1657229497,365692017&fm=253&fmt=auto&app=138&f=JPEG?w=667&h=500',
  factory_gallery_4:   'https://img0.baidu.com/it/u=2595055860,25921156&fm=253&app=138&f=JPEG?w=1067&h=800',
  cert_1:              'https://liuzhoume.com/wp-content/uploads/2024/03/CT11022603-S-E-%E8%AF%81%E4%B9%A6-724x1024.webp',
  cert_2:              'https://liuzhoume.com/wp-content/uploads/2024/03/CT11022604-S-R-%E8%AF%81%E4%B9%A6-724x1024.webp',
  cert_3:              'https://liuzhoume.com/wp-content/uploads/2024/03/CTL2305128012-Q-ROHS10%E9%A1%B9%EF%BC%88%E6%89%AB%E6%8F%8F%E5%8C%96%E6%B5%8B%EF%BC%89%E4%B8%AD%E8%8B%B1%E6%8A%A5%E5%91%8A-%E5%A3%B0%E6%B3%A2%E7%94%B5%E5%8A%A8%E7%89%99%E5%88%B7%E7%B3%BB%E5%88%97-Y1_proc1.webp',
  cert_4:              'https://liuzhoume.com/wp-content/uploads/2024/03/GP-BBQ022%E5%A4%96%E8%A7%82%E4%B8%93%E5%88%A9%E8%AF%81%E4%B9%A6-_proc1-723x1024.webp',
  cert_5:              'https://liuzhoume.com/wp-content/uploads/2024/03/ISO%E8%AF%81%E4%B9%A6-B201709-723x1024.webp',
  cert_6:              'https://liuzhoume.com/wp-content/uploads/2024/03/CTL2305128011-Q%E7%94%B5%E5%8A%A8%E7%89%99%E5%88%B7_proc1.webp',
  product_compact:     'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400',
  product_professional:'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=400',
  product_industrial:  'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=400',
  // 产品图片（从 manifest 自动展开，新增图片无需手动维护）
  ...productImages,
};

// 产品图片资源 - 生产环境下应替换为实际CDN链接或本地路径
export const PRODUCT_SERIES = {
};
