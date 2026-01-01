// api/index.js
export default async function handler(req, res) {
  // 获取请求的路径 (例如 /img-original/img/...)
  // req.url 包含了查询参数，我们主要需要路径部分
  const urlPath = req.url.startsWith('/') ? req.url.substring(1) : req.url;

  // 简单的防误触检查
  if (!urlPath || urlPath === '/' || urlPath.includes('favicon.ico')) {
    return res.status(200).send('Pixiv Proxy is running by Vercel.');
  }

  // 拼接目标 Pixiv 图片服务器地址
  const targetUrl = `https://i.pximg.net/${urlPath}`;

  try {
    // 发起请求
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        // 核心：伪造 Referer，骗过 Pixiv 的防盗链
        'Referer': 'https://www.pixiv.net/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'
      }
    });

    if (!response.ok) {
      return res.status(response.status).send(`Pixiv Server Error: ${response.statusText}`);
    }

    // 设置响应头
    // 转发 Content-Type (如 image/jpeg)
    const contentType = response.headers.get('content-type');
    if (contentType) res.setHeader('Content-Type', contentType);

    // 设置缓存，减少回源请求 (缓存 7 天)
    res.setHeader('Cache-Control', 'public, max-age=604800, s-maxage=604800, stale-while-revalidate=86400');
    
    // 允许跨域使用 (可选，方便在自己的博客或其他网页引用)
    res.setHeader('Access-Control-Allow-Origin', '*');

    // 获取图片二进制数据并返回
    const arrayBuffer = await response.arrayBuffer();
    res.status(200).send(Buffer.from(arrayBuffer));

  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
}