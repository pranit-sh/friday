import { HanaDB, HanaDBArgs } from "@langchain/community/vectorstores/hanavector";
import { DEFAULT_INSERT_BATCH_SIZE } from "../../constants";
import { OpenAiEmbeddings } from "../models/openai-embeddings";
import { Chunk, FridayConfig, LoaderChunk } from "../../types";
import { Uri } from "vscode";
import { AnytextLoader } from '../loaders/anytext-loader';
import { BaseLoader } from '../interfaces/base-loader';
import hanaClient from "@sap/hana-client";

export class HanaService {
  private openAiEmbeddings: OpenAiEmbeddings;
  private hanaClient: hanaClient.Connection | null = null;
  private projVectorStore: HanaDB | null = null;

  constructor() {
    this.openAiEmbeddings = new OpenAiEmbeddings();
  }

  public async init(hanaConfig: FridayConfig | null) {
    await this.openAiEmbeddings.initClient();
    if (hanaConfig) {
      this.hanaClient = hanaClient.createConnection();
      var conn_params = {
        serverNode: hanaConfig.hana_endpoint,
        uID: hanaConfig.hana_user,
        pwd: hanaConfig.hana_password,
      };
      await new Promise<void>((resolve, reject) => {
        this.hanaClient?.connect(conn_params, (err: any) => {
          if (err) {
            this.hanaClient = null;
            this.projVectorStore = null;
            reject(err);
          }
          resolve();
        });
      });
      const args: HanaDBArgs = {
        connection: this.hanaClient,
        tableName: hanaConfig.project_id,
      };
      this.projVectorStore = new HanaDB(this.openAiEmbeddings, args);
      await this.projVectorStore.initialize();
      await this.createMetaTableIfNotExist(`${hanaConfig.project_id}_meta`);
    } else {
      this.hanaClient = null;
      this.projVectorStore = null;
    }
  }

  public async isServiceReady() {
    return this.hanaClient !== null && this.openAiEmbeddings.isReady() && this.projVectorStore !== null;
  }

  public async ingest(uri: Uri, hanaConfig: FridayConfig) {
    let loader: BaseLoader;
    const extension = uri.fsPath.split('.').pop();
    switch (extension) {
      case 'doc':
      case 'docx':
      case 'dot':
      case 'pdf':
      case 'csv':
      case 'txt':
      case 'xls':
      case 'xlsx':
      case 'json':
        loader = new AnytextLoader({ filePath: uri.fsPath });
        break;
      default:
        return;
    }

    const uniqueFileId = loader.getUniqueId();
    const chunks = await loader.getChunks();
    const entries = await this.batchLoadChunks(uniqueFileId, chunks, hanaConfig);
    await this.saveFileMeta(uniqueFileId, entries, `${hanaConfig.project_id}_meta`);
  }

  private async batchLoadChunks(uniqueFileId: string, generator: AsyncGenerator<LoaderChunk, void, void>, config: FridayConfig) {
    let i = 0,
      batchSize = 0,
      entries = 0,
      formattedChunks: Chunk[] = [];

    for await (const chunk of generator) {
      batchSize++;

      const formattedChunk = {
        pageContent: chunk.pageContent,
        metadata: {
          ...chunk.metadata,
          uniqueFileId: uniqueFileId,
        },
      };
      formattedChunks.push(formattedChunk);

      if (batchSize % DEFAULT_INSERT_BATCH_SIZE === 0) {
        entries += await this.saveEmbeddingsToDb(formattedChunks);
        formattedChunks = [];
        batchSize = 0;
      }
    }
    entries += await this.saveEmbeddingsToDb(formattedChunks);
    return entries;
  }

  private async saveEmbeddingsToDb(chunks: Chunk[]) {
    if (!this.projVectorStore) {
      throw new Error('Vector store is not initialized');
    }
    await this.projVectorStore.addDocuments(chunks);
    return chunks.length;
  }

  private async createMetaTableIfNotExist(tableName: string) {
    if (!this.hanaClient) {
      throw new Error('Hana client is not initialized');
    }
    const sql1 = `select * from sys.objects where schema_name = 'DBADMIN' and object_name='${tableName}'`;
    const result = await new Promise<any[]>((resolve, reject) => {
      this.hanaClient?.exec(sql1, (err: any, result: any) => {
        if (err) {
          reject(err);
        }
        resolve(result);
      });
    });
    if (result.length > 0) {
      return;
    }
    const sql = `
      CREATE TABLE "${tableName}" (
        file_id NVARCHAR(255) PRIMARY KEY,
        num_entries INTEGER
      )
    `;
    await new Promise<void>((resolve, reject) => {
      this.hanaClient?.exec(sql, (err: any) => {
        if (err) {
          reject(err);
        }
        resolve();
      });
    });
  }

  private async saveFileMeta(uniqueFileId: string, entries: number, tableName: string) {
    if (!this.hanaClient) {
      throw new Error('Hana client is not initialized');
    }
    const sql = `
      INSERT INTO ${tableName} VALUES ('${uniqueFileId}', ${entries})
    `;
    await new Promise<void>((resolve, reject) => {
      this.hanaClient?.exec(sql, (err: any) => {
        if (err) {
          reject(err);
        }
        resolve();
      });
    });
  }

  public async deleteFile(uniqueFileId: string, project_id: string) {
    if (!this.hanaClient) {
      throw new Error('Hana client is not initialized');
    }
    const sql = `delete from "${project_id}_meta" where file_id = '${uniqueFileId}'`;
    await new Promise<void>((resolve, reject) => {
      this.hanaClient?.exec(sql, (err: any) => {
        if (err) {
          reject(err);
        }
        resolve();
      });
    });
    if (!this.projVectorStore) {
      throw new Error('Vector store is not initialized');
    }
    await this.projVectorStore.delete({ filter: { uniqueFileId: uniqueFileId } });
  }

  public async doesFileExist(uniqueFileId: string, project_id: string) {
    if (!this.hanaClient) {
      throw new Error('Hana client is not initialized');
    }
    const sql = `select * from "${project_id}_meta" where file_id = '${uniqueFileId}'`;
    const result = await new Promise<any[]>((resolve, reject) => {
      this.hanaClient?.exec(sql, (err: any, result: any) => {
        if (err) {
          reject(err);
        }
        resolve(result);
      });
    });
    return result.length > 0;
  }

  public async getIngestedFiles(project_id: string) {
    if (!this.hanaClient) {
      throw new Error('Hana client is not initialized');
    }
    const sql = `select file_id from "${project_id}_meta"`;
    const result = await new Promise<any[]>((resolve, reject) => {
      this.hanaClient?.exec(sql, (err: any, result: any) => {
        if (err) {
          reject(err);
        }
        resolve(result);
      });
    });
    return result.map((row) => row.file_id);
  }

  public async getSimilarDocs(query: string) {
    if (!this.projVectorStore) {
      throw new Error('Vector store is not initialized');
    }
    const results = await this.projVectorStore.similaritySearchWithScore(query, 4) ?? [];
    const similarDocs = results.filter((result) => result[1] > 0.7);
    return similarDocs.map((result) => result[0]);
  }

}
