// api/analyze.js
export const config = { runtime: 'edge' };

export default async function handler(request) {
  const url = new URL(request.url);
  // Extract ID from query params or path (/analyze/:id)
  let id = url.searchParams.get('id');
  if (!id && url.pathname.startsWith('/analyze/')) {
    id = url.pathname.split('/').filter(Boolean).pop();
  }

  if (!id) {
    return new Response(JSON.stringify({ error: 'Missing ID' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // 1. 定义基础 Headers
  const headers = {
    'Referer': 'https://www.pixiv.net/',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:146.0) Gecko/20100101 Firefox/146.0',
  };

  // 2. Cookie 优先级逻辑：
  // 优先级 1: 前端传来的自定义 Header (x-user-cookie)
  // 优先级 2: Vercel 环境变量 (PIXIV_COOKIE)
  // 优先级 3: Vercel 环境变量 (PHPSESSID)
  const clientCookie = request.headers.get('x-user-cookie');
  
  if (clientCookie) {
    headers['Cookie'] = clientCookie;
  } else if (process.env.PIXIV_COOKIE) {
    headers['Cookie'] = process.env.PIXIV_COOKIE;
  } else if (process.env.PIXIV_PHPSESSID) {
    headers['Cookie'] = `PHPSESSID=${process.env.PIXIV_PHPSESSID}`;
  }

  try {
    // ⚡ Bolt Optimization: Fetch info and pages in parallel to save one round-trip time.
    const infoUrl = `https://www.pixiv.net/ajax/illust/${id}?lang=zh`;
    const pagesUrl = `https://www.pixiv.net/ajax/illust/${id}/pages?lang=zh`;

    const [infoRes, pagesRes] = await Promise.all([
        fetch(infoUrl, { headers }),
        fetch(pagesUrl, { headers })
    ]);

    if (!infoRes.ok) {
        return new Response(JSON.stringify({ error: 'Pixiv API Error', status: infoRes.status }), {
            status: infoRes.status,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    const infoData = await infoRes.json();
    if (infoData.error) {
        return new Response(JSON.stringify({ error: 'Artwork restricted or not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' }
        });
    }
    
    const illustType = infoData.body.illustType;
    const commonHeaders = {
        'Content-Type': 'application/json',
        // ⚡ Bolt Optimization: Enable Edge Caching of metadata
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=600',
        // Ensure cache is partitioned by the user's cookie to prevent serving restricted content to wrong users
        'Vary': 'x-user-cookie'
    };

    if (illustType === 2) {
        // Ugoira requires extra metadata from ugoira_meta endpoint
        const metaUrl = `https://www.pixiv.net/ajax/illust/${id}/ugoira_meta?lang=zh`;
        const metaRes = await fetch(metaUrl, { headers });
        const metaData = await metaRes.json();
        
        if(!metaData.body) {
            return new Response(JSON.stringify({ error: 'R-18 Ugoira blocked.' }), {
                status: 403,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        return new Response(JSON.stringify({
            isUgoira: true,
            title: infoData.body.title,
            original: metaData.body.originalSrc, 
            frames: metaData.body.frames, 
            cover: infoData.body.urls.original 
        }), {
            status: 200,
            headers: commonHeaders
        });
    }

    if (!pagesRes.ok) {
        return new Response(JSON.stringify({ error: 'Pixiv Pages API Error' }), {
            status: pagesRes.status,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    const pagesData = await pagesRes.json();
    const images = pagesData.body.map(item => item.urls.original);

    return new Response(JSON.stringify({
      isUgoira: false,
      title: infoData.body.title,
      images: images
    }), {
      status: 200,
      headers: commonHeaders
    });

  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
    });
  }
}
