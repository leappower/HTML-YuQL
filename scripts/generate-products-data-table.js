const fs = require('fs');
const http = require('http');
const https = require('https');
const path = require('path');

const PRODUCT_LIST_PATH = path.join(process.cwd(), 'src/assets/product-list.js');
const PRODUCT_TABLE_PATH = path.join(process.cwd(), 'src/assets/product-data-table.js');
const FEISHU_CONFIG_PATH = path.join(process.cwd(), 'scripts/feishu-config.json');
const APPEND_START = '// FEISHU_SYNC_APPEND_START';
const APPEND_END = '// FEISHU_SYNC_APPEND_END';

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

function loadSharedFeishuConfig(configPath = FEISHU_CONFIG_PATH) {
  if (!fs.existsSync(configPath)) {
    return {};
  }
  try {
    return JSON.parse(fs.readFileSync(configPath, 'utf-8')) || {};
  } catch (err) {
    throw new Error(`Invalid JSON in config file: ${configPath} (${err.message})`);
  }
}

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
          if ((res.statusCode || 0) < 200 || (res.statusCode || 0) >= 300) {
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

async function getFeishuTenantToken(appId, appSecret) {
  const tokenResp = await requestJson(
    'https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal',
    'POST',
    {},
    { app_id: appId, app_secret: appSecret }
  );
  if (tokenResp.code !== 0 || !tokenResp.tenant_access_token) {
    throw new Error(`Feishu auth failed: ${JSON.stringify(tokenResp)}`);
  }
  return tokenResp.tenant_access_token;
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
      if ((resp.statusCode || 0) >= 400) {
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

function normalizeBitableValue(value) {
  if (value == null) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value).trim();
  }
  if (Array.isArray(value)) {
    const normalized = [];
    for (const item of value) {
      if (item == null) continue;
      if (typeof item === 'object') {
        const text = item.text || item.name || item.link;
        normalized.push(text ? String(text).trim() : JSON.stringify(item));
      } else {
        normalized.push(String(item).trim());
      }
    }
    return normalized.filter(Boolean).join(', ');
  }
  if (typeof value === 'object') {
    const text = value.text || value.name;
    if (text) return String(text).trim();
    return JSON.stringify(value);
  }
  return String(value).trim();
}

async function fetchRowsFromFeishuSheet(appId, appSecret, spreadsheetToken, sheetRange) {
  const token = await getFeishuTenantToken(appId, appSecret);
  const resolvedSheetRange = await resolveFinalFeishuUrl(sheetRange);
  const { appToken, tableId, viewId } = parseBitableTarget(resolvedSheetRange);
  const finalAppToken = String(appToken || spreadsheetToken || '').trim();

  if (!finalAppToken) {
    throw new Error(
      'Missing app token: set spreadsheet_token or use bitable URL containing /base/{app_token}'
    );
  }
  if (!tableId) {
    throw new Error('sheet_range must provide table_id, or use bitable URL with ?table=xxx');
  }

  let pageToken = '';
  const rawRows = [];
  let hasMore = true;

  while (hasMore) {
    const params = new URLSearchParams();
    params.set('page_size', '500');
    if (pageToken) params.set('page_token', pageToken);
    if (viewId) params.set('view_id', viewId);

    const valuesUrl = `https://open.feishu.cn/open-apis/bitable/v1/apps/${finalAppToken}/tables/${tableId}/records?${params.toString()}`;
    const valuesResp = await requestJson(valuesUrl, 'GET', { Authorization: `Bearer ${token}` });
    if (valuesResp.code !== 0) {
      throw new Error(`Feishu bitable read failed: ${JSON.stringify(valuesResp)}`);
    }

    const items = valuesResp.data?.items || [];
    for (const item of items) {
      const fields = item.fields || {};
      const row = {};
      for (const [key, value] of Object.entries(fields)) {
        row[String(key).trim()] = normalizeBitableValue(value);
      }
      if (Object.keys(row).length > 0) {
        rawRows.push(row);
      }
    }

    hasMore = Boolean(valuesResp.data?.has_more);
    if (!hasMore) break;
    pageToken = valuesResp.data?.page_token || '';
    if (!pageToken) break;
  }

  if (rawRows.length === 0) {
    throw new Error('Feishu bitable is empty');
  }

  return rawRows;
}

function fetchRowsFromXlsx(xlsxPath) {
  // Lazy require so Feishu-only flows don't require xlsx parser installation.
  let XLSX;
  try {
    XLSX = require('xlsx');
  } catch (err) {
    throw new Error('Missing dependency: please install `xlsx` package to read local xlsx files.');
  }

  if (!fs.existsSync(xlsxPath)) {
    throw new Error(`XLSX file not found: ${xlsxPath}`);
  }

  const workbook = XLSX.readFile(xlsxPath, { cellDates: false });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error('Excel is empty');
  }

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  if (!rows || rows.length === 0) {
    throw new Error('Excel is empty');
  }

  const headers = rows[0].map((h) => (h == null ? '' : String(h).trim()));
  const rawRows = rows
    .slice(1)
    .filter((row) => Array.isArray(row) && row.some((cell) => String(cell || '').trim() !== ''))
    .map((row) => {
      const obj = {};
      for (let i = 0; i < headers.length; i += 1) {
        const key = headers[i];
        obj[key] = i >= row.length || row[i] == null ? '' : String(row[i]).trim();
      }
      return obj;
    });

  return { rawRows, sheetTitle: sheetName };
}

function splitHighlights(text) {
  const s = String(text || '').trim();
  if (!s) return [];
  const normalized = s.replace(/；/g, ';').replace(/，/g, ',');
  const parts = normalized.includes(';') ? normalized.split(';') : normalized.split(',');
  return parts.map((p) => p.trim()).filter(Boolean);
}

function compactRow(rawRow) {
  const normalized = {};
  for (const [key, value] of Object.entries(rawRow || {})) {
    normalized[ALIAS[key] || key] = value == null ? '' : String(value).trim();
  }
  if (!normalized.key) {
    normalized.key = normalized.category || '';
  }
  if (!normalized.category) {
    normalized.category = normalized.key || '';
  }
  return normalized;
}

function parseRowsToSeries(rawRows) {
  const seriesMap = new Map();

  for (const row of rawRows || []) {
    const n = compactRow(row);
    const key = String(n.key || '').trim();
    if (!key) continue;

    if (!seriesMap.has(key)) {
      seriesMap.set(key, []);
    }

    const product = {
      name: n.name || '',
      model: n.model || '',
      category: n.category || key,
      highlights: splitHighlights(n.highlights || ''),
      scene: n.scene || '',
      usage: n.usage || '',
      detailParams: {
        power: n.power || null,
        capacity: n.capacity || null,
        throughput: n.throughput || null,
        avgCookTime: n.avgCookTime || null
      },
      status: n.status || '在售',
      badgeKey: n.badgeKey || null,
      badgeColor: n.badgeColor || null,
      imageKey: n.imageKey || null
    };

    const compact = Object.fromEntries(
      Object.entries(product).filter(([, value]) => value !== null)
    );
    compact.detailParams = Object.fromEntries(
      Object.entries(compact.detailParams || {}).filter(([, value]) => value !== null)
    );

    seriesMap.get(key).push(compact);
  }

  return Array.from(seriesMap.entries()).map(([key, products]) => ({ key, products }));
}

function writeJs(seriesList, outPath, sourceLabel) {
  let content = `// 产品数据表（由 ${sourceLabel} 自动生成）\n`;
  content += 'export const PRODUCT_DATA_TABLE = ';
  content += JSON.stringify(seriesList, null, 2);
  content += ';\n';
  fs.writeFileSync(outPath, content, 'utf-8');
}

function readExistingSeries(outPath) {
  if (!fs.existsSync(outPath)) {
    return [];
  }
  const content = fs.readFileSync(outPath, 'utf-8');
  const match = content.match(/export const PRODUCT_DATA_TABLE\s*=\s*(\[.*\])\s*;/s);
  if (!match) {
    return [];
  }
  try {
    return JSON.parse(match[1]);
  } catch (_) {
    return [];
  }
}

function productIdentityKey(product) {
  const category = String(product.category || '').trim();
  const model = String(product.model || '').trim();
  const name = String(product.name || '').trim();
  return `${category}::${model || name}`;
}

function mergeSeriesAppend(existingSeries, incomingSeries) {
  const merged = new Map();
  for (const series of existingSeries || []) {
    const key = String(series?.key || '').trim();
    if (!key) continue;
    merged.set(key, {
      key,
      products: Array.isArray(series.products) ? [...series.products] : []
    });
  }

  let appendedCount = 0;
  let updatedCount = 0;

  for (const incoming of incomingSeries || []) {
    const key = String(incoming?.key || '').trim();
    if (!key) continue;

    if (!merged.has(key)) {
      merged.set(key, { key, products: [] });
    }

    const target = merged.get(key);
    const indexMap = new Map();
    target.products.forEach((product, idx) => {
      indexMap.set(productIdentityKey(product), idx);
    });

    for (const product of incoming.products || []) {
      const pid = productIdentityKey(product);
      if (pid.endsWith('::')) continue;

      if (indexMap.has(pid)) {
        const idx = indexMap.get(pid);
        const before = target.products[idx];
        const after = { ...before, ...product };
        if (JSON.stringify(before) !== JSON.stringify(after)) {
          target.products[idx] = after;
          updatedCount += 1;
        }
      } else {
        target.products.push(product);
        indexMap.set(pid, target.products.length - 1);
        appendedCount += 1;
      }
    }
  }

  return {
    series: Array.from(merged.values()),
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
  return extractJsonArrayFromJs(block, 'APPENDED_PRODUCT_SERIES') || [];
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

function buildFeishuConfigFromEnv() {
  const fileConfig = loadSharedFeishuConfig();
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

async function syncFeishuToProductList(config) {
  const rows = await fetchRowsFromFeishuSheet(
    config.appId,
    config.appSecret,
    config.spreadsheetToken,
    config.sheetRange
  );
  const incomingSeries = parseRowsToSeries(rows);
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
  const rows = await fetchRowsFromFeishuSheet(
    config.appId,
    config.appSecret,
    config.spreadsheetToken,
    config.sheetRange
  );
  const incomingSeries = parseRowsToSeries(rows);
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

function parseCliArgs(argv = process.argv.slice(2)) {
  const shared = loadSharedFeishuConfig();
  const args = {
    source: 'xlsx',
    xlsxPath: 'scripts/products-table.xlsx',
    outPath: 'src/assets/product-data-table.js',
    feishuAppId: process.env.FEISHU_APP_ID || shared.app_id || '',
    feishuAppSecret: process.env.FEISHU_APP_SECRET || shared.app_secret || '',
    spreadsheetToken: process.env.FEISHU_SPREADSHEET_TOKEN || shared.spreadsheet_token || '',
    sheetRange: process.env.FEISHU_SHEET_RANGE || shared.sheet_range || ''
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    const value = argv[i + 1];
    if (token === '--source' && value) {
      args.source = value;
      i += 1;
    } else if (token === '--xlsx-path' && value) {
      args.xlsxPath = value;
      i += 1;
    } else if (token === '--out-path' && value) {
      args.outPath = value;
      i += 1;
    } else if (token === '--feishu-app-id' && value) {
      args.feishuAppId = value;
      i += 1;
    } else if (token === '--feishu-app-secret' && value) {
      args.feishuAppSecret = value;
      i += 1;
    } else if (token === '--spreadsheet-token' && value) {
      args.spreadsheetToken = value;
      i += 1;
    } else if (token === '--sheet-range' && value) {
      args.sheetRange = value;
      i += 1;
    }
  }

  return args;
}

async function generateProductDataTable(args = parseCliArgs()) {
  const outPath = path.resolve(process.cwd(), args.outPath);
  let rawRows;
  let sourceLabel;

  if (args.source === 'xlsx') {
    const xlsxPath = path.resolve(process.cwd(), args.xlsxPath);
    const xlsxData = fetchRowsFromXlsx(xlsxPath);
    rawRows = xlsxData.rawRows;
    sourceLabel = args.xlsxPath;
    console.log(`sheet=${xlsxData.sheetTitle}`);
  } else if (args.source === 'feishu') {
    if (!args.feishuAppId || !args.feishuAppSecret) {
      throw new Error('Missing feishu app credentials: --feishu-app-id/--feishu-app-secret');
    }
    if (!args.sheetRange) {
      throw new Error('Missing feishu sheet config: --sheet-range');
    }

    const parsed = parseBitableTarget(args.sheetRange);
    if (!parsed.tableId) {
      throw new Error('sheet_range must provide table_id, or use URL with ?table=xxx');
    }
    if (!args.spreadsheetToken && !parsed.appToken) {
      throw new Error(
        'Missing app token: provide --spreadsheet-token or use URL containing /base/{app_token}'
      );
    }

    rawRows = await fetchRowsFromFeishuSheet(
      args.feishuAppId,
      args.feishuAppSecret,
      args.spreadsheetToken,
      args.sheetRange
    );
    sourceLabel = 'Feishu Sheet';
  } else {
    throw new Error(`Invalid --source value: ${args.source}`);
  }

  const incomingSeries = parseRowsToSeries(rawRows);
  const existingSeries = readExistingSeries(outPath);
  const merged = mergeSeriesAppend(existingSeries, incomingSeries);
  writeJs(merged.series, outPath, sourceLabel);

  console.log(`rows=${rawRows.length}`);
  console.log(`series=${merged.series.map((s) => s.key).join(',')}`);
  console.log(`appended=${merged.appendedCount}`);
  console.log(`updated=${merged.updatedCount}`);
  console.log(`written=${outPath}`);
}

const feishuProTables = {
  loadSharedFeishuConfig,
  fetchRowsFromXlsx,
  fetchRowsFromFeishuSheet,
  parseRowsToSeries,
  readExistingSeries,
  mergeSeriesAppend,
  writeJs,
  generateProductDataTable,
  parseCliArgs,
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

if (require.main === module) {
  generateProductDataTable(parseCliArgs()).catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}