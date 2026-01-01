// api/analyze.js
export default async function handler(req, res) {
  const { id } = req.query;

  if (!id) return res.status(400).json({ error: 'Missing ID' });

  // 通用 Header
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
    'Referer': `https://www.pixiv.net/artworks/${id}`,
  };

  try {
    // 1. 先获取作品基本信息，判断类型
    const infoUrl = `https://www.pixiv.net/ajax/illust/${id}?lang=zh`;
    const infoRes = await fetch(infoUrl, { headers });
    
    if (!infoRes.ok) return res.status(infoRes.status).json({ error: 'Pixiv API Error' });
    
    const infoData = await infoRes.json();
    if (infoData.error) return res.status(404).json({ error: 'Artwork not found' });

    const illustType = infoData.body.illustType; // 0=插画, 1=漫画, 2=动图(Ugoira)

    // 2. 如果是动图 (Type = 2)
    if (illustType === 2) {
      const metaUrl = `https://www.pixiv.net/ajax/illust/${id}/ugoira_meta?lang=zh`;
      const metaRes = await fetch(metaUrl, { headers });
      const metaData = await metaRes.json();

      // 设置缓存
      res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400');

      return res.status(200).json({
        isUgoira: true,
        title: infoData.body.title,
        // 动图的 ZIP 包地址
        original: metaData.body.originalSrc, 
        // 每一帧的延迟数据
        frames: metaData.body.frames, 
        // 封面图 (静态)
        cover: infoData.body.urls.original 
      });
    }

    // 3. 如果是普通插画/漫画 (Type = 0 or 1)
    const pagesUrl = `https://www.pixiv.net/ajax/illust/${id}/pages?lang=zh`;
    const pagesRes = await fetch(pagesUrl, { headers });
    const pagesData = await pagesRes.json();

    const images = pagesData.body.map(item => item.urls.original);

    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400');
    
    return res.status(200).json({
      isUgoira: false,
      title: infoData.body.title,
      images: images
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
