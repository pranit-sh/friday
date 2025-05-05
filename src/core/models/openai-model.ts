import { SIMPLE_MODELS } from '../../constants';
import { ChatClientMessage, ModelResponse } from '../../types';
import { BaseModel } from '../interfaces/base-model';

export class OpenAiModel extends BaseModel {
  private chatClient: any;
  private readonly model: SIMPLE_MODELS;

  constructor(model: SIMPLE_MODELS) {
    super();
    this.model = model;
  }

  async initClient(): Promise<void> {
    if (!this.chatClient) {
      const module = await import('@sap-ai-sdk/foundation-models');
      switch (this.model) {
        case SIMPLE_MODELS.OPENAI_GPT4_O:
          this.chatClient = new module.AzureOpenAiChatClient('gpt-4o');
          break;
        default:
          throw new Error(`Unsupported model: ${this.model}`);
      }
    }
  }

  async runQuery(messages: ChatClientMessage[]) {
    const response = await this.chatClient.run({
      messages: messages,
    });
    return response.getContent();
  }

  async runQueryJson(messages: ChatClientMessage[]) {
    const response = await this.chatClient.run({
      messages: messages,
      response_format: {
        type: 'json_object',
      },
    });
    return response.getContent();
  }

  async runQueryStream(messages: ChatClientMessage[]) {
    const response = await this.chatClient.stream({
      messages: messages,
    });
    return response;
  }
}
