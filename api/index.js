// api/index.js
// 这一行非常重要，告诉 Vercel 使用 Edge 运行时
export const config = {
  runtime: 'edge',
};

export default async function handler(request) {
  const url = new URL(request.url);
  
  // 获取路径 (去掉开头的 /)
  // 例如请求 https://你的域名/img-zip-ugoira/...
  // pathname 就是 /img-zip-ugoira/...
  const path = url.pathname;

  // 简单的防误触
  if (path === '/' || path === '/favicon.ico') {
    return new Response('Pixiv Proxy (Edge) is running.', { status: 200 });
  }

  // 拼接目标 Pixiv 地址
  // 注意：Edge Runtime 里 url.search (查询参数) 也要带上
  const targetUrl = `https://i.pximg.net${path}${url.search}`;

  try {
    // 发起请求
    const response = await fetch(targetUrl, {
      headers: {
        'Referer': 'https://www.pixiv.net/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'
      }
    });

    // 检查 Pixiv 是否返回错误
    if (!response.ok) {
      return new Response(`Pixiv Error: ${response.statusText}`, { status: response.status });
    }

    // 构造新响应头
    const newHeaders = new Headers(response.headers);
    newHeaders.set('Access-Control-Allow-Origin', '*');
    // 设置强缓存，减少回源
    newHeaders.set('Cache-Control', 'public, max-age=604800, s-maxage=604800');

    // 关键点：直接透传 response.body (Stream)，不使用 await response.arrayBuffer()
    // 这样可以突破 4.5MB 限制，且内存占用极低
    return new Response(response.body, {
      status: response.status,
      headers: newHeaders
    });

  } catch (err) {
    return new Response(`Proxy Error: ${err.message}`, { status: 500 });
  }
}
