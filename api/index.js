// api/index.js

// 🟢 1. 必须开启 Edge Runtime (突破 4.5MB 限制)
export const config = {
  runtime: 'edge', 
};

export default async function handler(request) {
  const url = new URL(request.url);
  const path = url.pathname;

  // 简单的存活检查
  if (path === '/' || path === '/favicon.ico') {
    return new Response('Pixiv Proxy (Edge) is running.', { status: 200 });
  }

  // 拼接 Pixiv 真实地址
  const targetUrl = `https://i.pximg.net${path}${url.search}`;

  // 🟢 2. 伪造请求头 (完全模仿你的浏览器)
  const headers = {
    'Host': 'i.pximg.net',
    'Referer': 'https://www.pixiv.net/',
    // 使用你提供的 Firefox UA
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:146.0) Gecko/20100101 Firefox/146.0',
    // 其他标准头
    'Accept': '*/*',
    'Accept-Language': 'zh-CN,zh;q=0.8,zh-TW;q=0.7,zh-HK;q=0.5,en-US;q=0.3,en;q=0.2',
    'Connection': 'keep-alive',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'cross-site'
  };

  // 🟢 3. 强烈建议带上 Cookie (虽然你提供的头里没带，但 Vercel IP 很容易被挡)
  // 如果你之前在环境变量里设置了 PIXIV_PHPSESSID，这里会自动带上
  if (process.env.PIXIV_PHPSESSID) {
    headers['Cookie'] = `PHPSESSID=${process.env.PIXIV_PHPSESSID}`;
  } 
  // 或者直接硬编码测试 (如果环境变量不生效，取消下面这行的注释并填入)
  // headers['Cookie'] = 'PHPSESSID=你的ID...';

  try {
    const response = await fetch(targetUrl, { 
      headers,
      // 禁止自动跟随重定向，如果 Pixiv 返回 302 跳转登录页，我们直接报错，方便排查
      redirect: 'manual' 
    });

    // 检查 Pixiv 是否拒绝服务
    if (!response.ok) {
        // 如果是 302/301，说明被踢到登录页了 -> Cookie 无效
        if (response.status === 302 || response.status === 301) {
            return new Response('Pixiv Redirected (Need Login). Please set Cookie.', { status: 403 });
        }
        return new Response(`Pixiv Error: ${response.status} ${response.statusText}`, { status: response.status });
    }

    // 重构响应头
    const newHeaders = new Headers(response.headers);
    newHeaders.set('Access-Control-Allow-Origin', '*');
    newHeaders.set('Cache-Control', 'public, max-age=604800, s-maxage=604800');
    // 删除可能导致乱码或下载中断的头
    newHeaders.delete('content-encoding'); 
    newHeaders.delete('content-security-policy');

    // 🟢 4. 管道转发 (Stream)
    return new Response(response.body, {
      status: response.status,
      headers: newHeaders
    });

  } catch (err) {
    return new Response(`Proxy Error: ${err.message}`, { status: 500 });
  }
}
