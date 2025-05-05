import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { getAnyExtractor } from 'any-extractor';
import { BaseLoader } from '../interfaces/base-loader';
import { cleanString } from '../util/strings';
import { BaseModel } from '../interfaces/base-model';
import { ImageParser } from './image-parser';

export class FileUrlLoader extends BaseLoader<{ type: 'FileUrlLoader' }> {
  private readonly fileUrl: string;
  private readonly authHeader?: string;
  private readonly img?: boolean;
  private readonly llm?: BaseModel;
  private readonly basicAuth?: string | null = null;

  constructor({
    fileUrl,
    authHeader,
    chunkOverlap,
    chunkSize,
    basicAuth,
    img,
    llm,
  }: {
    fileUrl: string;
    authHeader?: string;
    chunkSize?: number;
    chunkOverlap?: number;
    img?: boolean;
    basicAuth?: string;
    llm?: BaseModel;
  }) {
    super(fileUrl, {}, chunkSize ?? 1500, chunkOverlap ?? 200);
    this.fileUrl = fileUrl;
    this.authHeader = authHeader;
    this.img = img;
    this.llm = llm;
  }

  override async *getUnfilteredChunks() {
    const chunker = new RecursiveCharacterTextSplitter({
      chunkSize: this.chunkSize,
      chunkOverlap: this.chunkOverlap,
    });

    const anyExtractor = getAnyExtractor();
    if (this.img && this.llm) {
      anyExtractor.addParser(new ImageParser(this.llm));
    }

    const fileParsed = await anyExtractor.parseFile(this.fileUrl, this.basicAuth, {
      extractImages: Boolean(this.img),
      imageExtractionMethod: this.llm ? 'llm' : 'ocr',
      language: 'eng',
    });

    const chunks = await chunker.splitText(cleanString(fileParsed));
    for (const chunk of chunks) {
      yield {
        pageContent: chunk,
        metadata: {
          type: 'FileUrlLoader' as const,
          source: this.fileUrl,
        },
      };
    }
  }
}
