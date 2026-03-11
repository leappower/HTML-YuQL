import { IMAGE_ASSETS } from './image-assets.js';
import { PRODUCT_DATA_TABLE } from './product-data-table.js';
import { MOCK_PRODUCT_SERIES_RAW } from './product-list.mock.js';

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
  const imageRecognitionKey = product.imageRecognitionKey || null;

  return new ProductEntity({
    ...PRODUCT_DEFAULTS,
    ...product,
    category: toNullableString(product.category) || toNullableString(fallbackCategory),
    subCategory: toNullableString(product.subCategory),
    model: toNullableString(product.model),
    name: toNullableString(product.name),
    highlights: toArrayValue(product.highlights),
    scenarios: toNullableString(product.scenarios),
    usage: toNullableString(product.usage),
    power: toNullableString(product.power),
    throughput: toNullableString(product.throughput),
    averageTime: toNullableString(product.averageTime),
    launchTime: toNullableString(product.launchTime),
    status: toNullableString(product.status) || '在售',
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
  });
}

export class ProductEntity {
  constructor(payload) {
    Object.assign(this, PRODUCT_DEFAULTS, { productImageKey: '', imageUrl: '' }, payload);
  }
}

const MOCK_PRODUCT_SERIES = MOCK_PRODUCT_SERIES_RAW.map((series) => ({
  ...series,
  products: (series.products || []).map((product) =>
    normalizeProduct(product, series.category)
  )
}));

const GENERATED_PRODUCT_SERIES = SAFE_PRODUCT_DATA_TABLE.map((series) => ({
  ...series,
  products: (series.products || []).map((product) =>
    normalizeProduct(product, series.category)
  )
}));

// FEISHU_SYNC_APPEND_START
export const APPENDED_PRODUCT_SERIES = [];
// FEISHU_SYNC_APPEND_END

const APPENDED_PRODUCT_SERIES_NORMALIZED = APPENDED_PRODUCT_SERIES.map((series) => ({
  ...series,
  products: (series.products || []).map((product) =>
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
        imageUrl
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
  const isDevelopment = runtimeEnv !== 'production';
  const useTableData = hasTableData(GENERATED_PRODUCT_SERIES);

  const baseSeries = useTableData
    ? GENERATED_PRODUCT_SERIES
    : (isDevelopment ? MOCK_PRODUCT_SERIES : []);

  const combined = [...baseSeries, ...APPENDED_PRODUCT_SERIES_NORMALIZED];
  return withImageUrl(mergeSeriesByIdentity(combined));
}

export const PRODUCT_SERIES = assembleProductSeries();
