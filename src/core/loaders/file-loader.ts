import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { getAnyExtractor } from 'any-extractor';
import { BaseLoader } from '../interfaces/base-loader';
import { cleanString } from '../util/strings';
import path from 'path';

export class FileLoader extends BaseLoader<{ type: 'FileLoader' }> {
  private readonly filePath: string;
  constructor({
    filePath,
    chunkOverlap,
    chunkSize,
  }: {
    filePath: string;
    chunkSize?: number;
    chunkOverlap?: number;
  }) {
    const fileName = path.basename(filePath);
    super(fileName, {}, chunkSize ?? 1500, chunkOverlap ?? 200);

    this.filePath = filePath;
  }

  override async *getUnfilteredChunks() {
    const chunker = new RecursiveCharacterTextSplitter({
      chunkSize: this.chunkSize,
      chunkOverlap: this.chunkOverlap,
    });

    const anyExtractor = getAnyExtractor();
    const fileParsed = await anyExtractor.parseFile(this.filePath);

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
}
