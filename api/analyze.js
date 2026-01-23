// api/analyze.js
export const config = { runtime: 'edge' };

const BASE_HEADERS = {
  'Referer': 'https://www.pixiv.net/',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:146.0) Gecko/20100101 Firefox/146.0',
};

export default async function handler(req) {
  const url = new URL(req.url);
  // Extract ID from query param or from path (/analyze/:id)
  let id = url.searchParams.get('id');
  if (!id) {
    const parts = url.pathname.split('/').filter(Boolean);
    const last = parts[parts.length - 1];
    id = last === 'analyze' ? null : last;
  }

  if (!id) {
    return new Response(JSON.stringify({ error: 'Missing ID' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }

  // 1. 定义基础 Headers
  const headers = { ...BASE_HEADERS };

  // 2. Cookie 优先级逻辑
  const clientCookie = req.headers.get('x-user-cookie');
  
  if (clientCookie) {
    headers['Cookie'] = clientCookie;
  } else if (process.env.PIXIV_COOKIE) {
    headers['Cookie'] = process.env.PIXIV_COOKIE;
  } else if (process.env.PIXIV_PHPSESSID) {
    headers['Cookie'] = `PHPSESSID=${process.env.PIXIV_PHPSESSID}`;
  }

  try {
    const commonHeaders = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=600'
    };

    // ⚡ Bolt Optimization: Fetch info and pages in parallel to save one round-trip time.
    const infoUrl = `https://www.pixiv.net/ajax/illust/${id}?lang=zh`;
    const pagesUrl = `https://www.pixiv.net/ajax/illust/${id}/pages?lang=zh`;

    const [infoRes, pagesRes] = await Promise.all([
        fetch(infoUrl, { headers }),
        fetch(pagesUrl, { headers })
    ]);

    if (!infoRes.ok) {
        return new Response(JSON.stringify({ error: 'Pixiv API Error' }), { status: infoRes.status, headers: commonHeaders });
    }

    const infoData = await infoRes.json();
    if (infoData.error) {
        return new Response(JSON.stringify({ error: 'Artwork restricted or not found' }), { status: 404, headers: commonHeaders });
    }
    
    const illustType = infoData.body.illustType;

    if (illustType === 2) {
        // Ugoira requires extra metadata from ugoira_meta endpoint
        const metaUrl = `https://www.pixiv.net/ajax/illust/${id}/ugoira_meta?lang=zh`;
        const metaRes = await fetch(metaUrl, { headers });
        const metaData = await metaRes.json();
        
        if(!metaData.body) {
            return new Response(JSON.stringify({ error: 'R-18 Ugoira blocked.' }), { status: 403, headers: commonHeaders });
        }

        return new Response(JSON.stringify({
            isUgoira: true,
            title: infoData.body.title,
            original: metaData.body.originalSrc, 
            frames: metaData.body.frames, 
            cover: infoData.body.urls.original 
        }), { status: 200, headers: commonHeaders });
    }

    if (!pagesRes.ok) {
        return new Response(JSON.stringify({ error: 'Pixiv Pages API Error' }), { status: pagesRes.status, headers: commonHeaders });
    }

    const pagesData = await pagesRes.json();
    const images = pagesData.body.map(item => item.urls.original);

    return new Response(JSON.stringify({
      isUgoira: false,
      title: infoData.body.title,
      images: images
    }), { status: 200, headers: commonHeaders });

  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}
