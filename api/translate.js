
import { ProxyAgent } from 'undici';

export default async function handler(req, res) {
  const { text } = req.query;
  if (!text) return res.status(400).json({ error: 'Missing text' });

  // Proxy Configuration
  const dispatcher = process.env.HTTPS_PROXY ? new ProxyAgent(process.env.HTTPS_PROXY) : undefined;

  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=zh-CN&dt=t&q=${encodeURIComponent(text)}`;
    
    const response = await fetch(url, { dispatcher });
    if (!response.ok) throw new Error('Translation failed');

    const data = await response.json();
    
    // data[0] contains the translated segments
    // [[["你好","Hello",null,null,1]],...]
    const translatedText = data[0].map(item => item[0]).join('');

    res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=43200');
    return res.status(200).json({ text: translatedText });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}
