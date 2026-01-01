// api/analyze.js
export default async function handler(req, res) {
  const { id } = req.query;

  if (!id) return res.status(400).json({ error: 'Missing ID' });

  // 🟢 统一的请求头 (必须与 index.js 保持一致)
  const headers = {
    'Referer': 'https://www.pixiv.net/',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:146.0) Gecko/20100101 Firefox/146.0',
  };

  // 从环境变量读取 Cookie
  if (process.env.PIXIV_COOKIE) {
    headers['Cookie'] = process.env.PIXIV_COOKIE;
  } else if (process.env.PIXIV_PHPSESSID) {
    headers['Cookie'] = `PHPSESSID=${process.env.PIXIV_PHPSESSID}`;
  }

  try {
    // 1. 获取基本信息
    const infoUrl = `https://www.pixiv.net/ajax/illust/${id}?lang=zh`;
    const infoRes = await fetch(infoUrl, { headers });
    
    if (!infoRes.ok) return res.status(infoRes.status).json({ error: 'Pixiv API Error' });
    const infoData = await infoRes.json();
    
    if (infoData.error) return res.status(404).json({ error: 'Artwork restricted or not found' });

    const illustType = infoData.body.illustType; // 0=插画, 1=漫画, 2=动图

    // 2. 动图 (Ugoira) 处理
    if (illustType === 2) {
      const metaUrl = `https://www.pixiv.net/ajax/illust/${id}/ugoira_meta?lang=zh`;
      const metaRes = await fetch(metaUrl, { headers });
      const metaData = await metaRes.json();

      // R-18 保护检查：如果没有 Cookie，这里通常拿不到 body
      if(!metaData.body) {
          return res.status(403).json({ error: 'R-18 Ugoira metadata blocked. Please check PIXIV_COOKIE.' });
      }

      // 设置缓存
      res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400');

      return res.status(200).json({
        isUgoira: true,
        title: infoData.body.title,
        original: metaData.body.originalSrc, 
        frames: metaData.body.frames, 
        cover: infoData.body.urls.original 
      });
    }

    // 3. 普通/R-18 插画处理
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
