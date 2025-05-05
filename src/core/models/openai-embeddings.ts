import { SIMPLE_EMBEDDINGS } from '../../constants';
import { BaseEmbeddings } from '../interfaces/base-embeddings';

export class OpenAiEmbeddings extends BaseEmbeddings {
  private embeddingClient: any;
  private readonly embeddingModel: SIMPLE_EMBEDDINGS;

  constructor(embeddingModel: SIMPLE_EMBEDDINGS) {
    super();
    this.embeddingModel = embeddingModel;
  }

  public async initClient(): Promise<void> {
    if (!this.embeddingClient) {
      const module = await import('@sap-ai-sdk/foundation-models');
      switch (this.embeddingModel) {
        case SIMPLE_EMBEDDINGS.TEXT_EMBEDDING_3_LARGE:
          this.embeddingClient = new module.AzureOpenAiEmbeddingClient('text-embedding-3-large');
          break;
        default:
          throw new Error(`Unsupported embedding model: ${this.embeddingModel}`);
      }
    }
  }

  public isReady(): boolean {
    return !!this.embeddingClient;
  }

  override async getDimensions(): Promise<number> {
    return 1536;
  }

  override async embedDocuments(texts: string[]): Promise<number[][]> {
    if (!this.embeddingClient) {
      throw new Error('Embedding client is not initialized');
    }
    const response = await this.embeddingClient.run({ input: texts });
    const embeddings = response.getEmbeddings();
    return embeddings ?? [];
  }

  override async embedQuery(text: string): Promise<number[]> {
    if (!this.embeddingClient) {
      throw new Error('Embedding client is not initialized');
    }
    const response = await this.embeddingClient.run({ input: text });
    const embeddings = response.getEmbedding();
    return embeddings ?? [];
  }
}
