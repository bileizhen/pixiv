
import { ProxyAgent } from 'undici';

export default async function handler(req, res) {
  const { mode = 'daily', content = 'illust', p = 1 } = req.query;

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
    // Pixiv Ranking API
    const targetUrl = `https://www.pixiv.net/ranking.php?mode=${mode}&content=${content}&p=${p}&format=json`;
    
    const response = await fetch(targetUrl, { headers, dispatcher });
    if (!response.ok) return res.status(response.status).json({ error: 'Failed to fetch ranking' });

    const data = await response.json();
    
    // Transform data to a cleaner format
    const items = data.contents.map(item => ({
      id: item.illust_id,
      title: item.title,
      userName: item.user_name,
      width: item.width,
      height: item.height,
      tags: item.tags,
      url: item.url, // Thumbnail
      isR18: item.tags.includes('R-18'),
      isUgoira: item.illust_type == 2
    }));

    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=600');
    return res.status(200).json({ items, next_page: data.next_page });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}
