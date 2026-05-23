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

        // 2. 更新 index.html 中的 defaults 对象
        let html = fs.readFileSync(HTML_FILE, 'utf8');
        const defaultsStr = JSON.stringify(data, null, 2)
          .replace(/\\n/g, '\\n')  // keep literal \n for template strings? No, it's a JS object
          .replace(/"/g, '\'')     // single quotes for JS object keys
          .replace(/'([^']+)':/g, '$1:');  // remove quotes from keys

        // Better: just use JSON.stringify with proper formatting
        const newDefaults = JSON.stringify(data, null, 4)
          .replace(/"([^"]+)":/g, '$1:')          // unquote keys
          .replace(/: "([^"]*)"/g, ': \'$1\'')     // single-quote string values
          .replace(/\\n/g, '\\\\n');               // escape newlines

        const defaultsRegex = /  const defaults = \{[\s\S]*?\n  \};/;
        const replacement = '  const defaults = ' + newDefaults.replace(/\n/g, '\n  ') + ';';

        if (defaultsRegex.test(html)) {
          html = html.replace(defaultsRegex, replacement);
          fs.writeFileSync(HTML_FILE, html);
          console.log('✅ 数据已保存 + index.html 已更新 —', new Date().toLocaleTimeString());
        } else {
          console.log('⚠️  未找到 defaults 对象，仅更新 data.json');
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
