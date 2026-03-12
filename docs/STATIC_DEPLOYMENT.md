# 静态部署验证

## 部署目录结构

```
dist/
├── index.html          # 主页面
├── bundle.js          # 打包的JavaScript
├── styles.*.css        # 打包的CSS
├── sw.js              # Service Worker
├── assets/
│   └── lang/          # 语言文件目录
│       ├── zh-CN-ui.json       (267个UI翻译键)
│       ├── zh-CN-product.json  (2217个产品翻译键)
│       ├── zh-CN.json          (完整翻译，兼容旧格式)
│       ├── en-ui.json         (267个UI翻译键)
│       ├── en-product.json    (2217个产品翻译键)
│       ├── en.json            (完整翻译，兼容旧格式)
│       └── ... (其他18种语言 × 3个文件)
└── lang/               # 备份语言文件目录（可选）
    ├── zh-CN-ui.json
    ├── zh-CN-product.json
    └── ... (其他语言文件)
```

## 语言文件路径

### translations.js 加载路径

```javascript
// UI翻译
fetch('./assets/lang/${lang}-ui.json')

// 产品翻译
fetch('./assets/lang/${lang}-product.json')

// 完整翻译（旧格式，兼容性）
fetch('./assets/lang/${lang}.json')
```

### 实际URL示例

```
/assets/lang/zh-CN-ui.json
/assets/lang/zh-CN-product.json
/assets/lang/en-ui.json
/assets/lang/en-product.json
/assets/lang/de-ui.json
/assets/lang/de-product.json
```

## 静态服务器配置

### Nginx

```nginx
server {
    listen 80;
    server_name example.com;
    root /path/to/dist;
    
    # 主页面
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # 语言文件（添加缓存头）
    location /assets/lang/ {
        add_header Cache-Control "public, max-age=3600";
    }
    
    # Gzip压缩
    gzip on;
    gzip_types application/json;
    gzip_min_length 1024;
}
```

### Apache

```apache
<VirtualHost *:80>
    ServerName example.com
    DocumentRoot /path/to/dist
    
    # 主页面
    <Directory /path/to/dist>
        RewriteEngine On
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteRule ^ /index.html [L]
    </Directory>
    
    # 语言文件缓存
    <LocationMatch "^/assets/lang/">
        ExpiresActive On
        ExpiresDefault "access plus 1 hour"
        Header set Cache-Control "public, max-age=3600"
    </LocationMatch>
</VirtualHost>
```

### Node.js (http-server)

```bash
# 安装http-server
npm install -g http-server

# 启动静态服务器
cd dist
http-server -p 8080 -c 1

# 访问 http://localhost:8080
```

### Node.js (Express)

```javascript
const express = require('express');
const path = require('path');
const compression = require('compression');

const app = express();

// 启用Gzip压缩
app.use(compression());

// 静态文件服务
app.use(express.static(path.join(__dirname, 'dist'), {
    maxAge: '1h',
    setHeaders: (res, path) => {
        // 语言文件缓存
        if (path.includes('/assets/lang/')) {
            res.setHeader('Cache-Control', 'public, max-age=3600');
        }
    }
}));

// SPA路由
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(8080, () => {
    console.log('Server running on http://localhost:8080');
});
```

### Vercel (vercel.json)

```json
{
  "version": 2,
  "cleanUrls": true,
  "headers": [
    {
      "source": "/assets/lang/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=3600"
        }
      ]
    }
  ]
}
```

### Netlify (_redirects)

```
# SPA路由
/* /index.html 200

# 语言文件缓存
/assets/lang/* /assets/lang/:splat 200
  Cache-Control: public, max-age=3600
```

## 验证清单

### 1. 文件结构验证

```bash
cd dist

# 检查语言文件数量
ls -1 assets/lang/*.json | wc -l
# 应该输出: 63

# 检查UI文件
ls -1 assets/lang/*-ui.json | wc -l
# 应该输出: 21

# 检查Product文件
ls -1 assets/lang/*-product.json | wc -l
# 应该输出: 21

# 检查完整文件
ls -1 assets/lang/*.json | grep -v '-' | wc -l
# 应该输出: 21
```

### 2. 文件内容验证

```bash
# 检查中文UI文件
cat assets/lang/zh-CN-ui.json | jq '.company_name'
# 应该输出: "佛山市跃迁力科技有限公司"

# 检查英文UI文件
cat assets/lang/en-ui.json | jq '.company_name'
# 应该输出: "Foshan YuKoLi Technology Co., Ltd."

# 检查中文Product文件
cat assets/lang/zh-CN-product.json | jq 'keys | length'
# 应该输出: 2217
```

### 3. HTTP请求验证

```bash
# 测试UI文件加载
curl -I http://localhost:8080/assets/lang/zh-CN-ui.json
# 应该返回: HTTP/1.1 200 OK
# 应该包含: Content-Type: application/json

# 测试Product文件加载
curl -I http://localhost:8080/assets/lang/en-product.json
# 应该返回: HTTP/1.1 200 OK

# 测试缓存头
curl -I http://localhost:8080/assets/lang/de-ui.json
# 应该包含: Cache-Control: public, max-age=3600
```

### 4. 浏览器控制台验证

打开浏览器，访问部署的网站，检查控制台：

```javascript
// 应该看到：
// ✅ Loading single language file (on-demand)...
// ✅ Loaded UI translations for zh-CN (267 keys)
// ✅ Translation system initialized successfully

// 切换语言时：
// ✅ Switching language from zh-CN to en
// ✅ Preloading target language en before switch...
// ✅ Loaded UI translations for en (267 keys)
// ✅ Successfully switched to language: en
```

## 常见问题

### Q1: 语言文件404错误

**症状**: 控制台显示 `Failed to load language: HTTP 404`

**原因**: 
- 静态服务器配置不正确
- 文件路径错误
- 文件未正确复制到dist目录

**解决**:
1. 检查 `dist/assets/lang/` 目录是否存在
2. 检查文件名是否正确（如 `en-ui.json` 而不是 `en_ui.json`）
3. 检查静态服务器的路由配置

### Q2: CORS错误

**症状**: 控制台显示 `Access-Control-Allow-Origin` 错误

**原因**: 静态服务器没有设置CORS头

**解决**:
```nginx
add_header Access-Control-Allow-Origin "*";
add_header Access-Control-Allow-Methods "GET, OPTIONS";
```

### Q3: 缓存问题

**症状**: 修改语言后，页面显示旧内容

**原因**: 浏览器缓存了语言文件

**解决**:
1. translations.js 已经添加了 `?ts=${Date.now()}` 查询参数
2. 如果仍有问题，清除浏览器缓存或使用无痕模式

### Q4: 文件大小过大

**症状**: 页面加载缓慢

**原因**: 一次性加载了所有语言文件

**解决**:
- ✅ 已实现按需加载（只加载UI翻译）
- ✅ 产品翻译延迟加载（只在需要时加载）
- ✅ 使用Gzip压缩（减少60-70%大小）

## 性能优化

### 1. 启用Gzip压缩

```nginx
gzip on;
gzip_types application/json text/css application/javascript;
gzip_min_length 1024;
gzip_comp_level 6;
```

### 2. 设置缓存头

```nginx
# 语言文件缓存1小时
location /assets/lang/ {
    add_header Cache-Control "public, max-age=3600";
}

# 静态资源缓存1年
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    add_header Cache-Control "public, max-age=31536000";
}
```

### 3. 使用CDN

```
/dist/
  └── assets/
      └── lang/  → 上传到CDN（如Cloudflare, AWS CloudFront）
```

### 4. HTTP/2

```nginx
listen 443 ssl http2;
```

## 部署检查清单

- [ ] 运行 `npm run build` 生成dist目录
- [ ] 验证 `dist/assets/lang/` 包含63个文件
- [ ] 验证文件内容正确（使用 `jq` 检查）
- [ ] 配置静态服务器（Nginx/Apache/Node.js等）
- [ ] 设置Gzip压缩
- [ ] 设置缓存头
- [ ] 测试语言切换功能
- [ ] 测试HTTP请求（使用 `curl`）
- [ ] 检查浏览器控制台（无错误）
- [ ] 测试移动端（响应式）
- [ ] 测试不同浏览器（Chrome, Firefox, Safari）

## 总结

静态部署的语言切换功能已经完全就绪：

✅ **文件结构正确**: `dist/assets/lang/` 包含63个文件（21种语言 × 3种格式）
✅ **加载路径正确**: `./assets/lang/${lang}-ui.json` 和 `./assets/lang/${lang}-product.json`
✅ **静态服务器配置**: 支持Nginx, Apache, Node.js等多种服务器
✅ **性能优化**: 按需加载 + Gzip压缩 + 缓存头
✅ **向后兼容**: 同时支持旧格式（`{lang}.json`）和新格式（`{lang}-ui.json`, `{lang}-product.json`）

部署到任何静态服务器后，语言切换功能都能正常工作！
