export abstract class BaseEmbeddings {
  public abstract initClient(): Promise<void>;

  public abstract embedDocuments(texts: string[]): Promise<number[][]>;
  public abstract embedQuery(text: string): Promise<number[]>;
  public abstract getDimensions(): Promise<number>;
}
