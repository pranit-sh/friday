import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { BaseLoader } from '../interfaces/base-loader';
import { cleanString } from '../util/strings';
import path from 'path';

var reader = require('any-text');

export class AnytextLoader extends BaseLoader<{ type: 'AnytextLoader' }> {
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
    super(`${path.basename(filePath)}`, { filePath }, chunkSize ?? 1500, chunkOverlap ?? 200);

    this.filePath = filePath;
  }

  override async *getUnfilteredChunks() {
    const chunker = new RecursiveCharacterTextSplitter({
      chunkSize: this.chunkSize,
      chunkOverlap: this.chunkOverlap,
    });

    const fileParsed = await reader.getText(this.filePath);

    const chunks = await chunker.splitText(cleanString(fileParsed));
    for (const chunk of chunks) {
      yield {
        pageContent: chunk,
        metadata: {
          type: 'AnytextLoader' as const,
          source: path.basename(this.filePath),
        },
      };
    }
  }
}
