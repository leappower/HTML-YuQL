import { IMAGE_ASSETS } from './image-assets.js';
import { PRODUCT_DATA_TABLE } from './product-data-table.js';

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

// 测试数据 - 模拟生产环境下的API响应结构
const MOCK_PRODUCT_SERIES = [
  {
    key: 'compact',
    products: [
      new ProductEntity({
        name: '智能炒菜机 Mini',
        model: 'YK-CCM-08',
        category: 'compact',
        highlights: ['紧凑机身', '快速升温', '一键自动清洗'],
        scene: '社区餐饮、轻食厨房、中央厨房分档位出餐',
        usage: '适用于自动烹饪炒菜、炒饭、炒粉、炒面等高频菜品',
        detailParams: {
          ...DEFAULT_DETAIL_PARAMS,
          power: '12kW',
          capacity: '单次烹饪3-8kg',
          throughput: '单次烹饪3-8kg',
          avgCookTime: '4-8分钟'
        },
        status: '在售',
        badgeKey: 'bestseller',
        badgeColor: 'bg-green-500',
        imageKey: 'imageKey'
      }),
      new ProductEntity({
        name: '智能炒菜机 Compact 16',
        model: 'YK-CCM-16',
        category: 'compact',
        highlights: ['16kg单次容量', '菜单可学习', '自动喷料'],
        scene: '连锁门店后厨、快餐档口、外卖专门店',
        usage: '适用于标准化菜品的批量稳定出餐',
        detailParams: {
          ...DEFAULT_DETAIL_PARAMS,
          power: '18kW',
          capacity: '单次烹饪5-16kg',
          throughput: '单次烹饪5-16kg',
          avgCookTime: '5-9分钟'
        },
        status: '在售',
        imageKey: 'imageKey'
      }),
      new ProductEntity({
        name: '智能炒菜机 Compact 24',
        model: 'YK-CCM-24',
        category: 'compact',
        highlights: ['24kg容量', '红外测温', '语音播报'],
        scene: '企事业单位食堂、小型宴席厨房',
        usage: '适用于炒饭、炒面、辣子鸡等高频热菜',
        detailParams: {
          ...DEFAULT_DETAIL_PARAMS,
          power: '22kW',
          capacity: '单次烹饪8-24kg',
          throughput: '单次烹饪8-24kg',
          avgCookTime: '6-10分钟'
        },
        status: '在售',
        imageKey: 'imageKey'
      })
    ]
  },
  {
    key: 'professional', // 产品类型
    products: [
      new ProductEntity({
        name: '智能炒菜机 Pro 32',
        model: 'YK-PRO-32',
        category: 'professional',
        highlights: ['高精度控温', '双模式喷料', '800菜谱存储'],
        scene: '酒店酒楼宴席、品牌餐饮中央厨房',
        usage: '适用于多菜系标准化出品与高峰时段集中出餐',
        detailParams: {
          ...DEFAULT_DETAIL_PARAMS,
          capacity: '单次烹饪10-32kg',
          throughput: '单次烹饪10-32kg'
        },
        status: '热销',
        badgeKey: 'recommendation',
        badgeColor: 'bg-primary',
        imageKey: 'imageKey'
      }),
      new ProductEntity({
        name: '智能炒菜机 Pro 48',
        model: 'YK-PRO-48',
        category: 'professional',
        highlights: ['大批量连续出餐', '电控翻锅', '急停防护'],
        scene: '大中型连锁门店、团餐厨房',
        usage: '适用于炒饭、炒粉、香锅、小龙虾等批量制作',
        detailParams: {
          ...DEFAULT_DETAIL_PARAMS,
          power: '28kW',
          capacity: '单次烹饪15-48kg',
          throughput: '单次烹饪15-48kg'
        },
        status: '在售',
        imageKey: 'imageKey'
      }),
      new ProductEntity({
        name: '智能炒菜机 Pro 64',
        model: 'YK-PRO-64',
        category: 'professional',
        highlights: ['64kg单次产能', '自动清洗', '语音引导维护'],
        scene: '大型食堂、景区餐饮、标准化工厂食堂',
        usage: '适用于高客流时段热菜快炒与稳定复刻',
        detailParams: {
          ...DEFAULT_DETAIL_PARAMS,
          power: '32kW',
          capacity: '单次烹饪20-64kg',
          throughput: '单次烹饪20-64kg'
        },
        status: '在售',
        imageKey: 'imageKey'
      }),
      new ProductEntity({
        name: '智能炒菜机 Pro Duo 40',
        model: 'YK-PRO-D40',
        category: 'professional',
        highlights: ['双锅并行', '独立温控', '多菜单切换快'],
        scene: '外卖爆单厨房、连锁品牌前置仓',
        usage: '适用于双菜并行烹饪与多品类高峰出餐',
        detailParams: {
          ...DEFAULT_DETAIL_PARAMS,
          power: '30kW',
          capacity: '单次烹饪2 x 20kg',
          throughput: '单次烹饪2 x 20kg'
        },
        status: '新品',
        badgeKey: 'two_chambers',
        badgeColor: 'bg-blue-500',
        imageKey: 'imageKey'
      })
    ]
  },
  {
    key: 'industrial',
    products: [
      new ProductEntity({
        name: '智能炒菜机 Industrial 96',
        model: 'YK-IND-96',
        category: 'industrial',
        highlights: ['重载结构', '自动摆臂喷料', '连续生产稳定'],
        scene: '中央厨房、食品工厂预制菜产线',
        usage: '适用于大批量自动烹饪炒菜、炒饭、炒面等',
        detailParams: {
          ...DEFAULT_DETAIL_PARAMS,
          power: '45kW',
          capacity: '单次烹饪30-96kg',
          throughput: '单次烹饪30-96kg'
        },
        status: '定制',
        badgeKey: 'industrial',
        badgeColor: 'bg-orange-500',
        imageKey: 'imageKey'
      }),
      new ProductEntity({
        name: '智能炒菜机 Industrial 128',
        model: 'YK-IND-128',
        category: 'industrial',
        highlights: ['128kg超大容量', '智能学习菜谱', '高压喷枪清洁'],
        scene: '大型团餐工厂、智慧食堂中心厨房',
        usage: '适用于超大批量热菜标准化生产',
        detailParams: {
          ...DEFAULT_DETAIL_PARAMS,
          power: '52kW',
          capacity: '单次烹饪40-128kg',
          throughput: '单次烹饪40-128kg'
        },
        status: '定制',
        imageKey: 'imageKey'
      }),
      new ProductEntity({
        name: '智能炒菜机 Industrial Custom',
        model: 'YK-IND-CUSTOM',
        category: 'industrial',
        highlights: ['按产线定制', '可扩展联动', '支持私有协议接入'],
        scene: '餐饮连锁、外卖、酒店酒楼宴席、企事业单位员工餐等场所',
        usage: '适用于自动烹饪炒菜、炒饭、炒粉、炒面、辣子鸡、麻辣香锅、小龙虾、香辣虾蟹等',
        detailParams: {
          ...DEFAULT_DETAIL_PARAMS
        },
        status: '可定制',
        badgeKey: 'custom_made',
        badgeColor: 'bg-yellow-500',
        imageKey: 'imageKey'
      })
    ]
  }
];

const GENERATED_PRODUCT_SERIES = PRODUCT_DATA_TABLE.map((series) => ({
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

export function assembleProductSeries(options = {}) {
  const runtimeEnv = options.runtimeEnv || detectRuntimeEnv();
  const forceMock = options.forceMock === true;
  const isProduction = runtimeEnv === 'production';

  if (isProduction && !forceMock) {
    // 生产环境默认只返回新增单独数据
    return withImageUrl([...GENERATED_PRODUCT_SERIES, ...APPENDED_PRODUCT_SERIES_NORMALIZED]);
  }

  // 开发环境或强制 mock 时，返回 mock + 新增独立数据
  return withImageUrl([...MOCK_PRODUCT_SERIES, ...GENERATED_PRODUCT_SERIES, ...APPENDED_PRODUCT_SERIES_NORMALIZED]);
}

export const PRODUCT_SERIES = assembleProductSeries();
