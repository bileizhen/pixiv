
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { password } = req.body;
  const correctPassword = process.env.DEER_PASSWORD || '114514'; // Default fallback for dev

  if (password === correctPassword) {
    // Set a session cookie or token if needed, for now just return success
    // In a real app we might set an HTTP-only cookie.
    // Let's return a simple success.
    return res.status(200).json({ success: true, message: 'Welcome to Deer Mode' });
  } else {
    return res.status(401).json({ error: 'Access Denied' });
  }
}
