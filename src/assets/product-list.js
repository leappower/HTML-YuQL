import { IMAGE_ASSETS } from './image-assets.js';
import { PRODUCT_DATA_TABLE } from './product-data-table.js';

const SAFE_PRODUCT_DATA_TABLE = Array.isArray(PRODUCT_DATA_TABLE) ? PRODUCT_DATA_TABLE : [];

export const PRODUCT_DEFAULTS = {
  category: null,
  subCategory: null,
  model: null,
  name: null,
  highlights: null,
  scenarios: null,
  usage: null,
  power: null,
  throughput: null,
  averageTime: null,
  launchTime: null,
  status: null,
  isActive: true,
  badge: null,
  badgeColor: null,
  imageRecognitionKey: null,
  packingQuantity: null,
  productDimensions: null,
  packageDimensions: null,
  outerBoxDimensions: null,
  packageType: null,
  color: null,
  netWeight: null,
  grossWeight: null,
  voltage: null,
  frequency: null,
  material: null,
  warrantyPeriod: null,
  certification: null,
  temperatureRange: null,
  controlMethod: null,
  energyEfficiencyGrade: null,
  applicablePeople: null,
  origin: null,
  barcode: null,
  referencePrice: null,
  minimumOrderQuantity: null,
  stockQuantity: null,
  brand: null
};

function toArrayValue(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  const raw = String(value || '').trim();
  if (!raw) return [];
  return raw
    .replace(/；/g, ';')
    .replace(/，/g, ',')
    .split(/[;,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function toNullableString(value) {
  if (value == null) return null;
  const text = String(value).trim();
  return text ? text : null;
}

function toBooleanOrDefault(value, defaultValue = true) {
  if (value == null) return defaultValue;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return true;

  const text = String(value).trim();
  if (!text) return defaultValue;
  if (text === 'false' || text === 'False' || text === 'FALSE' || text === '否') {
    return false;
  }
  return true;
}

function normalizeProduct(product, fallbackCategory) {
  // 提取 imageRecognitionKey，支持从 i18n 对象中提取
  const imageRecognitionKey =
    product.imageRecognitionKey ||
    (product.i18n?.imageRecognitionKey?.['zh-CN']) ||
    null;


  // 先取主字段，主字段为 null 时自动 fallback 到 i18n 下以 _fieldName 结尾的 key
  function getFieldWithI18nKey(fieldName) {
    const mainVal = toNullableString(product[fieldName]);
    if (mainVal) return mainVal;
    if (product.i18n && typeof product.i18n === 'object') {
      // 1. 兼容编码型 key
      const matchKey = Object.keys(product.i18n).find(k => k.endsWith('_' + fieldName));
      if (matchKey) {
        const i18nObj = product.i18n[matchKey];
        if (typeof i18nObj === 'string') {
          if (i18nObj.trim()) return i18nObj.trim();
        }
        if (i18nObj && typeof i18nObj === 'object') {
          if (typeof i18nObj['zh-CN'] === 'string' && i18nObj['zh-CN'].trim()) return i18nObj['zh-CN'].trim();
          if (typeof i18nObj['en'] === 'string' && i18nObj['en'].trim()) return i18nObj['en'].trim();
          const first = Object.values(i18nObj).find(v => typeof v === 'string' && v.trim());
          if (first) return String(first).trim();
        }
      }
      // 2. 兼容标准字段名 key
      if (fieldName in product.i18n) {
        const i18nObj = product.i18n[fieldName];
        if (typeof i18nObj === 'string') {
          if (i18nObj.trim()) return i18nObj.trim();
        }
        if (i18nObj && typeof i18nObj === 'object') {
          if (typeof i18nObj['zh-CN'] === 'string' && i18nObj['zh-CN'].trim()) return i18nObj['zh-CN'].trim();
          if (typeof i18nObj['en'] === 'string' && i18nObj['en'].trim()) return i18nObj['en'].trim();
          const first = Object.values(i18nObj).find(v => typeof v === 'string' && v.trim());
          if (first) return String(first).trim();
        }
      }
    }
    return null;
  }

  const logFields = {
    name: getFieldWithI18nKey('name'),
    model: toNullableString(product.model),
    category: toNullableString(product.category) || toNullableString(fallbackCategory),
    scenarios: getFieldWithI18nKey('scenarios'),
    usage: getFieldWithI18nKey('usage'),
    power: toNullableString(product.power),
    throughput: toNullableString(product.throughput),
    averageTime: toNullableString(product.averageTime),
    launchTime: toNullableString(product.launchTime),
    status: toNullableString(product.status) || '',
    isActive: toBooleanOrDefault(product.isActive, true),
    badge: toNullableString(product.badge),
    badgeColor: toNullableString(product.badgeColor),
    imageRecognitionKey,
    packingQuantity: toNullableString(product.packingQuantity),
    productDimensions: toNullableString(product.productDimensions),
    packageDimensions: toNullableString(product.packageDimensions),
    outerBoxDimensions: toNullableString(product.outerBoxDimensions),
    packageType: toNullableString(product.packageType),
    color: toNullableString(product.color),
    netWeight: toNullableString(product.netWeight),
    grossWeight: toNullableString(product.grossWeight),
    voltage: toNullableString(product.voltage),
    frequency: toNullableString(product.frequency),
    material: toNullableString(product.material),
    warrantyPeriod: toNullableString(product.warrantyPeriod),
    certification: toNullableString(product.certification),
    temperatureRange: toNullableString(product.temperatureRange),
    controlMethod: toNullableString(product.controlMethod),
    energyEfficiencyGrade: toNullableString(product.energyEfficiencyGrade),
    applicablePeople: toNullableString(product.applicablePeople),
    origin: toNullableString(product.origin),
    barcode: toNullableString(product.barcode),
    referencePrice: toNullableString(product.referencePrice),
    minimumOrderQuantity: toNullableString(product.minimumOrderQuantity),
    stockQuantity: toNullableString(product.stockQuantity),
    productImageKey: imageRecognitionKey
  };
  // ...existing code...
  return new ProductEntity({
    ...PRODUCT_DEFAULTS,
    ...product,
    category: logFields.category,
    subCategory: toNullableString(product.subCategory),
    model: logFields.model,
    name: logFields.name,
    highlights: toArrayValue(product.highlights),
    scenarios: logFields.scenarios,
    usage: logFields.usage,
    power: logFields.power,
    throughput: logFields.throughput,
    averageTime: logFields.averageTime,
    launchTime: logFields.launchTime,
    status: logFields.status,
    isActive: logFields.isActive,
    badge: logFields.badge,
    badgeColor: logFields.badgeColor,
    imageRecognitionKey: logFields.imageRecognitionKey,
    packingQuantity: logFields.packingQuantity,
    productDimensions: logFields.productDimensions,
    packageDimensions: logFields.packageDimensions,
    outerBoxDimensions: logFields.outerBoxDimensions,
    packageType: logFields.packageType,
    color: logFields.color,
    netWeight: logFields.netWeight,
    grossWeight: logFields.grossWeight,
    voltage: logFields.voltage,
    frequency: logFields.frequency,
    material: logFields.material,
    warrantyPeriod: logFields.warrantyPeriod,
    certification: logFields.certification,
    temperatureRange: logFields.temperatureRange,
    controlMethod: logFields.controlMethod,
    energyEfficiencyGrade: logFields.energyEfficiencyGrade,
    applicablePeople: logFields.applicablePeople,
    origin: logFields.origin,
    barcode: logFields.barcode,
    referencePrice: logFields.referencePrice,
    minimumOrderQuantity: logFields.minimumOrderQuantity,
    stockQuantity: logFields.stockQuantity,
    productImageKey: logFields.productImageKey
  });
}

export class ProductEntity {
  constructor(payload) {
    Object.assign(this, PRODUCT_DEFAULTS, { productImageKey: '', imageUrl: '' }, payload);
  }
}


function filterValidProducts(products) {
  return (products || []).filter(
    p => p && typeof p === 'object' && Object.keys(p).length > 0
  );
}



SAFE_PRODUCT_DATA_TABLE.forEach((series) => {
  console.log('[分析] series:', series && series.category, 'products类型:', Array.isArray(series && series.products), 'products长度:', series && series.products && series.products.length);
  // ...existing code...
});

const GENERATED_PRODUCT_SERIES = SAFE_PRODUCT_DATA_TABLE.map((series) => ({
  ...series,
  products: filterValidProducts(series.products).map((product) => {
    return normalizeProduct(product, series.category);
  })
}));

// FEISHU_SYNC_APPEND_START
export const APPENDED_PRODUCT_SERIES = [];
// FEISHU_SYNC_APPEND_END

const APPENDED_PRODUCT_SERIES_NORMALIZED = APPENDED_PRODUCT_SERIES.map((series) => ({
  ...series,
  products: filterValidProducts(series.products).map((product) =>
    normalizeProduct(product, series.category)
  )
}));

function withImageUrl(seriesList) {
  return seriesList.map((series) => ({
    ...series,
    products: series.products.map((product) => {
      const imageKey = product.imageRecognitionKey || '';
      const imageUrl = IMAGE_ASSETS[imageKey] || '';
      return new ProductEntity({
        ...product,
        imageRecognitionKey: imageKey || null,
        productImageKey: imageKey || null,
        imageUrl,
        productImage: imageUrl
      });
    })
  }));
}

function detectRuntimeEnv() {
  if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV) {
    return process.env.NODE_ENV;
  }
  return 'development';
}

function hasTableData(seriesList) {
  return (seriesList || []).some((series) => Array.isArray(series.products) && series.products.length > 0);
}

function productIdentityKey(product, fallbackCategory) {
  const category = toNullableString(product?.category) || toNullableString(fallbackCategory) || '';
  const subCategory = toNullableString(product?.subCategory) || '';
  const model = toNullableString(product?.model) || '';
  return `${category}::${subCategory}::${model}`;
}

function mergeSeriesByIdentity(seriesList) {
  const grouped = new Map();

  for (const series of seriesList || []) {
    const category = toNullableString(series?.category);
    if (!category) continue;

    if (!grouped.has(category)) {
      grouped.set(category, { category, products: [], indexMap: new Map() });
    }

    const target = grouped.get(category);
    for (const product of series.products || []) {
      const pid = productIdentityKey(product, category);
      const hasIdentity = Boolean(pid !== `${category}::::` && pid !== '::::');

      if (hasIdentity && target.indexMap.has(pid)) {
        const idx = target.indexMap.get(pid);
        target.products[idx] = { ...target.products[idx], ...product };
        continue;
      }

      target.products.push(product);
      if (hasIdentity) {
        target.indexMap.set(pid, target.products.length - 1);
      }
    }
  }

  return Array.from(grouped.values()).map(({ category, products }) => ({ category, products }));
}

export function assembleProductSeries(options = {}) {
  const runtimeEnv = options.runtimeEnv || detectRuntimeEnv();
  void runtimeEnv; // runtimeEnv 供调试/扩展保留，当前通过 hasTableData 决策
  
  const useTableData = hasTableData(GENERATED_PRODUCT_SERIES);

  const baseSeries = useTableData
    ? GENERATED_PRODUCT_SERIES
    : [];

  const combined = [...baseSeries, ...APPENDED_PRODUCT_SERIES_NORMALIZED];
  return withImageUrl(mergeSeriesByIdentity(combined));
}

export const PRODUCT_SERIES = assembleProductSeries();
