import { HanaDB } from '../databases/hana-db.js';
import { BaseEmbeddings } from '../interfaces/base-embeddings.js';
import { BaseModel } from '../interfaces/base-model.js';
import { MemoryStore } from '../store/memory-store.js';
import { RAGApplication } from './rag-application.js';

export class RAGApplicationBuilder {
  private model: BaseModel | null;
  private temperature: number;
  private systemMessage: string;
  private embeddingModel: BaseEmbeddings | null;
  private searchResultCount: number;
  private embeddingRelevanceCutOff: number;
  private vectorDatabase: HanaDB | null;
  private store: MemoryStore | null;

  constructor() {
    this.model = null;
    this.temperature = 0.1;
    this.systemMessage = `You are Friday, a helpful and intelligent assistant designed to assist with user queries. Use the provided context to answer the user's queries accurately and comprehensively.
      If you don't know the answer, simply state that you don't know, without attempting to fabricate a response. Avoid using terms like "context" or "training data" in your replies. Instead, focus on providing clear and reliable information.
      Respond in a friendly, confident, and professional tone.`;
    this.embeddingModel = null;
    this.searchResultCount = 3;
    this.embeddingRelevanceCutOff = 0.4;
    this.vectorDatabase = null;
    this.store = null;
  }

  async build() {
    return new RAGApplication(this);
  }

  setModel(model: BaseModel) {
    this.model = model;
    return this;
  }

  getModel() {
    return this.model;
  }

  setTemperature(temperature: number) {
    this.temperature = temperature;
    return this;
  }

  getTemperature() {
    return this.temperature;
  }

  setSystemMessage(systemMessage: string) {
    this.systemMessage = systemMessage;
    return this;
  }

  getSystemMessage() {
    return this.systemMessage;
  }

  setEmbeddingModel(embeddingModel: BaseEmbeddings) {
    this.embeddingModel = embeddingModel;
    return this;
  }

  getEmbeddingModel() {
    return this.embeddingModel;
  }

  setSearchResultCount(searchResultCount: number) {
    this.searchResultCount = searchResultCount;
    return this;
  }

  getSearchResultCount() {
    return this.searchResultCount;
  }

  setEmbeddingRelevanceCutOff(embeddingRelevanceCutOff: number) {
    this.embeddingRelevanceCutOff = embeddingRelevanceCutOff;
    return this;
  }

  getEmbeddingRelevanceCutOff() {
    return this.embeddingRelevanceCutOff;
  }

  setVectorDatabase(vectorDatabase: HanaDB) {
    this.vectorDatabase = vectorDatabase;
    return this;
  }

  getVectorDatabase() {
    return this.vectorDatabase;
  }

  setStore(store: MemoryStore) {
    this.store = store;
    return this;
  }

  getStore() {
    return this.store;
  }
}
