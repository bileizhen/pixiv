// api/analyze.js
export default async function handler(req, res) {
  const { id } = req.query;

  if (!id) return res.status(400).json({ error: 'Missing ID' });

  // 1. 构造请求头
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
    'Referer': `https://www.pixiv.net/artworks/${id}`,
  };

  // 2. 核心修改：如果环境变量里有 Cookie，就带上
  // 这让 Pixiv 认为我们是已登录用户，从而允许访问 R-18 数据
  if (process.env.PIXIV_PHPSESSID) {
    headers['Cookie'] = `PHPSESSID=${process.env.PIXIV_PHPSESSID}`;
  }

  try {
    // 请求作品详情
    const infoUrl = `https://www.pixiv.net/ajax/illust/${id}?lang=zh`;
    const infoRes = await fetch(infoUrl, { headers });
    
    // 处理 Cookie 失效或账号被限制的情况
    if (!infoRes.ok) {
       console.error(`Pixiv API Error: ${infoRes.status}`);
       return res.status(infoRes.status).json({ error: 'Pixiv API Error (Check Cookie)' });
    }
    
    const infoData = await infoRes.json();
    
    // 如果返回 error，通常是因为 Cookie 没加对，或者作品被删除
    if (infoData.error) {
      return res.status(404).json({ error: 'Artwork not found or R-18 restricted (Please config PIXIV_PHPSESSID)' });
    }

    const illustType = infoData.body.illustType; // 0=插画, 1=漫画, 2=动图

    // --- 动图处理 (Ugoira) ---
    if (illustType === 2) {
      const metaUrl = `https://www.pixiv.net/ajax/illust/${id}/ugoira_meta?lang=zh`;
      const metaRes = await fetch(metaUrl, { headers });
      const metaData = await metaRes.json();

      res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400');

      return res.status(200).json({
        isUgoira: true,
        title: infoData.body.title,
        original: metaData.body.originalSrc, 
        frames: metaData.body.frames, 
        cover: infoData.body.urls.original 
      });
    }

    // --- 普通/R-18 插画处理 ---
    const pagesUrl = `https://www.pixiv.net/ajax/illust/${id}/pages?lang=zh`;
    const pagesRes = await fetch(pagesUrl, { headers });
    const pagesData = await pagesRes.json();

    const images = pagesData.body.map(item => item.urls.original);

    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400');
    
    return res.status(200).json({
      isUgoira: false,
      title: infoData.body.title,
      images: images,
      // 增加一个标记，告诉前端这是限制级内容 (可选)
      isR18: infoData.body.xRestrict > 0 
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
