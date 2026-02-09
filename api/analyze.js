// api/analyze.js
import { ProxyAgent } from 'undici';

export default async function handler(req, res) {
  const { id, type = 'illust' } = req.query;
  if (!id) return res.status(400).json({ error: 'Missing ID' });

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

  // Proxy Configuration
  const dispatcher = process.env.HTTPS_PROXY ? new ProxyAgent(process.env.HTTPS_PROXY) : undefined;

  try {
    // ⚡ Bolt Optimization: Add Cache-Control to allow Edge Caching of metadata
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=600');

    // ⚡ Bolt Optimization: Fetch info and pages in parallel
    const infoUrl = type === 'novel' 
        ? `https://www.pixiv.net/ajax/novel/${id}?lang=zh`
        : `https://www.pixiv.net/ajax/illust/${id}?lang=zh`;
    
    const pagesUrl = type === 'novel' 
        ? null // Novels don't have pages endpoint like illusts
        : `https://www.pixiv.net/ajax/illust/${id}/pages?lang=zh`;

    // We also need user info for the avatar. The illust endpoint 'noLoginData' usually has minimal info.
    // The 'user' endpoint is needed for full profile image.
    // But let's try to see if infoData contains it.
    
    const infoPromise = fetch(infoUrl, { headers, dispatcher });
    const pagesPromise = pagesUrl ? fetch(pagesUrl, { headers, dispatcher }).catch(err => {
        console.error("Background pages fetch failed:", err);
        return null; 
    }) : Promise.resolve(null);

    const infoRes = await infoPromise;
    if (!infoRes.ok) return res.status(infoRes.status).json({ error: 'Pixiv API Error' });

    const infoData = await infoRes.json();
    if (infoData.error) return res.status(404).json({ error: 'Artwork restricted or not found' });
    
    // Handle Novel
    if (type === 'novel') {
        const body = infoData.body;
        // Fetch User Info
        let userImage = '';
        let authorRecommended = [];
        try {
            const userUrl = `https://www.pixiv.net/ajax/user/${body.userId}?lang=zh`;
            const userRes = await fetch(userUrl, { headers, dispatcher });
            if(userRes.ok) {
                const userData = await userRes.json();
                userImage = userData.body.imageBig || userData.body.image;
            }

            // Also fetch recommended novels (top)
            const userWorksUrl = `https://www.pixiv.net/ajax/user/${body.userId}/profile/top?lang=zh`;
            const userWorksRes = await fetch(userWorksUrl, { headers, dispatcher });
            
            if(userWorksRes.ok) {
                const worksData = await userWorksRes.json();
                // Check for 'manga' or 'novels' in profile top
                // Usually profile/top returns { illusts: {}, manga: {}, novels: {} }
                if (worksData.body && worksData.body.novels) {
                    const novelsMap = worksData.body.novels;
                    const ids = Object.keys(novelsMap).sort((a,b) => b-a).slice(0, 3);
                    authorRecommended = ids.map(id => ({
                        id: id,
                        title: novelsMap[id].title,
                        url: novelsMap[id].url // This is cover url
                    }));
                }
            }
        } catch(e) {
            console.warn('Failed to fetch novel user extra info', e);
        }

        return res.status(200).json({
            id: body.id,
            isNovel: true,
            isR18: body.xRestrict > 0,
            title: body.title,
            description: body.description,
            tags: body.tags.tags.map(t => t.tag),
            userId: body.userId,
            userName: body.userName,
            userImage: userImage,
            authorRecommended: authorRecommended, // Add this
            createDate: body.createDate,
            viewCount: body.viewCount,
            bookmarkCount: body.bookmarkCount,
            likeCount: body.likeCount,
            content: body.content, // Novel text
            textCount: body.textCount,
            cover: body.coverUrl,
            series: body.seriesNavData?.title
        });
    }

    const illustType = infoData.body.illustType;
    const pageCount = infoData.body.pageCount;
    const isR18 = infoData.body.xRestrict > 0;
    const userId = infoData.body.userId;

    // Fetch User Profile Image (Optional but nice)
    let userImage = '';
    let authorRecommended = [];
    
    try {
        const userUrl = `https://www.pixiv.net/ajax/user/${userId}?lang=zh`;
        // Fetch user recommended works (latest 3) for the sidebar
        const userWorksUrl = `https://www.pixiv.net/ajax/user/${userId}/profile/top?lang=zh`;
        
        const [userRes, userWorksRes] = await Promise.all([
            fetch(userUrl, { headers, dispatcher }),
            fetch(userWorksUrl, { headers, dispatcher })
        ]);

        if(userRes.ok) {
            const userData = await userRes.json();
            userImage = userData.body.imageBig || userData.body.image;
        }
        
        if(userWorksRes.ok) {
            const worksData = await userWorksRes.json();
            // Typically body.illusts contains a map of ID -> Illust Object
            // But 'profile/top' structure might differ. Let's check 'illusts' key.
            // Actually simpler endpoint: /ajax/user/{id}/profile/all gives all IDs.
            // But we need thumbnails. /ajax/user/{id}/profile/top usually returns `works` which has `illusts`.
            // Let's use a safer endpoint that returns list with details: 
            // https://www.pixiv.net/ajax/user/${userId}/profile/all is just IDs.
            // We can use https://www.pixiv.net/ajax/user/${userId}/illusts/bookmarks?tag=&offset=0&limit=3&rest=show (No, this is bookmarks)
            // Correct one: https://www.pixiv.net/ajax/user/${userId}/profile/top
            // The structure is body.illusts (object map)
            
            if (worksData.body && worksData.body.illusts) {
                const illustsMap = worksData.body.illusts;
                // Get first 3 keys
                const ids = Object.keys(illustsMap).sort((a,b) => b-a).slice(0, 3); // Simple sort by ID desc (newest)
                authorRecommended = ids.map(id => ({
                    id: id,
                    title: illustsMap[id].title,
                    url: illustsMap[id].url
                }));
            }
        }
    } catch(e) {
        console.warn('Failed to fetch user extra info', e);
    }

    // Early return for single-page artworks (illustType 0/1)
    if (pageCount === 1 && illustType !== 2) {
        return res.status(200).json({
            id: infoData.body.id,
            isUgoira: false,
            isR18,
            title: infoData.body.title,
            description: infoData.body.description,
            tags: infoData.body.tags.tags.map(t => t.tag),
            userId: infoData.body.userId,
            userName: infoData.body.userName,
            userImage: userImage, 
            authorRecommended: authorRecommended,
            createDate: infoData.body.createDate,
            viewCount: infoData.body.viewCount,
            bookmarkCount: infoData.body.bookmarkCount,
            likeCount: infoData.body.likeCount,
            images: [infoData.body.urls.original]
        });
    }

    if (illustType === 2) {
        // Ugoira requires extra metadata from ugoira_meta endpoint
        const metaUrl = `https://www.pixiv.net/ajax/illust/${id}/ugoira_meta?lang=zh`;
        const metaRes = await fetch(metaUrl, { headers, dispatcher });
        const metaData = await metaRes.json();
        
        if(!metaData.body) return res.status(403).json({ error: 'R-18 Ugoira blocked.' });

        return res.status(200).json({
            id: infoData.body.id,
            isUgoira: true,
            isR18,
            title: infoData.body.title,
            description: infoData.body.description,
            tags: infoData.body.tags.tags.map(t => t.tag),
            userId: infoData.body.userId,
            userName: infoData.body.userName,
            userImage: userImage,
            authorRecommended: authorRecommended,
            createDate: infoData.body.createDate,
            viewCount: infoData.body.viewCount,
            bookmarkCount: infoData.body.bookmarkCount,
            likeCount: infoData.body.likeCount,
            original: metaData.body.originalSrc, 
            frames: metaData.body.frames, 
            cover: infoData.body.urls.original 
        });
    }

    const pagesRes = await pagesPromise;
    if (!pagesRes || !pagesRes.ok) return res.status(pagesRes?.status || 500).json({ error: 'Pixiv Pages API Error' });

    const pagesData = await pagesRes.json();
    const images = pagesData.body.map(item => item.urls.original);

    return res.status(200).json({
      id: infoData.body.id,
      isUgoira: false,
      isR18,
      title: infoData.body.title,
      description: infoData.body.description,
      tags: infoData.body.tags.tags.map(t => t.tag),
      userId: infoData.body.userId,
      userName: infoData.body.userName,
      userImage: userImage,
      authorRecommended: authorRecommended,
      createDate: infoData.body.createDate,
      viewCount: infoData.body.viewCount,
      bookmarkCount: infoData.body.bookmarkCount,
      likeCount: infoData.body.likeCount,
      images: images
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}
