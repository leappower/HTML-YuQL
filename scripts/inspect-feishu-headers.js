const { buildFeishuConfigFromEnv, fetchRowsFromFeishuSheet } = require('./generate-products-data-table');

(async () => {
  try {
    const cfg = buildFeishuConfigFromEnv();
    if (!cfg.appId || !cfg.appSecret || !cfg.sheetRange) {
      console.error('Missing Feishu config. Check scripts/feishu-config.json or env vars.');
      process.exit(2);
    }

    console.log('Using sheetRange:', cfg.sheetRange);
    const rows = await fetchRowsFromFeishuSheet(cfg.appId, cfg.appSecret, cfg.spreadsheetToken, cfg.sheetRange);
    console.log('Total rows fetched:', rows.length);
    if (rows.length === 0) return;

    // print header keys from first row
    const keys = Object.keys(rows[0] || {});
    console.log('First row keys (headers):');
    keys.forEach((k, i) => console.log(`${i + 1}. ${k}`));

    console.log('\nSample first 3 rows (trimmed):');
    rows.slice(0, 3).forEach((r, idx) => {
      console.log(`--- row ${idx + 1} ---`);
      for (const k of keys.slice(0, 30)) {
        const v = r[k];
        if (v && v.length > 120) {
          console.log(`${k}: ${v.slice(0, 120)}...`);
        } else {
          console.log(`${k}: ${v}`);
        }
      }
    });
  } catch (err) {
    console.error('Error:', err.message || err);
    process.exit(1);
  }
})();
