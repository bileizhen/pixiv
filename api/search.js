
import { ProxyAgent } from 'undici';

export default async function handler(req, res) {
  const { word, p = 1 } = req.query;
  if (!word) return res.status(400).json({ error: 'Missing search word' });

  const headers = {
    'Referer': 'https://www.pixiv.net/',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:146.0) Gecko/20100101 Firefox/146.0',
  };

  // Cookie Logic
  const clientCookie = req.headers['x-user-cookie'];
  if (clientCookie) {
    headers['Cookie'] = clientCookie;
  } else if (process.env.PIXIV_COOKIE) {
    headers['Cookie'] = process.env.PIXIV_COOKIE;
  } else if (process.env.PIXIV_PHPSESSID) {
    headers['Cookie'] = `PHPSESSID=${process.env.PIXIV_PHPSESSID}`;
  }

  // Proxy Configuration
  const dispatcher = process.env.HTTPS_PROXY ? new ProxyAgent(process.env.HTTPS_PROXY) : undefined;

  try {
    // Pixiv Search API (AJAX)
    const encodedWord = encodeURIComponent(word);
    const targetUrl = `https://www.pixiv.net/ajax/search/artworks/${encodedWord}?word=${encodedWord}&p=${p}&order=date_d&mode=all&s_mode=s_tag`;
    
    const response = await fetch(targetUrl, { headers, dispatcher });
    if (!response.ok) return res.status(response.status).json({ error: 'Failed to fetch search results' });

    const data = await response.json();
    
    if (data.error) return res.status(500).json({ error: 'Pixiv API Error' });

    const illusts = data.body.illustManga.data;
    
    const items = illusts.map(item => ({
      id: item.id,
      title: item.title,
      userName: item.userName,
      width: item.width,
      height: item.height,
      tags: item.tags,
      url: item.url, // Thumbnail
      isR18: item.xRestrict > 0,
      isUgoira: item.illustType === 2,
      pageCount: item.pageCount
    }));

    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=600');
    return res.status(200).json({ items, total: data.body.illustManga.total });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}
