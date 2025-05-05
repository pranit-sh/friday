import { AnyParserMethod } from 'any-extractor';
import { BaseModel } from '../interfaces/base-model';

export class ImageParser implements AnyParserMethod {
  mimes = ['image/jpeg', 'image/png', 'image/webp'];

  private readonly llm: BaseModel;
  constructor(llm: BaseModel) {
    this.llm = llm;
  }

  apply = async (buffer: Buffer): Promise<string> => {
    const { parse } = await import('file-type-mime');
    const mimeDetails = parse(
      buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer,
    );
    if (!mimeDetails) {
      return '';
    }
    const mimeType = mimeDetails.mime;
    if (!this.mimes.includes(mimeType)) {
      return '';
    }

    const response = await this.llm.runQuery([
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Provide a concise summary of the image for semantic search. Exclude any introductions, labels, or formatting — just return the core content. Also include visible text and contextual details about layout, content type, or purpose.',
          },
          {
            type: 'image_url',
            image_url: {
              url: `data:${mimeType};base64,${buffer.toString('base64')}`,
            },
          },
        ],
      },
    ]);
    return response;
  };
}
