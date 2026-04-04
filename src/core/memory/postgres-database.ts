import pg from 'pg';
import type {
  IMemoryDatabase,
  MemoryChunk,
  MemoryChunkRow,
  MemoryKeywordCandidate,
  MemorySearchResult,
  MemoryVectorCandidate,
} from '@/core/memory/types.js';

export class PostgresDatabase implements IMemoryDatabase {
  private constructor(private readonly pool: pg.Pool) {}

  static async create(connectionString: string): Promise<PostgresDatabase> {
    const pool = new pg.Pool({ connectionString });
    const memoryDb = new PostgresDatabase(pool);
    await memoryDb.initSchema();
    return memoryDb;
  }

  private async initSchema(): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('CREATE EXTENSION IF NOT EXISTS vector');
      
      await client.query(`
        CREATE TABLE IF NOT EXISTS meta (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        )
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS embedding_cache (
          content_hash TEXT PRIMARY KEY,
          embedding vector,
          provider TEXT NOT NULL,
          model TEXT NOT NULL,
          created_at BIGINT NOT NULL
        )
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS chunks (
          id SERIAL PRIMARY KEY,
          file_path TEXT NOT NULL,
          start_line INTEGER NOT NULL,
          end_line INTEGER NOT NULL,
          content TEXT NOT NULL,
          content_hash TEXT UNIQUE NOT NULL,
          embedding vector,
          embedding_provider TEXT,
          embedding_model TEXT,
          updated_at BIGINT NOT NULL,
          source TEXT NOT NULL DEFAULT 'memory'
        )
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_chunks_file_path ON chunks(file_path)
      `);

    } finally {
      client.release();
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  async getProviderFingerprint(): Promise<string | null> {
    const res = await this.pool.query('SELECT value FROM meta WHERE key = $1', ['provider_fingerprint']);
    return res.rows[0]?.value ?? null;
  }

  async setProviderFingerprint(value: string): Promise<void> {
    await this.pool.query(`
      INSERT INTO meta (key, value)
      VALUES ($1, $2)
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
    `, ['provider_fingerprint', value]);
  }

  async clearEmbeddings(): Promise<void> {
    await this.pool.query('UPDATE chunks SET embedding = NULL, embedding_provider = NULL, embedding_model = NULL');
    await this.pool.query('DELETE FROM embedding_cache');
  }

  async getCachedEmbedding(contentHash: string): Promise<number[] | null> {
    const res = await this.pool.query('SELECT embedding FROM embedding_cache WHERE content_hash = $1', [contentHash]);
    if (res.rows.length === 0 || !res.rows[0].embedding) return null;
    return this.parseVector(res.rows[0].embedding);
  }

  private formatVector(vec: number[]): string {
    return `[${vec.join(',')}]`;
  }
  
  private parseVector(vecStr: string | number[]): number[] {
    if (Array.isArray(vecStr)) return vecStr;
    try {
      return JSON.parse(vecStr);
    } catch {
      return vecStr.replace('[', '').replace(']', '').split(',').map(Number);
    }
  }

  async setCachedEmbedding(params: {
    contentHash: string;
    embedding: number[];
    provider: string;
    model: string;
  }): Promise<void> {
    await this.pool.query(`
      INSERT INTO embedding_cache (content_hash, embedding, provider, model, created_at)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (content_hash) DO UPDATE SET
        embedding = EXCLUDED.embedding,
        provider = EXCLUDED.provider,
        model = EXCLUDED.model,
        created_at = EXCLUDED.created_at
    `, [params.contentHash, this.formatVector(params.embedding), params.provider, params.model, Date.now()]);
  }

  async getChunkByHash(contentHash: string): Promise<MemoryChunkRow | null> {
    const res = await this.pool.query('SELECT * FROM chunks WHERE content_hash = $1', [contentHash]);
    return res.rows[0] ? this.mapRow(res.rows[0]) : null;
  }
  
  private mapRow(row: any): MemoryChunkRow {
    return {
      id: row.id,
      file_path: row.file_path,
      start_line: row.start_line,
      end_line: row.end_line,
      content: row.content,
      content_hash: row.content_hash,
      embedding: row.embedding ? this.parseVector(row.embedding) : null,
      source: row.source,
      updated_at: Number(row.updated_at),
    };
  }

  async upsertChunk(params: {
    chunk: MemoryChunk;
    embedding: number[] | null;
    provider?: string;
    model?: string;
    source?: string;
  }): Promise<{ id: number; inserted: boolean }> {
    const source = params.source ?? params.chunk.source ?? 'memory';
    const embeddingStr = params.embedding ? this.formatVector(params.embedding) : null;
    
    const existing = await this.pool.query<{id: number}>('SELECT id FROM chunks WHERE content_hash = $1', [params.chunk.contentHash]);
    
    if (existing.rows.length > 0) {
      const id = existing.rows[0].id;
      await this.pool.query(`
        UPDATE chunks SET
          file_path = $1, start_line = $2, end_line = $3, content = $4,
          embedding = $5, embedding_provider = $6, embedding_model = $7,
          updated_at = $8, source = $9
        WHERE id = $10
      `, [
        params.chunk.filePath, params.chunk.startLine, params.chunk.endLine, params.chunk.content,
        embeddingStr, params.provider ?? null, params.model ?? null,
        Date.now(), source, id
      ]);
      return { id, inserted: false };
    }

    const inserted = await this.pool.query<{id: number}>(`
      INSERT INTO chunks (
        file_path, start_line, end_line, content, content_hash,
        embedding, embedding_provider, embedding_model, updated_at, source
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id
    `, [
      params.chunk.filePath, params.chunk.startLine, params.chunk.endLine, params.chunk.content, params.chunk.contentHash,
      embeddingStr, params.provider ?? null, params.model ?? null, Date.now(), source
    ]);

    return { id: inserted.rows[0].id, inserted: true };
  }

  async deleteChunksForFile(filePath: string): Promise<number> {
    const res = await this.pool.query('DELETE FROM chunks WHERE file_path = $1', [filePath]);
    return res.rowCount ?? 0;
  }

  async listIndexedFiles(): Promise<string[]> {
    const res = await this.pool.query('SELECT DISTINCT file_path FROM chunks');
    return res.rows.map(r => r.file_path);
  }

  async listAllChunks(): Promise<MemoryChunkRow[]> {
    const res = await this.pool.query('SELECT * FROM chunks ORDER BY id ASC');
    return res.rows.map(r => this.mapRow(r));
  }

  async searchVector(queryEmbedding: number[], maxResults: number): Promise<MemoryVectorCandidate[]> {
    const res = await this.pool.query(`
      SELECT id, 1 - (embedding <=> $1) as score
      FROM chunks
      WHERE embedding IS NOT NULL
      ORDER BY embedding <=> $1 ASC
      LIMIT $2
    `, [this.formatVector(queryEmbedding), maxResults]);
    
    return res.rows.map(r => ({
      chunkId: r.id,
      score: r.score
    }));
  }

  async searchKeyword(query: string, maxResults: number): Promise<MemoryKeywordCandidate[]> {
    if (!query.trim()) return [];
    
    const res = await this.pool.query(`
      SELECT id, ts_rank_cd(to_tsvector('english', content), plainto_tsquery('english', $1)) AS score
      FROM chunks
      WHERE to_tsvector('english', content) @@ plainto_tsquery('english', $1)
      ORDER BY score DESC
      LIMIT $2
    `, [query, maxResults]);

    return res.rows.map(r => ({
      chunkId: r.id,
      score: 1 / (1 + Math.exp(-r.score))
    }));
  }

  async loadResultsByIds(ids: number[]): Promise<MemorySearchResult[]> {
    if (ids.length === 0) return [];
    const res = await this.pool.query(`
      SELECT * FROM chunks WHERE id = ANY($1)
    `, [ids]);
    
    const unorderMap = new Map(res.rows.map(r => [r.id, r]));
    return ids
      .map(id => unorderMap.get(id))
      .filter(r => Boolean(r))
      .map(r => ({
        snippet: r.content,
        path: r.file_path,
        startLine: r.start_line,
        endLine: r.end_line,
        score: 0,
        source: 'keyword' as const,
        contentSource: (r.source ?? 'memory') as 'memory' | 'sessions',
        updatedAt: Number(r.updated_at),
      }));
  }
}
