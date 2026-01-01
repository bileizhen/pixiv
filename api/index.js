// api/index.js

// 🟢 关键配置：开启 Edge Runtime 以支持大文件下载 (>4.5MB)
export const config = {
  runtime: 'edge', 
};

export default async function handler(request) {
  const url = new URL(request.url);
  const path = url.pathname;

  // 存活检查
  if (path === '/' || path === '/favicon.ico') {
    return new Response('Pixiv Proxy (Edge) is running.', { status: 200 });
  }

  // 拼接 Pixiv 真实地址
  const targetUrl = `https://i.pximg.net${path}${url.search}`;

  // 🟢 统一的请求头构造函数
  const headers = {
    'Referer': 'https://www.pixiv.net/',
    // 使用验证通过的 Firefox UA
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:146.0) Gecko/20100101 Firefox/146.0',
  };

  // 从环境变量读取 Cookie
  // 优先读取 PIXIV_COOKIE (完整字符串)，如果没有则尝试读取 PHPSESSID 拼接
  if (process.env.PIXIV_COOKIE) {
    headers['Cookie'] = process.env.PIXIV_COOKIE;
  } else if (process.env.PIXIV_PHPSESSID) {
    headers['Cookie'] = `PHPSESSID=${process.env.PIXIV_PHPSESSID}`;
  }

  try {
    const response = await fetch(targetUrl, { 
      headers,
      redirect: 'manual' // 禁止自动跳转，以便捕获 302 错误
    });

    if (!response.ok) {
      if (response.status === 302 || response.status === 301) {
        return new Response('Pixiv Redirected (Cookie Invalid). Please check env vars.', { status: 403 });
      }
      return new Response(`Pixiv Error: ${response.status} ${response.statusText}`, { status: response.status });
    }

    // 重构响应头
    const newHeaders = new Headers(response.headers);
    newHeaders.set('Access-Control-Allow-Origin', '*');
    // 设置强缓存 7 天
    newHeaders.set('Cache-Control', 'public, max-age=604800, s-maxage=604800');
    // 删除可能导致问题的头
    newHeaders.delete('content-encoding'); 
    newHeaders.delete('content-security-policy');
    newHeaders.delete('set-cookie');

    // 🟢 流式转发 (Streaming)
    return new Response(response.body, {
      status: response.status,
      headers: newHeaders
    });

  } catch (err) {
    return new Response(`Proxy Error: ${err.message}`, { status: 500 });
  }
}
