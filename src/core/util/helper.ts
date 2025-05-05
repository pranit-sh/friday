import { ChatResult } from 'vscode';
import { SIMPLE_MODELS, SIMPLE_EMBEDDINGS } from '../../constants';
import { HanaDB } from '../databases/hana-db';
import { OpenAiEmbeddings } from '../models/openai-embeddings';
import { OpenAiModel } from '../models/openai-model';
import { RAGApplicationBuilder } from '../services/rag-application-builder';
import { MemoryStore } from '../store/memory-store';

export async function createFridayServices() {
  const store = new MemoryStore();
  const db = new HanaDB();

  const llm = new OpenAiModel(SIMPLE_MODELS.OPENAI_GPT4_O);
  await llm.initClient();

  const embeddingModel = new OpenAiEmbeddings(SIMPLE_EMBEDDINGS.TEXT_EMBEDDING_3_LARGE);
  await embeddingModel.initClient();

  const ragApplication = await new RAGApplicationBuilder()
    .setModel(llm)
    .setEmbeddingModel(embeddingModel)
    .setVectorDatabase(db)
    .setStore(store)
    .build();

  return { store, db, llm, embeddingModel, ragApplication };
}

export function createMetadata(
  label: string = '',
  command: string = '',
  prompt: string = '',
): ChatResult {
  return {
    metadata: {
      label,
      prompt,
      command,
      followup: command !== '',
    },
  };
}
