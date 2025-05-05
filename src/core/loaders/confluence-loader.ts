import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { getAnyExtractor } from 'any-extractor';
import { BaseLoader } from '../interfaces/base-loader';
import { cleanString } from '../util/strings';

export class ConfluencePageLoader extends BaseLoader<{ type: 'ConfluencePageLoader' }> {
  private readonly pageId: string;
  private readonly baseUrl: string;
  private readonly user: string;
  private readonly apiKey: string;

  constructor({
    pageId,
    baseUrl,
    user,
    apiKey,
    chunkOverlap,
    chunkSize,
  }: {
    pageId: string;
    baseUrl: string;
    user: string;
    apiKey: string;
    chunkSize?: number;
    chunkOverlap?: number;
  }) {
    super(pageId, {}, chunkSize ?? 1500, chunkOverlap ?? 200);
    this.pageId = pageId;
    this.baseUrl = baseUrl;
    this.user = user;
    this.apiKey = apiKey;
  }

  override async *getUnfilteredChunks() {
    const chunker = new RecursiveCharacterTextSplitter({
      chunkSize: this.chunkSize,
      chunkOverlap: this.chunkOverlap,
    });

    const anyExtractor = getAnyExtractor({
      confluence: {
        baseUrl: this.baseUrl,
        email: this.user,
        apiKey: this.apiKey,
      },
    });
    const fileParsed = await anyExtractor.parseConfluenceDoc(this.pageId);

    const chunks = await chunker.splitText(cleanString(fileParsed));
    for (const chunk of chunks) {
      yield {
        pageContent: chunk,
        metadata: {
          type: 'ConfluencePageLoader' as const,
          source: this.pageId,
        },
      };
    }
  }
}
