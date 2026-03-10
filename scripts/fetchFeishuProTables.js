const fs = require('fs');
const http = require('http');
const path = require('path');
const https = require('https');

const PRODUCT_LIST_PATH = path.join(process.cwd(), 'src/assets/product-list.js');
const PRODUCT_TABLE_PATH = path.join(process.cwd(), 'src/assets/product-data-table.js');
const FEISHU_CONFIG_PATH = path.join(process.cwd(), 'scripts/feishu-config.json');
const APPEND_START = '// FEISHU_SYNC_APPEND_START';
const APPEND_END = '// FEISHU_SYNC_APPEND_END';

function requestJson(url, method = 'GET', headers = {}, payload = null) {
  return new Promise((resolve, reject) => {
    const body = payload ? JSON.stringify(payload) : null;
    const req = https.request(
      url,
      {
        method,
        headers: {
          ...headers,
          ...(body ? { 'Content-Type': 'application/json; charset=utf-8' } : {})
        }
      },
      (res) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          const raw = Buffer.concat(chunks).toString('utf-8');
          if (res.statusCode < 200 || res.statusCode >= 300) {
            reject(new Error(`HTTP ${res.statusCode}: ${raw}`));
            return;
          }
          try {
            resolve(raw ? JSON.parse(raw) : {});
          } catch (err) {
            reject(new Error(`Invalid JSON response: ${err.message}`));
          }
        });
      }
    );

    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function getTenantAccessToken(appId, appSecret) {
  const resp = await requestJson(
    'https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal',
    'POST',
    {},
    { app_id: appId, app_secret: appSecret }
  );
  if (resp.code !== 0 || !resp.tenant_access_token) {
    throw new Error(`Feishu auth failed: ${JSON.stringify(resp)}`);
  }
  return resp.tenant_access_token;
}

function parseQueryParamsFromRawUrl(raw) {
  const result = {};
  const qIndex = raw.indexOf('?');
  if (qIndex < 0) return result;
  const query = raw.slice(qIndex + 1).split('#')[0];
  for (const part of query.split('&')) {
    if (!part) continue;
    const [k, v = ''] = part.split('=');
    const key = decodeURIComponent(String(k || '').trim());
    const value = decodeURIComponent(String(v || '').trim());
    if (key) result[key] = value;
  }
  return result;
}

function requestForRedirect(urlString, method = 'HEAD') {
  return new Promise((resolve, reject) => {
    const protocol = String(urlString).startsWith('http://') ? http : https;
    const req = protocol.request(
      urlString,
      {
        method,
        headers: {
          'User-Agent': 'HTML-YuQL-FeishuSync/1.0'
        }
      },
      (res) => {
        resolve({
          statusCode: res.statusCode || 0,
          location: res.headers.location || '',
          finalUrl: urlString
        });
        res.resume();
      }
    );
    req.on('error', reject);
    req.end();
  });
}

async function resolveFinalFeishuUrl(rawUrl, maxHops = 5) {
  let current = String(rawUrl || '').trim();
  if (!/^https?:\/\//i.test(current)) {
    return current;
  }

  for (let i = 0; i < maxHops; i += 1) {
    let resp;
    try {
      resp = await requestForRedirect(current, 'HEAD');
      if (resp.statusCode >= 400) {
        resp = await requestForRedirect(current, 'GET');
      }
    } catch (_) {
      return current;
    }

    const code = Number(resp.statusCode || 0);
    const location = String(resp.location || '').trim();
    if (code >= 300 && code < 400 && location) {
      current = new URL(location, current).toString();
      continue;
    }
    return current;
  }

  return current;
}

function parseBitableTarget(sheetRange) {
  const raw = String(sheetRange || '').trim();
  if (!raw) return { appToken: '', tableId: '', viewId: '' };

  if (/^https?:\/\//i.test(raw)) {
    const appTokenMatch = raw.match(/\/base\/([A-Za-z0-9]+)/i);
    const appToken = appTokenMatch?.[1] || '';
    const params = parseQueryParamsFromRawUrl(raw);
    const tableId = params.table || params.table_id || params.tableId || '';
    const viewId = params.view || params.view_id || params.viewId || '';
    return { appToken, tableId, viewId };
  }

  const byPipe = raw.split('|').map((s) => s.trim()).filter(Boolean);
  if (byPipe.length >= 2) {
    return { appToken: '', tableId: byPipe[0], viewId: byPipe[1] };
  }
  return { appToken: '', tableId: raw, viewId: '' };
}

function normalizeBitableFieldValue(value) {
  if (value == null) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value).trim();
  }
  if (Array.isArray(value)) {
    return value
      .map((v) => {
        if (v == null) return '';
        if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return String(v).trim();
        if (typeof v === 'object') {
          if (typeof v.text === 'string') return v.text.trim();
          if (typeof v.name === 'string') return v.name.trim();
          if (typeof v.link === 'string') return v.link.trim();
          return JSON.stringify(v);
        }
        return String(v).trim();
      })
      .filter(Boolean)
      .join(', ');
  }
  if (typeof value === 'object') {
    if (typeof value.text === 'string') return value.text.trim();
    if (typeof value.name === 'string') return value.name.trim();
    return JSON.stringify(value);
  }
  return String(value).trim();
}

async function fetchFeishuSheetRows({ appId, appSecret, spreadsheetToken, sheetRange }) {
  const token = await getTenantAccessToken(appId, appSecret);
  const resolvedSheetRange = await resolveFinalFeishuUrl(sheetRange);
  const { appToken, tableId, viewId } = parseBitableTarget(resolvedSheetRange);
  const finalAppToken = appToken || String(spreadsheetToken || '').trim();
  if (!finalAppToken) {
    throw new Error('Missing app token: set spreadsheet_token or provide bitable URL containing /base/{app_token}');
  }
  if (!tableId) {
    throw new Error('sheet_range must provide table_id, or use bitable URL with ?table=xxx');
  }

  let pageToken = '';
  const rows = [];

  while (true) {
    const params = new URLSearchParams();
    params.set('page_size', '500');
    if (pageToken) params.set('page_token', pageToken);
    if (viewId) params.set('view_id', viewId);

    const url = `https://open.feishu.cn/open-apis/bitable/v1/apps/${finalAppToken}/tables/${tableId}/records?${params.toString()}`;
    const resp = await requestJson(url, 'GET', { Authorization: `Bearer ${token}` });
    if (resp.code !== 0) {
      throw new Error(`Feishu bitable read failed: ${JSON.stringify(resp)}`);
    }

    const items = resp.data?.items || [];
    for (const item of items) {
      const fields = item.fields || {};
      const row = {};
      for (const [key, value] of Object.entries(fields)) {
        row[String(key).trim()] = normalizeBitableFieldValue(value);
      }
      if (Object.keys(row).length > 0) {
        rows.push(row);
      }
    }

    if (!resp.data?.has_more) break;
    pageToken = resp.data?.page_token || '';
    if (!pageToken) break;
  }

  return rows;
}

const ALIAS = {
  '系列': 'key',
  '系列key': 'key',
  key: 'key',
  '分类': 'category',
  category: 'category',
  '产品名称': 'name',
  name: 'name',
  '型号': 'model',
  model: 'model',
  '卖点': 'highlights',
  highlights: 'highlights',
  '应用场景': 'scene',
  scene: 'scene',
  '用途': 'usage',
  usage: 'usage',
  '功率': 'power',
  '产能': 'capacity',
  '吞吐': 'throughput',
  '平均出餐时间': 'avgCookTime',
  '状态': 'status',
  '徽标key': 'badgeKey',
  badgeKey: 'badgeKey',
  '徽标颜色': 'badgeColor',
  badgeColor: 'badgeColor',
  '图片key': 'imageKey',
  imageKey: 'imageKey'
};

function splitHighlights(text) {
  const s = String(text || '').trim();
  if (!s) return [];
  const normalized = s.replace(/；/g, ';').replace(/，/g, ',');
  const parts = normalized.includes(';') ? normalized.split(';') : normalized.split(',');
  return parts.map((p) => p.trim()).filter(Boolean);
}

function normalizeRow(rawRow) {
  const row = {};
  for (const [key, value] of Object.entries(rawRow)) {
    row[ALIAS[key] || key] = value == null ? '' : String(value).trim();
  }
  if (!row.key) row.key = row.category || '';
  if (!row.category) row.category = row.key || '';
  return row;
}

function toSeriesList(rawRows) {
  const grouped = new Map();

  for (const rawRow of rawRows) {
    const row = normalizeRow(rawRow);
    if (!row.key) continue;

    if (!grouped.has(row.key)) grouped.set(row.key, []);

    const product = {
      name: row.name || '',
      model: row.model || '',
      category: row.category || row.key,
      highlights: splitHighlights(row.highlights || ''),
      scene: row.scene || '',
      usage: row.usage || '',
      detailParams: {
        power: row.power || undefined,
        capacity: row.capacity || undefined,
        throughput: row.throughput || undefined,
        avgCookTime: row.avgCookTime || undefined
      },
      status: row.status || '在售',
      badgeKey: row.badgeKey || undefined,
      badgeColor: row.badgeColor || undefined,
      imageKey: row.imageKey || undefined
    };

    product.detailParams = Object.fromEntries(
      Object.entries(product.detailParams).filter(([, value]) => value != null && value !== '')
    );

    const compact = Object.fromEntries(
      Object.entries(product).filter(([, value]) => {
        if (value == null) return false;
        if (Array.isArray(value)) return true;
        if (typeof value === 'object') return Object.keys(value).length > 0;
        return value !== '';
      })
    );

    grouped.get(row.key).push(compact);
  }

  return Array.from(grouped.entries()).map(([key, products]) => ({ key, products }));
}

function productIdentityKey(product) {
  const model = String(product.model || '').trim();
  const name = String(product.name || '').trim();
  const category = String(product.category || '').trim();
  return `${category}::${model || name}`;
}

function mergeSeriesAppend(existingSeries, incomingSeries) {
  const mergedMap = new Map();

  for (const series of existingSeries || []) {
    mergedMap.set(series.key, {
      key: series.key,
      products: Array.isArray(series.products) ? [...series.products] : []
    });
  }

  let appendedCount = 0;
  let updatedCount = 0;

  for (const series of incomingSeries || []) {
    if (!mergedMap.has(series.key)) {
      mergedMap.set(series.key, { key: series.key, products: [] });
    }

    const target = mergedMap.get(series.key);
    const indexByIdentity = new Map();
    target.products.forEach((item, idx) => indexByIdentity.set(productIdentityKey(item), idx));

    for (const product of series.products || []) {
      const identity = productIdentityKey(product);
      if (!identity.endsWith('::')) {
        if (indexByIdentity.has(identity)) {
          const idx = indexByIdentity.get(identity);
          const before = JSON.stringify(target.products[idx]);
          const afterObj = { ...target.products[idx], ...product };
          const after = JSON.stringify(afterObj);
          if (before !== after) {
            target.products[idx] = afterObj;
            updatedCount += 1;
          }
        } else {
          target.products.push(product);
          indexByIdentity.set(identity, target.products.length - 1);
          appendedCount += 1;
        }
      }
    }
  }

  return {
    series: Array.from(mergedMap.values()),
    appendedCount,
    updatedCount
  };
}

function extractJsonArrayFromJs(fileContent, exportName) {
  const marker = `export const ${exportName} =`;
  const start = fileContent.indexOf(marker);
  if (start < 0) return null;

  const arrayStart = fileContent.indexOf('[', start);
  if (arrayStart < 0) return null;

  let depth = 0;
  for (let i = arrayStart; i < fileContent.length; i += 1) {
    const ch = fileContent[i];
    if (ch === '[') depth += 1;
    if (ch === ']') depth -= 1;
    if (depth === 0) {
      const jsonText = fileContent.slice(arrayStart, i + 1);
      return JSON.parse(jsonText);
    }
  }
  return null;
}

function readAppendedSeriesFromProductList(productListPath = PRODUCT_LIST_PATH) {
  const content = fs.readFileSync(productListPath, 'utf-8');
  const start = content.indexOf(APPEND_START);
  const end = content.indexOf(APPEND_END);
  if (start < 0 || end < 0 || end <= start) {
    throw new Error('product-list.js is missing FEISHU append markers');
  }

  const block = content.slice(start, end);
  const parsed = extractJsonArrayFromJs(block, 'APPENDED_PRODUCT_SERIES');
  return parsed || [];
}

function writeAppendedSeriesToProductList(seriesList, productListPath = PRODUCT_LIST_PATH) {
  const content = fs.readFileSync(productListPath, 'utf-8');
  const start = content.indexOf(APPEND_START);
  const end = content.indexOf(APPEND_END);
  if (start < 0 || end < 0 || end <= start) {
    throw new Error('product-list.js is missing FEISHU append markers');
  }

  const replacement = `${APPEND_START}\nexport const APPENDED_PRODUCT_SERIES = ${JSON.stringify(seriesList, null, 2)};\n`;
  const newContent = content.slice(0, start) + replacement + content.slice(end);
  fs.writeFileSync(productListPath, newContent, 'utf-8');
}

function readProductDataTableSeries(tablePath = PRODUCT_TABLE_PATH) {
  const content = fs.readFileSync(tablePath, 'utf-8');
  return extractJsonArrayFromJs(content, 'PRODUCT_DATA_TABLE') || [];
}

function writeProductDataTableSeries(seriesList, tablePath = PRODUCT_TABLE_PATH) {
  const header = '// 产品数据表（由增量同步自动更新）\n';
  const body = `export const PRODUCT_DATA_TABLE = ${JSON.stringify(seriesList, null, 2)};\n`;
  fs.writeFileSync(tablePath, header + body, 'utf-8');
}

async function syncFeishuToProductList(config) {
  const rows = await fetchFeishuSheetRows(config);
  const incomingSeries = toSeriesList(rows);
  const existingSeries = readAppendedSeriesFromProductList(config.productListPath || PRODUCT_LIST_PATH);
  const merged = mergeSeriesAppend(existingSeries, incomingSeries);

  writeAppendedSeriesToProductList(merged.series, config.productListPath || PRODUCT_LIST_PATH);
  return {
    rows: rows.length,
    series: merged.series.length,
    appended: merged.appendedCount,
    updated: merged.updatedCount
  };
}

async function syncFeishuToProductDataTable(config) {
  const rows = await fetchFeishuSheetRows(config);
  const incomingSeries = toSeriesList(rows);
  const existingSeries = readProductDataTableSeries(config.productTablePath || PRODUCT_TABLE_PATH);
  const merged = mergeSeriesAppend(existingSeries, incomingSeries);

  writeProductDataTableSeries(merged.series, config.productTablePath || PRODUCT_TABLE_PATH);
  return {
    rows: rows.length,
    series: merged.series.length,
    appended: merged.appendedCount,
    updated: merged.updatedCount
  };
}

function msUntilNext4am(now = new Date()) {
  const next = new Date(now);
  next.setHours(4, 0, 0, 0);
  if (next <= now) {
    next.setDate(next.getDate() + 1);
  }
  return next.getTime() - now.getTime();
}

function scheduleDaily4amSync(task) {
  function scheduleNext() {
    const delay = msUntilNext4am();
    setTimeout(async () => {
      try {
        await task();
      } catch (err) {
        console.error('[feishu-sync] daily task failed:', err.message);
      }
      scheduleNext();
    }, delay);
  }
  scheduleNext();
}

function buildFeishuConfigFromEnv() {
  let fileConfig = {};
  if (fs.existsSync(FEISHU_CONFIG_PATH)) {
    try {
      fileConfig = JSON.parse(fs.readFileSync(FEISHU_CONFIG_PATH, 'utf-8')) || {};
    } catch (err) {
      console.error('[feishu-sync] invalid config file JSON:', FEISHU_CONFIG_PATH, err.message);
    }
  }

  return {
    appId: process.env.FEISHU_APP_ID || fileConfig.app_id || '',
    appSecret: process.env.FEISHU_APP_SECRET || fileConfig.app_secret || '',
    spreadsheetToken: process.env.FEISHU_SPREADSHEET_TOKEN || fileConfig.spreadsheet_token || '',
    sheetRange: process.env.FEISHU_SHEET_RANGE || fileConfig.sheet_range || '',
    productListPath: process.env.FEISHU_SYNC_PRODUCT_LIST_PATH || PRODUCT_LIST_PATH,
    productTablePath: process.env.FEISHU_SYNC_TABLE_PATH || PRODUCT_TABLE_PATH
  };
}

function validateFeishuConfig(config) {
  if (!config || !config.appId || !config.appSecret || !config.sheetRange) {
    return false;
  }
  const parsed = parseBitableTarget(config.sheetRange);
  const hasAppToken = Boolean(config.spreadsheetToken || parsed.appToken);
  return Boolean(hasAppToken && parsed.tableId);
}

async function runFeishuSyncOnce({ syncTo = 'both' } = {}) {
  const config = buildFeishuConfigFromEnv();
  if (!validateFeishuConfig(config)) {
    return { skipped: true, reason: 'missing env config' };
  }

  const result = {};
  if (syncTo === 'product-list' || syncTo === 'both') {
    result.productList = await syncFeishuToProductList(config);
  }
  if (syncTo === 'product-table' || syncTo === 'both') {
    result.productTable = await syncFeishuToProductDataTable(config);
  }
  return { skipped: false, ...result };
}

function startDailyFeishuSyncScheduler() {
  scheduleDaily4amSync(async () => {
    const result = await runFeishuSyncOnce({ syncTo: 'both' });
    if (result.skipped) {
      console.log('[feishu-sync] skipped daily run:', result.reason);
      return;
    }
    console.log('[feishu-sync] synced at 04:00:', JSON.stringify(result));
  });
}

const feishuProTables = {
  fetchFeishuSheetRows,
  toSeriesList,
  mergeSeriesAppend,
  syncFeishuToProductList,
  syncFeishuToProductDataTable,
  runFeishuSyncOnce,
  startDailyFeishuSyncScheduler,
  buildFeishuConfigFromEnv,
  validateFeishuConfig,
  parseBitableTarget,
  resolveFinalFeishuUrl
};

module.exports = {
  feishuProTables,
  ...feishuProTables
};
