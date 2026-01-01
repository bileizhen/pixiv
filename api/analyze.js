// api/analyze.js
export default async function handler(req, res) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Missing ID' });
  }

  try {
    // 请求 Pixiv 官方接口获取图片详情 (包含多图)
    // 伪造 User-Agent 和 Referer 非常重要
    const targetUrl = `https://www.pixiv.net/ajax/illust/${id}/pages?lang=zh`;
    
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
        'Referer': `https://www.pixiv.net/artworks/${id}`,
        // 部分接口需要 Cookie 才能看 R18，这里仅演示公开接口
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Pixiv API Error' });
    }

    const data = await response.json();

    if (data.error) {
      return res.status(404).json({ error: 'Artwork not found or restricted' });
    }

    // 提取 urls.original
    const images = data.body.map(item => item.urls.original);

    // 设置缓存，避免重复查询同一 ID
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400');
    
    res.status(200).json({ images });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
