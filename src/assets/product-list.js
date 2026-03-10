import { IMAGE_ASSETS } from './image-assets.js';
import { PRODUCT_DATA_TABLE } from './product-data-table.js';
import { MOCK_PRODUCT_SERIES_RAW } from './product-list.mock.js';

const SAFE_PRODUCT_DATA_TABLE = Array.isArray(PRODUCT_DATA_TABLE) ? PRODUCT_DATA_TABLE : [];

// 测试数据
export const PRODUCT_DEFAULTS = {
  launchDate: '2026-03',
  shippingLeadTime: '7-15天',
  minOrderQty: '1台',
  price: '请咨询',
  brand: 'YuKoLi'
};

// 测试数据
const DEFAULT_DETAIL_PARAMS = {
  material: '整机外壳优质不锈钢',
  voltage: '380V',
  frequency: '50Hz',
  power: '25kW',
  drum: '仿球釜型锅体内直径Phi580mm',
  drumCapacity: '5-20kg/锅次',
  drumMaterial: '430#不锈钢（可选不粘锅）',
  display: '10寸多功能触摸显示屏',
  turningMode: '电控翻锅',
  safety: '带急停功能',
  tempMeasure: '红外线监测温度',
  menuStorage: '存储800个菜谱（智能学习功能）',
  voice: '智能实时语音播报功能',
  sprayMode: '自动摆臂喷料/近锅口喷料',
  tray: '接料台+排水池+可提冲孔隔渣网',
  cleaning: '一键式自动清洗模式，水枪辅助清洗',
  sprayGun: '优质高压喷枪',
  capacity: '单次烹饪5-20kg',
  throughput: '单次烹饪5-20kg',
  avgCookTime: '5-10分钟'
};

export class ProductEntity {
  constructor(payload) {
    Object.assign(this, PRODUCT_DEFAULTS, { productImageKey: '', imageUrl: '' }, payload);
  }
}

// 仅用于开发环境兜底：当 PRODUCT_DATA_TABLE 为空时启用
const MOCK_PRODUCT_SERIES = MOCK_PRODUCT_SERIES_RAW.map((series) => ({
  ...series,
  products: (series.products || []).map((product) =>
    new ProductEntity({
      ...product,
      detailParams: {
        ...DEFAULT_DETAIL_PARAMS,
        ...(product.detailParams || {})
      }
    })
  )
}));

const GENERATED_PRODUCT_SERIES = SAFE_PRODUCT_DATA_TABLE.map((series) => ({
  ...series,
  products: (series.products || []).map((product) =>
    new ProductEntity({
      ...product,
      detailParams: {
        ...DEFAULT_DETAIL_PARAMS,
        ...(product.detailParams || {})
      }
    })
  )
}));

// FEISHU_SYNC_APPEND_START
export const APPENDED_PRODUCT_SERIES = [];
// FEISHU_SYNC_APPEND_END

const APPENDED_PRODUCT_SERIES_NORMALIZED = APPENDED_PRODUCT_SERIES.map((series) => ({
  ...series,
  products: (series.products || []).map((product) =>
    new ProductEntity({
      ...product,
      detailParams: {
        ...DEFAULT_DETAIL_PARAMS,
        ...(product.detailParams || {})
      }
    })
  )
}));

function withImageUrl(seriesList) {
  return seriesList.map((series) => ({
    ...series,
    products: series.products.map((product) => {
      const imageUrl = IMAGE_ASSETS[product.imageKey] || '';
      return new ProductEntity({
        ...product,
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

export function assembleProductSeries(options = {}) {
  const runtimeEnv = options.runtimeEnv || detectRuntimeEnv();
  const isDevelopment = runtimeEnv !== 'production';
  const useTableData = hasTableData(GENERATED_PRODUCT_SERIES);

  const baseSeries = useTableData
    ? GENERATED_PRODUCT_SERIES
    : (isDevelopment ? MOCK_PRODUCT_SERIES : []);

  return withImageUrl([...baseSeries, ...APPENDED_PRODUCT_SERIES_NORMALIZED]);
}

export const PRODUCT_SERIES = assembleProductSeries();
