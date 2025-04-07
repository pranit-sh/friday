import { BaseEmbeddings } from '../interfaces/base-embeddings';
import { Chunk, LoaderChunk, SourceDetail } from '../../types';
import { BaseModel } from '../interfaces/base-model';
import { RAGApplicationBuilder } from './rag-application-builder';
import { DEFAULT_INSERT_BATCH_SIZE } from '../../constants';
import { cleanString } from '../util/strings';
import { MemoryStore } from '../store/memory-store';
import { ChatRequestTurn, ChatResponseTurn, Uri } from 'vscode';
import { AnytextLoader } from '../loaders/anytext-loader';
import { HanaDB } from '../databases/hana-db';

export class RAGApplication {
  private readonly systemMessage: string;
  private readonly embeddingRelevanceCutOff: number;
  private readonly searchResultCount: number;
  private readonly model: BaseModel;
  private readonly embeddingModel: BaseEmbeddings;
  private readonly vectorDatabase: HanaDB;
  private readonly store: MemoryStore;

  constructor(builder: RAGApplicationBuilder) {
    this.systemMessage = cleanString(builder.getSystemMessage());
    this.embeddingRelevanceCutOff = builder.getEmbeddingRelevanceCutOff();
    this.searchResultCount = builder.getSearchResultCount();

    this.model = builder.getModel() ?? this.throwError('LLM must be set!');
    this.embeddingModel = builder.getEmbeddingModel() ?? this.throwError('Embeddings must be set!');
    this.vectorDatabase = builder.getVectorDatabase() ?? this.throwError('Vector database must be set!');
    this.store = builder.getStore() ?? this.throwError('Store must be set!');
  }

  private throwError(message: string): never {
    throw new Error(message);
  }

  public async getIngestedFiles(): Promise<string[]> {
    const projectId = this.getProjectId();
    return this.vectorDatabase.getIngestedFiles(projectId);
  }

  public async ingestFile(uri: Uri): Promise<void> {
    const extension = uri.fsPath.split('.').pop();
    if (!extension) return;

    const supportedExtensions = ['doc', 'docx', 'dot', 'pdf', 'csv', 'txt', 'xls', 'xlsx', 'json'];
    if (!supportedExtensions.includes(extension)) return;

    const loader = new AnytextLoader({ filePath: uri.fsPath });
    const uniqueFileId = loader.getUniqueId();
    const chunks = await loader.getChunks();
    const entries = await this.batchLoadChunks(uniqueFileId, chunks);
    await this.saveFileMeta(uniqueFileId, entries);
  }

  private async batchLoadChunks(uniqueFileId: string, generator: AsyncGenerator<LoaderChunk, void, void>): Promise<number> {
    let batchSize = 0;
    let entries = 0;
    let formattedChunks: Chunk[] = [];

    for await (const chunk of generator) {
      batchSize++;
      formattedChunks.push({
        pageContent: chunk.pageContent,
        metadata: { ...chunk.metadata, uniqueFileId },
      });

      if (batchSize % DEFAULT_INSERT_BATCH_SIZE === 0) {
        entries += await this.saveEmbeddingsToDb(formattedChunks);
        formattedChunks = [];
        batchSize = 0;
      }
    }

    if (formattedChunks.length > 0) {
      entries += await this.saveEmbeddingsToDb(formattedChunks);
    }

    return entries;
  }

  private async saveEmbeddingsToDb(chunks: Chunk[]): Promise<number> {
    const projectId = this.getProjectId();
    const embeddings = await this.embeddingModel.embedDocuments(chunks.map(chunk => chunk.pageContent));
    await this.vectorDatabase.insertChunks(
      chunks.map((chunk, i) => ({ ...chunk, vector: embeddings[i] })),
      projectId
    );
    return chunks.length;
  }

  public async saveFileMeta(uniqueFileId: string, entries: number): Promise<void> {
    const projectId = this.getProjectId();
    await this.vectorDatabase.saveFileMeta(uniqueFileId, entries, projectId);
  }

  public async deleteFile(fileName: string): Promise<void> {
    const projectId = this.getProjectId();
    await this.vectorDatabase.deleteFile(fileName, projectId);
  }

  public async query(userQuery: string, history: readonly (ChatRequestTurn | ChatResponseTurn)[]): Promise<any> {
    const needRetrieval = await this.model.updateIntent(userQuery, this.store);
    if (needRetrieval) {
      await this.updateContext();
    }

    const messages = await this.model.prepare(this.systemMessage, userQuery, history, this.store);
    const response =  await this.model.runQueryStream(messages);
    return  {
      response,
      sources: needRetrieval ? this.getSources() : [],
    }
  }

  private async updateContext(): Promise<void> {
    const intent = this.store.getIntent() ?? '';
    const embeddings = await this.embeddingModel.embedQuery(intent);
    const projectId = this.getProjectId();

    const extractedChunks = await this.vectorDatabase.similaritySearch(
      projectId,
      embeddings,
      this.embeddingRelevanceCutOff,
      this.searchResultCount
    );

    const chunks = extractedChunks.map(chunk => ({
      pageContent: chunk.pageContent,
      metadata: chunk.metadata,
    }));

    this.store.setContext(chunks);
  }

  private getProjectId(): string {
    const projectId = this.store.getConfig()?.project_id;
    if (!projectId) {
      throw new Error('Project ID is not set in the store');
    }
    return projectId;
  }

  public getSources(): SourceDetail[] {
    const context = this.store.getContext();
    return this.model.extractUniqueSources(context);
  }
}
