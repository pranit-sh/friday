import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { getAnyExtractor } from 'any-extractor';
import { BaseLoader } from '../interfaces/base-loader';
import { cleanString } from '../util/strings';

export class FileUrlLoader extends BaseLoader<{ type: 'FileUrlLoader' }> {
  private readonly fileUrl: string;
  private readonly authHeader?: string;

  constructor({
    fileUrl,
    authHeader,
    chunkOverlap,
    chunkSize,
  }: {
    fileUrl: string;
    authHeader?: string;
    chunkSize?: number;
    chunkOverlap?: number;
  }) {
    super(fileUrl, {}, chunkSize ?? 1500, chunkOverlap ?? 200);
    this.fileUrl = fileUrl;
    this.authHeader = authHeader;
  }

  override async *getUnfilteredChunks() {
    const chunker = new RecursiveCharacterTextSplitter({
      chunkSize: this.chunkSize,
      chunkOverlap: this.chunkOverlap,
    });

    const anyExtractor = getAnyExtractor();
    const fileParsed = await anyExtractor.parseFile(this.fileUrl, this.authHeader);

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
