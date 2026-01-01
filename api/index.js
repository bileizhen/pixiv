// api/index.js

// 🟢 1. 必须开启 Edge Runtime (支持大文件流式传输)
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

  // 拼接 Pixiv 图片服务器地址
  const targetUrl = `https://i.pximg.net${path}${url.search}`;

  // 🟢 2. 注入你提供的“满血版”身份信息
  const headers = {
    'Referer': 'https://www.pixiv.net/',
    // 你提供的 Firefox 146 UA
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:146.0) Gecko/20100101 Firefox/146.0',
    // 你提供的完整 Cookie (包含隐私协议、CF验证、SessionID)
    'Cookie': 'first_visit_datetime_pc=2026-01-01%2022%3A11%3A45; PHPSESSID=89665003_TcEEugHTdp444gcCrryrFldbhWsc96n8; cc1=2026-01-01%2022%3A11%3A45; p_ab_id=1; p_ab_id_2=1; p_ab_d_id=459864257; yuid_b=JEEllUQ; _cfuvid=eoC66XMwZS_2.IY81JdeVCeQCVrWz5_NG0pL2h5RUKc-1767275012063-0.0.1.1-604800000; cf_clearance=vV9UsL.U3TTpJRHJ7hAgjEi8uA_2SJXvgmHjf3j89sI-1767283870-1.2.1.1-JbsPePAFcDpbdMxzetCzFjdcJQowT7KUxDmXoECB3RvrxaAJ1uEAakfewGECAGOK9tYrhNe569NEKut.Pg8QvPtlKBs5.YwDZ2WMg4gVnybX2zpEzQNkS_J.2pm6EVXxLvCo3ZHEy08W.k3u0.dVKgHj8Edp3fg0xCDXaIbqKWWotAVd56B1yoAsSjyjSvWV1qMSLA2juOiRgKX.bDc7lZFsPjJxedQOtbJyXFxNCeg; device_token=2d3f3219e676714428d5f36de08a5a38; privacy_policy_agreement=7; c_type=25; privacy_policy_notification=0; a_type=0; b_type=1; mybestpixiv_active_user=1'
  };

  try {
    // 发起请求
    const response = await fetch(targetUrl, { 
      headers,
      redirect: 'manual' // 禁止自动跳转，方便排查 302
    });

    // 错误检查
    if (!response.ok) {
        // 如果返回 302，说明 Cookie 还是被拒绝了（通常不会发生，除非 Cookie 刚好过期）
        if (response.status === 302 || response.status === 301) {
            return new Response('Pixiv Redirected (Cookie Invalid).', { status: 403 });
        }
        return new Response(`Pixiv Error: ${response.status} ${response.statusText}`, { status: response.status });
    }

    // 重构响应头
    const newHeaders = new Headers(response.headers);
    newHeaders.set('Access-Control-Allow-Origin', '*');
    newHeaders.set('Cache-Control', 'public, max-age=604800, s-maxage=604800');
    // 删除可能导致问题的头
    newHeaders.delete('content-encoding'); 
    newHeaders.delete('content-security-policy');
    newHeaders.delete('set-cookie'); // 不要把 Pixiv 的 Cookie 返回给前端

    // 🟢 3. 流式转发 (Streaming)
    return new Response(response.body, {
      status: response.status,
      headers: newHeaders
    });

  } catch (err) {
    return new Response(`Proxy Error: ${err.message}`, { status: 500 });
  }
}
