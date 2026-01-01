// api/analyze.js
export default async function handler(req, res) {
  const { id } = req.query;

  if (!id) return res.status(400).json({ error: 'Missing ID' });

  // 🟢 核心修复：这里的 Headers 也要和 api/index.js 一样，带上 Cookie！
  const headers = {
    'Referer': 'https://www.pixiv.net/',
    // 你的 Firefox UA
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:146.0) Gecko/20100101 Firefox/146.0',
    // 你的完整 Cookie (请确保这里和你 api/index.js 里填的一模一样！)
    'Cookie': 'first_visit_datetime_pc=2026-01-01%2022%3A11%3A45; PHPSESSID=89665003_TcEEugHTdp444gcCrryrFldbhWsc96n8; cc1=2026-01-01%2022%3A11%3A45; p_ab_id=1; p_ab_id_2=1; p_ab_d_id=459864257; yuid_b=JEEllUQ; _cfuvid=eoC66XMwZS_2.IY81JdeVCeQCVrWz5_NG0pL2h5RUKc-1767275012063-0.0.1.1-604800000; cf_clearance=vV9UsL.U3TTpJRHJ7hAgjEi8uA_2SJXvgmHjf3j89sI-1767283870-1.2.1.1-JbsPePAFcDpbdMxzetCzFjdcJQowT7KUxDmXoECB3RvrxaAJ1uEAakfewGECAGOK9tYrhNe569NEKut.Pg8QvPtlKBs5.YwDZ2WMg4gVnybX2zpEzQNkS_J.2pm6EVXxLvCo3ZHEy08W.k3u0.dVKgHj8Edp3fg0xCDXaIbqKWWotAVd56B1yoAsSjyjSvWV1qMSLA2juOiRgKX.bDc7lZFsPjJxedQOtbJyXFxNCeg; device_token=2d3f3219e676714428d5f36de08a5a38; privacy_policy_agreement=7; c_type=25; privacy_policy_notification=0; a_type=0; b_type=1; mybestpixiv_active_user=1'
  };

  try {
    // 1. 获取基本信息 (判断类型)
    const infoUrl = `https://www.pixiv.net/ajax/illust/${id}?lang=zh`;
    const infoRes = await fetch(infoUrl, { headers });
    
    if (!infoRes.ok) return res.status(infoRes.status).json({ error: 'Pixiv API Error' });
    const infoData = await infoRes.json();
    
    if (infoData.error) return res.status(404).json({ error: 'Artwork restricted or not found' });

    const illustType = infoData.body.illustType; 

    // 2. 动图 (Ugoira) 逻辑
    if (illustType === 2) {
      const metaUrl = `https://www.pixiv.net/ajax/illust/${id}/ugoira_meta?lang=zh`;
      const metaRes = await fetch(metaUrl, { headers });
      const metaData = await metaRes.json();

      // 如果因为没有 Cookie 拿不到数据，metaData.body 可能是空的，这里做个保护
      if(!metaData.body) {
          return res.status(403).json({ error: 'R-18 Ugoira metadata blocked by Pixiv (Cookie invalid)' });
      }

      res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400');
      return res.status(200).json({
        isUgoira: true,
        title: infoData.body.title,
        original: metaData.body.originalSrc, // 这里必须拿到值！
        frames: metaData.body.frames, 
        cover: infoData.body.urls.original 
      });
    }

    // 3. 普通图片逻辑
    const pagesUrl = `https://www.pixiv.net/ajax/illust/${id}/pages?lang=zh`;
    const pagesRes = await fetch(pagesUrl, { headers });
    const pagesData = await pagesRes.json();
    const images = pagesData.body.map(item => item.urls.original);

    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400');
    return res.status(200).json({
      isUgoira: false,
      title: infoData.body.title,
      images: images,
      isR18: infoData.body.xRestrict > 0 
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}
