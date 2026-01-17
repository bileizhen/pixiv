// api/analyze.js
export default async function handler(req, res) {
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'Missing ID' });

  // 1. 定义基础 Headers
  const headers = {
    'Referer': 'https://www.pixiv.net/',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:146.0) Gecko/20100101 Firefox/146.0',
  };

  // 2. Cookie 优先级逻辑：
  // 优先级 1: 前端传来的自定义 Header (x-user-cookie)
  // 优先级 2: Vercel 环境变量 (PIXIV_COOKIE)
  // 优先级 3: Vercel 环境变量 (PHPSESSID)
  const clientCookie = req.headers['x-user-cookie'];
  
  if (clientCookie) {
    headers['Cookie'] = clientCookie;
  } else if (process.env.PIXIV_COOKIE) {
    headers['Cookie'] = process.env.PIXIV_COOKIE;
  } else if (process.env.PIXIV_PHPSESSID) {
    headers['Cookie'] = `PHPSESSID=${process.env.PIXIV_PHPSESSID}`;
  }

  try {
    // ⚡ Bolt Optimization: Add Cache-Control to allow Edge Caching of metadata
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=600');

    // ⚡ Bolt Optimization: Fetch info and pages in parallel to save one round-trip time.
    const infoUrl = `https://www.pixiv.net/ajax/illust/${id}?lang=zh`;
    const pagesUrl = `https://www.pixiv.net/ajax/illust/${id}/pages?lang=zh`;

    const [infoRes, pagesRes] = await Promise.all([
        fetch(infoUrl, { headers }),
        fetch(pagesUrl, { headers })
    ]);

    if (!infoRes.ok) return res.status(infoRes.status).json({ error: 'Pixiv API Error' });
    const infoData = await infoRes.json();
    if (infoData.error) return res.status(404).json({ error: 'Artwork restricted or not found' });
    
    const illustType = infoData.body.illustType;

    if (illustType === 2) {
        // Ugoira requires extra metadata from ugoira_meta endpoint
        const metaUrl = `https://www.pixiv.net/ajax/illust/${id}/ugoira_meta?lang=zh`;
        const metaRes = await fetch(metaUrl, { headers });
        const metaData = await metaRes.json();
        
        if(!metaData.body) return res.status(403).json({ error: 'R-18 Ugoira blocked.' });

        return res.status(200).json({
            isUgoira: true,
            title: infoData.body.title,
            original: metaData.body.originalSrc, 
            frames: metaData.body.frames, 
            cover: infoData.body.urls.original 
        });
    }

    if (!pagesRes.ok) return res.status(pagesRes.status).json({ error: 'Pixiv Pages API Error' });
    const pagesData = await pagesRes.json();
    const images = pagesData.body.map(item => item.urls.original);

    return res.status(200).json({
      isUgoira: false,
      title: infoData.body.title,
      images: images
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}
