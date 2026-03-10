// 开发环境兜底 mock 数据
export const MOCK_PRODUCT_SERIES_RAW = [
  {
    key: 'compact',
    products: [
      {
        name: '智能炒菜机 Mini',
        model: 'YK-CCM-08',
        category: 'compact',
        highlights: ['紧凑机身', '快速升温', '一键自动清洗'],
        scene: '社区餐饮、轻食厨房',
        usage: '适用于自动烹饪炒菜、炒饭、炒粉、炒面',
        detailParams: {
          power: '12kW',
          capacity: '单次烹饪3-8kg',
          throughput: '单次烹饪3-8kg',
          avgCookTime: '4-8分钟'
        },
        status: '在售',
        badgeKey: 'bestseller',
        badgeColor: 'bg-green-500',
        imageKey: 'product_compact'
      }
    ]
  }
];
