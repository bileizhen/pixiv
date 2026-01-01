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
  headers['Cookie'] = 'first_visit_datetime_pc=2026-01-01%2022%3A11%3A45; PHPSESSID=89665003_TcEEugHTdp444gcCrryrFldbhWsc96n8; cc1=2026-01-01%2022%3A11%3A45; p_ab_id=1; p_ab_id_2=1; p_ab_d_id=459864257; yuid_b=JEEllUQ; _cfuvid=eoC66XMwZS_2.IY81JdeVCeQCVrWz5_NG0pL2h5RUKc-1767275012063-0.0.1.1-604800000; cf_clearance=LisOp5JJTTv08YlpiyhEDN_8aSlPu83qoZpBzP_vDJk-1767282638-1.2.1.1-Hg4jLWfVTYER5DIxAH_YDxbwAZDBsrtNd4XOHsxOAUJNeVIfemzTNtrVv50.qcW7eSdpL1EYwZUIfpJ39xIwzYcTzE6YiqBmnfBbF8kVQdP3aX2wxoVch7JtPHGqVR89m3qEdfUJU6CtEyBQ7GNFZVZnvTl85h5alY.gzKu9ku0CcX7GwDbMPqEt5c0bjb5x_Ek1siz4tt8IiC3Ow2Bc.VpdfFvrVswUNji1qchvBDY; device_token=2d3f3219e676714428d5f36de08a5a38; privacy_policy_agreement=7; c_type=25; privacy_policy_notification=0; a_type=0; b_type=1; mybestpixiv_active_user=1; __cf_bm=LPvl.CcuXM4gi8bQQAMxah5tWKa2ee1Vo7vi44NUROo-1767282565-1.0.1.1-GWeobtSPuNdyQKUVbHA4rYDtGQ7umWWMhZaVpIRuVpTRCLFhn2A3AtZsupuDVUNkydpJgtpWNof09TX1jZWcZXKv1cu2p85cA464UbaNFbrtQdGSNsS.7jYe7PymOvfl';

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

