import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { getAnyExtractor } from 'any-extractor';
import { BaseLoader } from '../interfaces/base-loader';
import { cleanString } from '../util/strings';
import { ImageParser } from './image-parser';
import { BaseModel } from '../interfaces/base-model';

export class ConfluencePageLoader extends BaseLoader<{ type: 'ConfluencePageLoader' }> {
  private readonly pageId: string;
  private readonly baseUrl: string;
  private readonly user: string;
  private readonly apiKey: string;
  private readonly attachments?: boolean;
  private readonly img?: boolean;
  private readonly llm?: BaseModel;

  constructor({
    pageId,
    baseUrl,
    user,
    apiKey,
    chunkOverlap,
    chunkSize,
    attachments,
    img,
    llm,
  }: {
    pageId: string;
    baseUrl: string;
    user: string;
    apiKey: string;
    chunkSize?: number;
    chunkOverlap?: number;
    img?: boolean;
    attachments?: boolean;
    llm?: BaseModel;
  }) {
    super(pageId, {}, chunkSize ?? 1500, chunkOverlap ?? 200);
    this.pageId = pageId;
    this.baseUrl = baseUrl;
    this.user = user;
    this.apiKey = apiKey;
    this.attachments = attachments;
    this.img = img;
    this.llm = llm;
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

    if (this.img && this.llm) {
      anyExtractor.addParser(new ImageParser(this.llm));
    }

    const fileParsed = await anyExtractor.parseConfluenceDoc(this.pageId, {
      extractAttachments: Boolean(this.attachments),
      extractImages: Boolean(this.img),
      imageExtractionMethod: this.llm ? 'llm' : 'ocr',
      language: 'eng',
    });

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
