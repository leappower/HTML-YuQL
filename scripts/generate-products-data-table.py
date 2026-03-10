import argparse
import json
import re
import os
from pathlib import Path
from urllib import error, parse, request

import openpyxl

ALIAS = {
    '系列': 'key',
    '系列key': 'key',
    'key': 'key',
    '分类': 'category',
    'category': 'category',
    '产品名称': 'name',
    'name': 'name',
    '型号': 'model',
    'model': 'model',
    '卖点': 'highlights',
    'highlights': 'highlights',
    '应用场景': 'scene',
    'scene': 'scene',
    '用途': 'usage',
    'usage': 'usage',
    '功率': 'power',
    '产能': 'capacity',
    '吞吐': 'throughput',
    '平均出餐时间': 'avgCookTime',
    '状态': 'status',
    '徽标key': 'badgeKey',
    'badgeKey': 'badgeKey',
    '徽标颜色': 'badgeColor',
    'badgeColor': 'badgeColor',
    '图片key': 'imageKey',
    'imageKey': 'imageKey',
}


def load_shared_feishu_config(config_path):
    path = Path(config_path)
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text(encoding='utf-8'))
    except json.JSONDecodeError as exc:
        raise SystemExit(f'Invalid JSON in config file: {path} ({exc})') from exc


def split_highlights(text):
    s = str(text or '').strip()
    if not s:
        return []
    normalized = s.replace('；', ';').replace('，', ',')
    if ';' in normalized:
        parts = normalized.split(';')
    else:
        parts = normalized.split(',')
    return [p.strip() for p in parts if p.strip()]


def compact_row(raw_row):
    normalized = {}
    for key, value in raw_row.items():
        normalized[ALIAS.get(key, key)] = '' if value is None else str(value).strip()
    if not normalized.get('key'):
        normalized['key'] = normalized.get('category', '')
    if not normalized.get('category'):
        normalized['category'] = normalized.get('key', '')
    return normalized


def parse_rows_to_series(raw_rows):
    series_map = {}
    for row in raw_rows:
        n = compact_row(row)
        key = str(n.get('key', '')).strip()
        if not key:
            continue
        series_map.setdefault(key, [])

        product = {
            'name': n.get('name', ''),
            'model': n.get('model', ''),
            'category': n.get('category', key),
            'highlights': split_highlights(n.get('highlights', '')),
            'scene': n.get('scene', ''),
            'usage': n.get('usage', ''),
            'detailParams': {
                'power': n.get('power', '') or None,
                'capacity': n.get('capacity', '') or None,
                'throughput': n.get('throughput', '') or None,
                'avgCookTime': n.get('avgCookTime', '') or None,
            },
            'status': n.get('status', '在售') or '在售',
            'badgeKey': n.get('badgeKey', '') or None,
            'badgeColor': n.get('badgeColor', '') or None,
            'imageKey': n.get('imageKey', '') or None,
        }

        product = {k: v for k, v in product.items() if v is not None}
        product['detailParams'] = {
            k: v for k, v in product.get('detailParams', {}).items() if v is not None
        }
        series_map[key].append(product)

    return [{'key': k, 'products': v} for k, v in series_map.items()]

# 从xlsx文件中读取数据行，返回行列表和sheet标题
def fetch_rows_from_xlsx(xlsx_path):
    wb = openpyxl.load_workbook(xlsx_path, data_only=True)
    ws = wb.active
    rows = list(ws.iter_rows(values_only=True))
    if not rows:
        raise SystemExit('Excel is empty')

    headers = [str(h).strip() if h is not None else '' for h in rows[0]]

    def row_to_obj(row):
        return {
            headers[i]: ('' if i >= len(row) or row[i] is None else str(row[i]).strip())
            for i in range(len(headers))
        }

    raw_rows = [
        row_to_obj(row)
        for row in rows[1:]
        if not all(v is None or str(v).strip() == '' for v in row)
    ]
    return raw_rows, ws.title

# 从Feishu Sheet中读取数据行，返回行列表
def http_json(url, method='GET', headers=None, payload=None):
    body = None
    req_headers = headers or {}
    if payload is not None:
        body = json.dumps(payload, ensure_ascii=False).encode('utf-8')
        req_headers['Content-Type'] = 'application/json; charset=utf-8'
    req = request.Request(url=url, data=body, headers=req_headers, method=method)
    try:
        with request.urlopen(req, timeout=20) as resp:
            data = resp.read().decode('utf-8')
            return json.loads(data)
    except error.HTTPError as exc:
        detail = exc.read().decode('utf-8', errors='ignore')
        raise RuntimeError(f'HTTP {exc.code} for {url}: {detail}') from exc


def get_feishu_tenant_token(app_id, app_secret):
    token_resp = http_json(
        'https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal',
        method='POST',
        # 补充app_id和app_secret参数到请求体中，使用JSON格式
        payload={'app_id': app_id, 'app_secret': app_secret},
    )
    if token_resp.get('code') != 0:
        raise RuntimeError(f'Feishu auth failed: {token_resp}')
    return token_resp.get('tenant_access_token', '')


def parse_bitable_target(sheet_range):
    raw = str(sheet_range or '').strip()
    if not raw:
        return '', '', ''

    if raw.startswith('http://') or raw.startswith('https://'):
        app_token_match = re.search(r'/base/([A-Za-z0-9]+)', raw)
        app_token = app_token_match.group(1) if app_token_match else ''

        parsed_url = parse.urlparse(raw)
        query = parse.parse_qs(parsed_url.query)
        table_id = (
            (query.get('table') or query.get('table_id') or query.get('tableId') or [''])[0]
        ).strip()
        view_id = (
            (query.get('view') or query.get('view_id') or query.get('viewId') or [''])[0]
        ).strip()
        return app_token, table_id, view_id

    parts = [p.strip() for p in raw.split('|') if p.strip()]
    if len(parts) >= 2:
        return '', parts[0], parts[1]
    return '', raw, ''


def resolve_final_feishu_url(raw_url, max_hops=5):
    current = str(raw_url or '').strip()
    if not current.startswith('http://') and not current.startswith('https://'):
        return current

    for _ in range(max_hops):
        try:
            req = request.Request(current, method='HEAD')
            with request.urlopen(req, timeout=20) as resp:
                final_url = resp.geturl()
                if final_url == current:
                    return current
                current = final_url
        except Exception:
            try:
                req = request.Request(current, method='GET')
                with request.urlopen(req, timeout=20) as resp:
                    final_url = resp.geturl()
                    if final_url == current:
                        return current
                    current = final_url
            except Exception:
                return current

    return current


def normalize_bitable_value(value):
    if value is None:
        return ''
    if isinstance(value, (str, int, float, bool)):
        return str(value).strip()
    if isinstance(value, list):
        normalized = []
        for item in value:
            if isinstance(item, dict):
                text = item.get('text') or item.get('name') or item.get('link')
                normalized.append(str(text).strip() if text else json.dumps(item, ensure_ascii=False))
            else:
                normalized.append(str(item).strip())
        return ', '.join([v for v in normalized if v])
    if isinstance(value, dict):
        text = value.get('text') or value.get('name')
        if text:
            return str(text).strip()
        return json.dumps(value, ensure_ascii=False)
    return str(value).strip()


def fetch_rows_from_feishu_sheet(app_id, app_secret, spreadsheet_token, sheet_range):
    token = get_feishu_tenant_token(app_id, app_secret)
    resolved_sheet_range = resolve_final_feishu_url(sheet_range)
    app_token, table_id, view_id = parse_bitable_target(resolved_sheet_range)
    final_app_token = str(app_token or spreadsheet_token or '').strip()
    if not final_app_token:
        raise SystemExit(
            'Missing app token: set spreadsheet_token or use bitable URL containing /base/{app_token}'
        )
    if not table_id:
        raise SystemExit('sheet_range must provide table_id, or use bitable URL with ?table=xxx')

    page_token = ''
    raw_rows = []

    while True:
        query = {'page_size': '500'}
        if page_token:
            query['page_token'] = page_token
        if view_id:
            query['view_id'] = view_id

        query_str = parse.urlencode(query)
        values_url = (
            f'https://open.feishu.cn/open-apis/bitable/v1/apps/'
            f'{final_app_token}/tables/{table_id}/records?{query_str}'
        )
        values_resp = http_json(
            values_url,
            headers={'Authorization': f'Bearer {token}'},
        )
        if values_resp.get('code') != 0:
            raise RuntimeError(f'Feishu bitable read failed: {values_resp}')

        items = values_resp.get('data', {}).get('items', [])
        for item in items:
            fields = item.get('fields', {})
            row = {}
            for key, value in fields.items():
                row[str(key).strip()] = normalize_bitable_value(value)
            if row:
                raw_rows.append(row)

        has_more = values_resp.get('data', {}).get('has_more', False)
        if not has_more:
            break
        page_token = values_resp.get('data', {}).get('page_token', '')
        if not page_token:
            break

    if not raw_rows:
        raise SystemExit('Feishu bitable is empty')

    return raw_rows


def write_js(series_list, out_path, source_label):
    content = f'// 产品数据表（由 {source_label} 自动生成）\n'
    content += 'export const PRODUCT_DATA_TABLE = '
    content += json.dumps(series_list, ensure_ascii=False, indent=2)
    content += ';\n'
    out_path.write_text(content, encoding='utf-8')


def read_existing_series(out_path):
    if not out_path.exists():
        return []
    content = out_path.read_text(encoding='utf-8')
    match = re.search(
        r'export const PRODUCT_DATA_TABLE\s*=\s*(\[.*\])\s*;',
        content,
        flags=re.DOTALL,
    )
    if not match:
        return []
    try:
        return json.loads(match.group(1))
    except json.JSONDecodeError:
        return []


def product_identity_key(product):
    category = str(product.get('category', '')).strip()
    model = str(product.get('model', '')).strip()
    name = str(product.get('name', '')).strip()
    return f'{category}::{model or name}'


def merge_series_append(existing_series, incoming_series):
    merged = {
        str(s.get('key', '')).strip(): {
            'key': str(s.get('key', '')).strip(),
            'products': list(s.get('products') or []),
        }
        for s in existing_series
        if str(s.get('key', '')).strip()
    }

    appended_count = 0
    updated_count = 0

    for incoming in incoming_series:
        key = str(incoming.get('key', '')).strip()
        if not key:
            continue
        target = merged.setdefault(key, {'key': key, 'products': []})

        index_map = {
            product_identity_key(product): idx
            for idx, product in enumerate(target['products'])
        }

        for product in incoming.get('products', []):
            pid = product_identity_key(product)
            if pid.endswith('::'):
                continue
            if pid in index_map:
                idx = index_map[pid]
                before = target['products'][idx]
                after = {**before, **product}
                if before != after:
                    target['products'][idx] = after
                    updated_count += 1
            else:
                target['products'].append(product)
                index_map[pid] = len(target['products']) - 1
                appended_count += 1

    return list(merged.values()), appended_count, updated_count


def parse_args():
    shared = load_shared_feishu_config('scripts/feishu-config.json')

    parser = argparse.ArgumentParser(
        description='Generate src/assets/product-data-table.js from xlsx or Feishu Sheet.'
    )
    parser.add_argument(
        '--source',
        choices=['xlsx', 'feishu'],
        default='xlsx',
        help='Data source type, default is xlsx.',
    )
    parser.add_argument(
        '--xlsx-path',
        default='scripts/products-table.xlsx',
        help='Input xlsx path when --source xlsx.',
    )
    parser.add_argument(
        '--out-path',
        default='src/assets/product-data-table.js',
        help='Output JS file path.',
    )
    parser.add_argument(
        '--feishu-app-id',
        default=os.getenv('FEISHU_APP_ID', shared.get('app_id', '')),
        help='Feishu app id (or set FEISHU_APP_ID).',
    )
    parser.add_argument(
        '--feishu-app-secret',
        default=os.getenv('FEISHU_APP_SECRET', shared.get('app_secret', '')),
        help='Feishu app secret (or set FEISHU_APP_SECRET).',
    )
    parser.add_argument(
        '--spreadsheet-token',
        default=os.getenv('FEISHU_SPREADSHEET_TOKEN', shared.get('spreadsheet_token', '')),
        help='Feishu spreadsheet token (or set FEISHU_SPREADSHEET_TOKEN).',
    )
    parser.add_argument(
        '--sheet-range',
        default=os.getenv('FEISHU_SHEET_RANGE', shared.get('sheet_range', '')),
        help='Bitable table id or table_id|view_id (or set FEISHU_SHEET_RANGE).',
    )
    return parser.parse_args()


def main():
    args = parse_args()
    out_path = Path(args.out_path)

    if args.source == 'xlsx':
        xlsx_path = Path(args.xlsx_path)
        raw_rows, sheet_title = fetch_rows_from_xlsx(xlsx_path)
        source_label = str(xlsx_path)
        print(f'sheet={sheet_title}')
    else:
        if not args.feishu_app_id or not args.feishu_app_secret:
            raise SystemExit('Missing feishu app credentials: --feishu-app-id/--feishu-app-secret')
        if not args.sheet_range:
            raise SystemExit('Missing feishu sheet config: --sheet-range')

        app_token_from_range, table_id_from_range, _ = parse_bitable_target(args.sheet_range)
        if not table_id_from_range:
            raise SystemExit('sheet_range must provide table_id, or use URL with ?table=xxx')
        if not args.spreadsheet_token and not app_token_from_range:
            raise SystemExit(
                'Missing app token: provide --spreadsheet-token or use URL containing /base/{app_token}'
            )

        raw_rows = fetch_rows_from_feishu_sheet(
            args.feishu_app_id,
            args.feishu_app_secret,
            args.spreadsheet_token,
            args.sheet_range,
        )
        source_label = 'Feishu Sheet'

    incoming_series = parse_rows_to_series(raw_rows)
    existing_series = read_existing_series(out_path)
    series_list, appended_count, updated_count = merge_series_append(
        existing_series,
        incoming_series,
    )
    write_js(series_list, out_path, source_label)

    print(f'rows={len(raw_rows)}')
    print('series=' + ','.join([s['key'] for s in series_list]))
    print(f'appended={appended_count}')
    print(f'updated={updated_count}')
    print(f'written={out_path}')


if __name__ == '__main__':
    main()
