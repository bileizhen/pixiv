
import { ProxyAgent } from 'undici';

export default async function handler(req, res) {
  const { tags } = req.query; // If tags are provided, we search. Otherwise discovery.
  const limit = 60;

  const headers = {
    'Referer': 'https://www.pixiv.net/',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:146.0) Gecko/20100101 Firefox/146.0',
  };
  
  // Reuse cookie logic
  const clientCookie = req.headers['x-user-cookie'];
  if (clientCookie) headers['Cookie'] = clientCookie;
  else if (process.env.PIXIV_COOKIE) headers['Cookie'] = process.env.PIXIV_COOKIE;
  else if (process.env.PIXIV_PHPSESSID) headers['Cookie'] = `PHPSESSID=${process.env.PIXIV_PHPSESSID}`;

  const dispatcher = process.env.HTTPS_PROXY ? new ProxyAgent(process.env.HTTPS_PROXY) : undefined;

  try {
    let items = [];
    
    // Check if we have positive tags to search for
    const tagList = tags ? tags.split(' ').filter(t => t.trim()) : [];
    const hasPositiveTags = tagList.some(t => !t.startsWith('-'));
    const excludeTags = tagList.filter(t => t.startsWith('-')).map(t => t.substring(1));

    if (hasPositiveTags) {
        // Search Mode (R18) - Only if we have specific tags to search
        const encodedWord = encodeURIComponent(tags);
        const targetUrl = `https://www.pixiv.net/ajax/search/artworks/${encodedWord}?word=${encodedWord}&order=date_d&mode=r18&s_mode=s_tag&p=1`;
        const resp = await fetch(targetUrl, { headers, dispatcher });
        const data = await resp.json();
        if (data.body && data.body.illustManga && data.body.illustManga.data) {
             items = data.body.illustManga.data
                .filter(item => item.illustType !== 2) // Filter Ugoira
                .map(item => ({
                id: item.id,
                title: item.title,
                userName: item.userName,
                userImage: item.profileImageUrl,
                userId: item.userId,
                url: item.url,
                tags: item.tags,
                isR18: true, // We requested R18
                createDate: item.createDate,
                bookmarkCount: item.bookmarkCount,
                viewCount: item.viewCount,
                pageCount: item.pageCount
             }));
        }
    } else {
        // Recommendation Mode (R18) - Use top/illust for better data (stats)
        // ajax/discovery/artworks often lacks stats. ajax/top/illust is the home feed.
        const targetUrl = `https://www.pixiv.net/ajax/top/illust?mode=r18&limit=${limit}&lang=zh`;
        const resp = await fetch(targetUrl, { headers, dispatcher });
        const data = await resp.json();
        if (data.body && data.body.thumbnails && data.body.thumbnails.illust) {
            items = data.body.thumbnails.illust
                .filter(item => item.illustType !== 2) // Filter Ugoira
                .map(item => ({
                id: item.id,
                title: item.title,
                userName: item.userName,
                userImage: item.profileImageUrl,
                userId: item.userId,
                url: item.url,
                tags: item.tags,
                isR18: true,
                createDate: item.createDate,
                bookmarkCount: item.bookmarkCount,
                viewCount: item.viewCount,
                pageCount: item.pageCount
            }));
        }
    }

    // Apply Client-side Filtering for Excluded Tags (Crucial for Discovery Mode or mixed results)
    if (excludeTags.length > 0) {
        items = items.filter(item => {
            // Check if item has any of the excluded tags
            // item.tags is an array of strings
            const itemTags = item.tags || [];
            const hasExcluded = excludeTags.some(ex => itemTags.includes(ex));
            return !hasExcluded;
        });
    }

    // Attempt to get higher res image URL from thumbnail
    // Thumb: https://i.pximg.net/c/250x250_80_a2/img-master/img/.../xxx_p0_square1200.jpg
    // We want to try to display something better if possible, but for feed, 
    // let's stick to the safe URL but maybe we can use a proxy trick if needed.
    // For now, return as is.

    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=30');
    return res.status(200).json({ items });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}
