
import { ProxyAgent } from 'undici';

export default async function handler(req, res) {
  const { limit = 60, mode = 'all', category = 'illust' } = req.query;

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
    // Pixiv Discovery API
    // Note: Discovery API behaves differently. It recommends works based on user history.
    // It usually returns ~60 items. Pagination is vague (often just requesting again gives new results or same).
    const targetUrl = category === 'novel' 
        ? `https://www.pixiv.net/ajax/discovery/novels?mode=${mode}&limit=${limit}&lang=zh`
        : `https://www.pixiv.net/ajax/discovery/artworks?mode=${mode}&limit=${limit}&lang=zh`;
    
    const response = await fetch(targetUrl, { headers, dispatcher });
    if (!response.ok) return res.status(response.status).json({ error: 'Failed to fetch discovery' });

    const data = await response.json();
    
    if (data.error) return res.status(500).json({ error: 'Pixiv API Error', message: data.message });

    // Handle Novels
    if (category === 'novel') {
        const novels = data.body.thumbnails.novel;
        if (!novels || novels.length === 0) return res.status(200).json({ items: [] });

        const items = novels.map(item => ({
            id: item.id,
            title: item.title,
            userName: item.userName,
            userImage: item.profileImageUrl,
            userId: item.userId,
            tags: item.tags,
            url: item.url, // Cover
            isR18: item.xRestrict > 0,
            textCount: item.textCount,
            wordCount: item.wordCount,
            readingTime: item.readingTime, // Often calculated or provided? Pixiv usually provides 'readingTime' in seconds or minutes?
            // Actually 'textCount' is char count. 'wordCount' might not be there.
            // Let's pass what we have.
            description: item.description,
            bookmarkCount: item.bookmarkCount,
            series: item.seriesTitle,
            createDate: item.createDate
        }));
        
        res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=300');
        return res.status(200).json({ items });
    }

    // Extract illusts from body.thumbnails.illust
    const illusts = data.body.thumbnails.illust;

    if (!illusts || illusts.length === 0) {
        return res.status(200).json({ items: [] });
    }

    // Transform data
    const items = illusts.map(item => ({
      id: item.id,
      title: item.title,
      userName: item.userName,
      userImage: item.profileImageUrl, // Add user profile image
      userId: item.userId,
      width: item.width,
      height: item.height,
      tags: item.tags,
      url: item.url, // Thumbnail
      isR18: item.xRestrict > 0,
      isUgoira: item.illustType === 2,
      pageCount: item.pageCount
    }));

    // Cache slightly less for discovery as it changes
    res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=300');
    return res.status(200).json({ items });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}
