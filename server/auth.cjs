const { createHash, createHmac, timingSafeEqual } = require('node:crypto');
const COOKIE = 'vivox_session';
const fail = (status, message) => Object.assign(new Error(message), { status });
function equal(a, b) {
  const left = Buffer.from(String(a)), right = Buffer.from(String(b));
  return left.length === right.length && timingSafeEqual(left, right);
}
function createAuth(env) {
  if (!env.SESSION_SECRET || !/^[a-f0-9]{64}$/i.test(env.ADMIN_PASSWORD_SHA256 || '')) {
    throw fail(503, 'O armazenamento ainda não está configurado.');
  }
  const sign = value => createHmac('sha256', env.SESSION_SECRET).update(value).digest('base64url');
  function issue(data, seconds) {
    const payload = Buffer.from(JSON.stringify({ ...data, exp: Math.floor(Date.now() / 1000) + seconds })).toString('base64url');
    return payload + '.' + sign(payload);
  }
  function read(value, kind) {
    try {
      if (typeof value !== 'string' || value.length > 10000) return null;
      const [payload, signature, extra] = value.split('.');
      if (extra || !signature || !equal(signature, sign(payload))) return null;
      const data = JSON.parse(Buffer.from(payload, 'base64url'));
      return data.kind === kind && data.exp > Date.now() / 1000 ? data : null;
    } catch { return null; }
  }
  function session(req) {
    const cookie = String(req.headers.cookie || '').split(';').map(s => s.trim()).find(s => s.startsWith(COOKIE + '='));
    return read(cookie?.slice(COOKIE.length + 1), 'admin');
  }
  function setCookie(res, token) {
    const secure = env.NODE_ENV === 'production' || env.VERCEL ? '; Secure' : '';
    res.setHeader('Set-Cookie', `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${token ? 43200 : 0}${secure}`);
  }
  function login(user, password) {
    if (typeof password !== 'string' || password.length > 256) return false;
    const hash = createHash('sha256').update(password).digest('hex');
    return equal(hash, env.ADMIN_PASSWORD_SHA256) && String(user).trim().toUpperCase() === 'VIVOX';
  }
  return { issue, read, session, setCookie, login };
}
module.exports = { createAuth, fail };
