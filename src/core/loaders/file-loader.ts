import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { getAnyExtractor } from 'any-extractor';
import { BaseLoader } from '../interfaces/base-loader';
import { cleanString } from '../util/strings';
import path from 'path';
import { BaseModel } from '../interfaces/base-model';
import { ImageParser } from './image-parser';

export class FileLoader extends BaseLoader<{ type: 'FileLoader' }> {
  private readonly filePath: string;
  private readonly img?: boolean;
  private readonly llm?: BaseModel;

  constructor({
    filePath,
    chunkOverlap,
    chunkSize,
    img,
    llm,
  }: {
    filePath: string;
    chunkSize?: number;
    chunkOverlap?: number;
    img?: boolean;
    llm?: BaseModel;
  }) {
    const fileName = path.basename(filePath);
    super(fileName, {}, chunkSize ?? 1500, chunkOverlap ?? 200);

    this.filePath = filePath;
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

    const fileParsed = await anyExtractor.parseFile(this.filePath, null, {
      extractImages: Boolean(this.img),
      imageExtractionMethod: this.llm ? 'llm' : 'ocr',
      language: 'eng',
    });

    const chunks = await chunker.splitText(cleanString(fileParsed));
    for (const chunk of chunks) {
      yield {
        pageContent: chunk,
        metadata: {
          type: 'FileLoader' as const,
          source: path.basename(this.filePath),
        },
      };
    }
  }
  pageId(
    pageId: any,
    arg1: { extractImages: boolean; imageExtractionMethod: string; language: string },
  ) {
    throw new Error('Method not implemented.');
  }
}
