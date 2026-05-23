const http = require('http');
const fs = require('fs');
const path = require('path');

const DIR = __dirname;
const DATA_FILE = path.join(DIR, 'profile-data.json');
const HTML_FILE = path.join(DIR, 'index.html');
const PORT = 3456;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
};

function formatJSObject(obj, indent = 0) {
  const pad = ' '.repeat(indent);
  const inner = ' '.repeat(indent + 2);

  if (obj === null) return 'null';
  if (typeof obj === 'boolean') return obj.toString();
  if (typeof obj === 'number') return obj.toString();
  if (typeof obj === 'string') return `'${obj.replace(/'/g, "\\'").replace(/\n/g, '\\n')}'`;

  if (Array.isArray(obj)) {
    if (obj.length === 0) return '[]';
    const items = obj.map(v => inner + formatJSObject(v, indent + 2));
    return '[\n' + items.join(',\n') + '\n' + pad + ']';
  }

  const keys = Object.keys(obj);
  if (keys.length === 0) return '{}';
  const pairs = keys.map(k => inner + k + ': ' + formatJSObject(obj[k], indent + 2));
  return '{\n' + pairs.join(',\n') + '\n' + pad + '}';
}

const server = http.createServer((req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  // POST /save — save profile data
  if (req.method === 'POST' && req.url === '/save') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const data = JSON.parse(body);

        // 1. 写入 profile-data.json
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));

        // 2. 更新 index.html 中 BEGIN/END_DEFAULTS 之间的 defaults 对象
        let html = fs.readFileSync(HTML_FILE, 'utf8');

        const startTag = '// BEGIN_DEFAULTS';
        const endTag = '// END_DEFAULTS';
        const startIdx = html.indexOf(startTag);
        const endIdx = html.indexOf(endTag);

        if (startIdx !== -1 && endIdx !== -1) {
          const before = html.substring(0, startIdx + startTag.length);
          const after = html.substring(endIdx);

          // 将数据格式化为 JS 对象字面量
          const jsObj = formatJSObject(data, 2);
          html = before + '\n  const defaults = ' + jsObj + ';\n  ' + after;
          fs.writeFileSync(HTML_FILE, html);
          console.log('✅ 数据已保存 + index.html 已更新 —', new Date().toLocaleTimeString());
        } else {
          console.log('⚠️  未找到标记，仅更新 data.json');
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: e.message }));
      }
    });
    return;
  }

  // Serve static files
  let filePath = req.url === '/' ? '/index.html' : req.url;
  filePath = path.join(DIR, path.normalize(filePath));

  // Security: don't escape the directory
  if (!filePath.startsWith(DIR)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  const ext = path.extname(filePath);
  const contentType = MIME[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      return res.end('Not Found');
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`🚀 服务已启动: http://localhost:${PORT}`);
  console.log(`   管理员修改数据会自动保存到 GitHub`);
});
