export type EmbeddingProviderId = 'openai' | 'gemini' | 'ollama' | 'auto' | 'none';

export type ContentSource = 'memory' | 'sessions';

export type TemporalDecayConfig = {
  enabled: boolean;
  halfLifeDays: number;
};

export type MMRConfig = {
  enabled: boolean;
  lambda: number;
};

export interface MemoryRuntimeConfig {
  enabled: boolean;
  embeddingProvider: EmbeddingProviderId;
  embeddingModel?: string;
  maxSessionContextTokens: number;
  chunkTokens: number;
  chunkOverlapTokens: number;
  maxResults: number;
  minScore: number;
  vectorWeight: number;
  textWeight: number;
  watchDebounceMs: number;
  temporalDecay: TemporalDecayConfig;
  mmr: MMRConfig;
  indexSessions: boolean;
}

export interface MemoryChunk {
  id?: number;
  filePath: string;
  startLine: number;
  endLine: number;
  content: string;
  contentHash: string;
  source?: ContentSource;
}

export interface MemoryVectorCandidate {
  chunkId: number;
  score: number;
}

export interface MemoryKeywordCandidate {
  chunkId: number;
  score: number;
}

export interface MemorySearchResult {
  snippet: string;
  path: string;
  startLine: number;
  endLine: number;
  score: number;
  source: 'vector' | 'keyword' | 'both';
  contentSource?: ContentSource;
  updatedAt?: number;
}

export interface MemorySearchOptions {
  maxResults?: number;
  minScore?: number;
}

export interface MemoryReadOptions {
  path: string;
  from?: number;
  lines?: number;
}

export interface MemoryReadResult {
  path: string;
  text: string;
}

export interface MemorySessionContext {
  filesLoaded: string[];
  text: string;
  tokenEstimate: number;
}

export interface MemorySyncStats {
  indexedFiles: number;
  indexedChunks: number;
  updatedChunks: number;
  removedChunks: number;
}

export interface MemoryEmbeddingClient {
  provider: Exclude<EmbeddingProviderId, 'auto' | 'none'>;
  model: string;
  dimensions?: number;
  embed(texts: string[]): Promise<number[][]>;
}

export interface MemoryChunkRow {
  id: number;
  file_path: string;
  start_line: number;
  end_line: number;
  content: string;
  content_hash: string;
  embedding: any | null;
  source: string;
  updated_at: number;
}

export interface IMemoryDatabase {
  close(): Promise<void> | void;
  getProviderFingerprint(): Promise<string | null> | string | null;
  setProviderFingerprint(value: string): Promise<void> | void;
  clearEmbeddings(): Promise<void> | void;
  getCachedEmbedding(contentHash: string): Promise<number[] | null> | number[] | null;
  setCachedEmbedding(params: {
    contentHash: string;
    embedding: number[];
    provider: string;
    model: string;
  }): Promise<void> | void;
  getChunkByHash(contentHash: string): Promise<MemoryChunkRow | null> | MemoryChunkRow | null;
  upsertChunk(params: {
    chunk: MemoryChunk;
    embedding: number[] | null;
    provider?: string;
    model?: string;
    source?: string;
  }): Promise<{ id: number; inserted: boolean }> | { id: number; inserted: boolean };
  deleteChunksForFile(filePath: string): Promise<number> | number;
  listIndexedFiles(): Promise<string[]> | string[];
  listAllChunks(): Promise<MemoryChunkRow[]> | MemoryChunkRow[];
  searchVector(queryEmbedding: number[], maxResults: number): Promise<MemoryVectorCandidate[]> | MemoryVectorCandidate[];
  searchKeyword(query: string, maxResults: number): Promise<MemoryKeywordCandidate[]> | MemoryKeywordCandidate[];
  loadResultsByIds(ids: number[]): Promise<MemorySearchResult[]> | MemorySearchResult[];
}
