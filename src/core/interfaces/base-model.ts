import {
  ChatClientMessage,
  Chunk,
  Conversation,
  Message,
  ModelResponse,
  QueryResponse,
  SourceDetail,
} from '../../types.js';
import { ChatRequestTurn, ChatResponseTurn } from 'vscode';
import { MemoryStore } from '../store/memory-store.js';

export abstract class BaseModel {
  abstract initClient(): Promise<void>;

  public extractUniqueSources(supportingContext: Chunk[]): SourceDetail[] {
    const uniqueSources = new Map<string, SourceDetail>();
    supportingContext.forEach((item) => {
      const { metadata } = item;
      if (metadata && metadata.source) {
        if (!uniqueSources.has(metadata.source)) {
          uniqueSources.set(metadata.source, {
            source: metadata.source,
            uniqueFileId: metadata.uniqueFileId,
          });
        }
      }
    });
    return Array.from(uniqueSources.values());
  }

  public async prepare(
    system: string,
    userQuery: string,
    history: readonly (ChatRequestTurn | ChatResponseTurn)[],
    store: MemoryStore | null,
  ): Promise<ChatClientMessage[]> {
    const messages = [
      {
        role: 'system',
        content: system,
      },
      {
        role: 'system',
        content: `Supporting context: ${store
          ?.getContext()
          .map((s) => s.pageContent)
          .join('; ')}`,
      },
    ] as ChatClientMessage[];
    history.forEach((message) => {
      if (message instanceof ChatRequestTurn) {
        messages.push({
          role: 'user',
          content: message.prompt,
        });
      }
      if (message instanceof ChatResponseTurn) {
        messages.push({
          role: 'assistant',
          content: message.response.toString(),
        });
      }
    });
    messages.push({
      role: 'user',
      content: userQuery,
    });
    return messages;
  }

  public async updateIntent(userQuery: string, store: MemoryStore): Promise<boolean> {
    const systemMessage = `
      You are an AI assistant that maintains and updates the user's intent for a retrieval-augmented generation (RAG) system.
      The user is working on a software or technical project in a development environment, and the documents they have ingested relate specifically to their project (e.g., code files, design specs, documentation, issues).
      Your task is to analyze the user's query and determine:
      If retrieval is needed (needRetrieval: true) → When the intent changes or requires new information.
      If retrieval is NOT needed (needRetrieval: false) → When the user is asking for clarification, elaboration, or making general, conversational, or meta requests (e.g., jokes, questions about you, or instructions unrelated to the project content).

      Rules:
      Do not summarize, simplify, or rephrase the intent.
      If the query is vague (e.g., "tell me more," "explain again"), keep the previous intent unchanged and set needRetrieval: false.
      If the query introduces new intent, update it and set needRetrieval: true.
      Do not add explanations, comments, or any extra text—only return a valid JSON object.
      The JSON must be properly formatted and parsable with two keys:
        "needRetrieval" → A boolean (true or false).
        "intent" → A string containing the intent (which must stay unchanged unless the user asks something new).

      Examples:
      Example 1 (New Query, Needs Retrieval)
      User Query: "What is quantum entanglement?"
      Output:
      {  
        "needRetrieval": true,  
        "intent": "What is quantum entanglement?"  
      }
      Example 2 (Clarification, No Retrieval Needed)
      User Query: "I don't get it. Can you explain further?"
      Previous Intent: "What is quantum entanglement?"
      Output:
      {  
        "needRetrieval": false,  
        "intent": "What is quantum entanglement?"  
      }
      Example 3 (Elaboration, No Retrieval Needed)
      User Query: "Give me an example."
      Previous Intent: "What is quantum entanglement?"
      Output:
      {  
        "needRetrieval": false,  
        "intent": "What is quantum entanglement?"  
      }
      Example 4 (New Topic, Needs Retrieval)
      User Query: "How does quantum entanglement relate to teleportation?"
      Previous Intent: "What is quantum entanglement?"
      Output:
      {  
        "needRetrieval": true,  
        "intent": "How does quantum entanglement relate to teleportation?"  
      }
    `;
    const userMessage = `
      User Query: "${userQuery}"
      Previous Intent: "${store.getIntent()}"
    `;

    const messages = [
      {
        role: 'system',
        content: systemMessage,
      },
      {
        role: 'user',
        content: userMessage,
      },
    ] as ChatClientMessage[];
    const response = await this.runQuery(messages);
    const jsonResponse = JSON.parse(response);
    store.setIntent(jsonResponse.intent);
    return jsonResponse.needRetrieval;
  }

  abstract runQuery(messages: ChatClientMessage[]): Promise<any>;

  abstract runQueryStream(messages: ChatClientMessage[]): Promise<any>;
}
