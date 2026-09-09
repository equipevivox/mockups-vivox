const {
  S3Client, PutObjectCommand, HeadObjectCommand, ListObjectsV2Command, DeleteObjectsCommand
} = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const cfg = require('../config.js');
const { fail } = require('./auth.cjs');

function createAdapters(env) {
  if (!env.R2_ENDPOINT || !env.R2_BUCKET || !env.R2_ACCESS_KEY_ID || !env.R2_SECRET_ACCESS_KEY) {
    throw fail(503, 'O armazenamento ainda não está configurado.');
  }
  const client = new S3Client({
    region: 'auto', endpoint: env.R2_ENDPOINT, forcePathStyle: true,
    credentials: { accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY },
    requestChecksumCalculation: 'WHEN_REQUIRED', responseChecksumValidation: 'WHEN_REQUIRED',
    maxAttempts: 3
  });
  const Bucket = env.R2_BUCKET;
  const r2 = {
    async sign(key, type, size) {
      return getSignedUrl(client, new PutObjectCommand({ Bucket, Key: key, ContentType: type,
        ContentLength: size, CacheControl: 'public, max-age=31536000, immutable' }),
      { expiresIn: 600, signableHeaders: new Set(['content-type', 'content-length']) });
    },
    head: key => client.send(new HeadObjectCommand({ Bucket, Key: key })),
    async remove(keys) {
      for (let i = 0; i < keys.length; i += 1000) {
        const result = await client.send(new DeleteObjectsCommand({ Bucket,
          Delete: { Objects: keys.slice(i, i + 1000).map(Key => ({ Key })), Quiet: true } }));
        if (result.Errors?.length) throw fail(502, 'Não foi possível excluir todos os arquivos. Tente novamente.');
      }
    },
    async removePrefix(prefix) {
      // Lista todas as chaves antes de remover para não invalidar a paginação.
      const keys = [];
      let token;
      do {
        const page = await client.send(new ListObjectsV2Command({ Bucket, Prefix: prefix, ContinuationToken: token }));
        keys.push(...(page.Contents || []).map(item => item.Key));
        token = page.IsTruncated ? page.NextContinuationToken : undefined;
      } while (token);
      await r2.remove(keys);
    }
  };
  async function request(path, method = 'GET', body, extra = {}) {
    const response = await fetch(cfg.SUPABASE_URL + path, {
      method, headers: { apikey: cfg.SUPABASE_KEY, 'Content-Type': 'application/json', ...extra },
      body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(20000)
    });
    if (!response.ok) {
      // Não propaga payloads ou cabeçalhos do provedor para o navegador/log.
      throw fail(response.status === 409 ? 409 : 502, response.status === 409
        ? 'Outro envio alterou este material. Atualize a lista e tente novamente.' : 'Não foi possível salvar os dados. Tente novamente.');
    }
    const text = await response.text();
    return text ? JSON.parse(text) : null;
  }
  const filter = (field, value) => `${field}=eq.${encodeURIComponent(value)}`;
  const db = {
    async get(id) { return (await request('/rest/v1/mockups?' + filter('id', id) + '&select=*'))[0] || null; },
    async save(data, previous) {
      const { id, name, ...patch } = data;
      const url = previous ? '/rest/v1/mockups?' + filter('id', id) + '&' + filter('cover_version', previous)
        : '/rest/v1/mockups';
      const rows = await request(url, previous ? 'PATCH' : 'POST', previous ? patch : data, { Prefer: 'return=representation' });
      if (rows?.length !== 1) throw fail(409, 'Outro envio alterou este material. Atualize a lista e tente novamente.');
      return rows[0];
    },
    async deleteMaterial(id) { await request('/rest/v1/mockups?' + filter('id', id), 'DELETE'); },
    async comments(id) { return request('/rest/v1/comments?' + filter('mockup_id', id) + '&select=id,parent_id,mockup_id,photos'); },
    async deleteComment(id) { await request('/rest/v1/comments?' + filter('id', id), 'DELETE'); },
    async removeLegacy(paths) {
      if (paths.length) await request('/storage/v1/object/' + cfg.BUCKET, 'DELETE', { prefixes: paths });
    },
    async removeLegacyFolder(prefix) {
      for (;;) {
        const objects = await request('/storage/v1/object/list/' + cfg.BUCKET, 'POST', { prefix, limit: 1000, offset: 0 });
        const paths = (objects || []).filter(o => o.id).map(o => prefix + '/' + o.name);
        if (!paths.length) return;
        await db.removeLegacy(paths);
      }
    }
  };
  return { db, r2 };
}
module.exports = { createAdapters };
