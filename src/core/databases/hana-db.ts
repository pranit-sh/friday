import { InsertChunkData, ExtractChunkData, FridayConfig } from '../../types';
import { BaseVectorDatabase } from '../interfaces/base-vector-database';
import hanaClient from '@sap/hana-client';

export class HanaDB implements BaseVectorDatabase {
  private hanaClient: hanaClient.Connection | null = null;

  /**
   * Initializes the HANA database connection.
   * @param hanaConfig Configuration for HANA connection.
   */
  public async init(hanaConfig: FridayConfig): Promise<void> {
    this.hanaClient = hanaClient.createConnection();
    const connParams = {
      serverNode: hanaConfig.hana_endpoint,
      uID: hanaConfig.hana_user,
      pwd: hanaConfig.hana_password,
    };

    await new Promise<void>((resolve, reject) => {
      this.hanaClient?.connect(connParams, (err: any) => {
        if (err) {
          this.hanaClient = null;
          console.error('Error connecting to HANA DB:', err);
          return reject(err);
        }
        resolve();
      });
    });

    const createTableSql = `
      DO BEGIN
      DECLARE table_exists INT;
      SELECT COUNT(*) INTO table_exists 
      FROM TABLES 
      WHERE TABLE_NAME = '${hanaConfig.project_id}';
      IF :table_exists = 0 THEN
        EXEC 'CREATE TABLE "${hanaConfig.project_id}" (
        "file_id" NVARCHAR(255),
        "page_content" NCLOB,
        "metadata" NCLOB,
        "vector" REAL_VECTOR(3072)
        )';
      END IF;
      END;
    `;

    const createMetaTableSql = `
      DO BEGIN
      DECLARE table_exists INT;
      SELECT COUNT(*) INTO table_exists 
      FROM TABLES 
      WHERE TABLE_NAME = '${hanaConfig.project_id}_meta';
      IF :table_exists = 0 THEN
        EXEC 'CREATE TABLE "${hanaConfig.project_id}_meta" (
        "file_id" NVARCHAR(255) PRIMARY KEY,
        "entries" INTEGER
        )';
      END IF;
      END;
    `;

    await this.executeStatement(createTableSql, []);
    await this.executeStatement(createMetaTableSql, []);
  }

  /**
   * Checks if the HANA client is active.
   */
  public isActive(): boolean {
    return this.hanaClient !== null;
  }

  /**
   * Retrieves ingested file IDs for a given project.
   * @param projectId The project ID.
   */
  public async getIngestedFiles(projectId: string): Promise<string[]> {
    if (!this.hanaClient) {
      throw new Error('Hana client is not initialized');
    }

    const sql = `SELECT "file_id" FROM "${projectId}_meta"`;
    const result = await this.executeQuery(sql);

    return result.map((row) => row.file_id);
  }

  /**
   * Inserts chunks into the database.
   * @param chunks Array of chunks to insert.
   * @param projectId The project ID.
   */
  public async insertChunks(chunks: InsertChunkData[], projectId: string): Promise<number> {
    if (!this.hanaClient) {
      throw new Error('Hana client is not initialized');
    }

    const sql = `INSERT INTO "${projectId}" ("file_id", "page_content", "metadata", "vector") VALUES (?, ?, ?, ?)`;

    let count = 0;
    const batchSize = 1000;

    for (const chunk of chunks) {
      await this.executeStatement(sql, [
        chunk.metadata.uniqueFileId,
        chunk.pageContent,
        JSON.stringify(chunk.metadata),
        chunk.vector,
      ]);
      count++;
      if (count % batchSize === 0) {
        await this.commitTransaction();
      }
    }

    await this.commitTransaction();
    return count;
  }

  /**
   * Saves file metadata.
   * @param fileId The file ID.
   * @param entries Number of entries.
   * @param projectId The project ID.
   */
  public async saveFileMeta(fileId: string, entries: number, projectId: string): Promise<void> {
    if (!this.hanaClient) {
      throw new Error('Hana client is not initialized');
    }

    const sql = `INSERT INTO "${projectId}_meta" ("file_id", "entries") VALUES (?, ?)`;

    await this.executeStatement(sql, [fileId, entries]);
  }

  /**
   * Deletes a file and its metadata from the database.
   * @param fileId The file ID.
   * @param projectId The project ID.
   */
  public async deleteFile(fileId: string, projectId: string): Promise<void> {
    if (!this.hanaClient) {
      throw new Error('Hana client is not initialized');
    }

    const deleteFileSql = `DELETE FROM "${projectId}" WHERE JSON_VALUE("metadata", '$.uniqueFileId') = ?`;
    const deleteMetaSql = `DELETE FROM "${projectId}_meta" WHERE "file_id" = ?`;

    await this.executeStatement(deleteFileSql, [fileId]);
    await this.executeStatement(deleteMetaSql, [fileId]);
  }

  /**
   * Performs a similarity search on the database.
   * @param projectId The project ID.
   * @param query The query vector.
   * @param score The similarity score threshold.
   * @param k The number of results to return.
   */
  public async similaritySearch(
    projectId: string,
    query: number[],
    score: number,
    k: number,
  ): Promise<ExtractChunkData[]> {
    if (!this.hanaClient) {
      throw new Error('Hana client is not initialized');
    }

    const sql = `SELECT TOP ? *, COSINE_SIMILARITY("vector", TO_REAL_VECTOR(?)) AS "similarity_score"
         FROM "${projectId}"
         WHERE COSINE_SIMILARITY("vector", TO_REAL_VECTOR(?)) > ?
         ORDER BY "similarity_score" DESC`;

    const result = await this.executeQuery(sql, [
      k,
      JSON.stringify(query),
      JSON.stringify(query),
      score,
    ]);

    return result.map((row) => ({
      score: row.similarity_score,
      pageContent: row.page_content,
      metadata: JSON.parse(row.metadata),
    }));
  }

  /**
   * Executes a prepared statement with the given parameters.
   * @param sql The SQL query.
   * @param params The query parameters.
   */
  private async executeStatement(sql: string, params: any[]): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      this.hanaClient?.prepare(sql, (err: any, statement: any) => {
        if (err) {
          return reject(err);
        }

        statement.exec(params, (err: any) => {
          if (err) {
            return reject(err);
          }
          resolve();
        });
      });
    });
  }

  /**
   * Executes a query and returns the result.
   * @param sql The SQL query.
   * @param params The query parameters.
   */
  private async executeQuery(sql: string, params: any[] = []): Promise<any[]> {
    return new Promise<any[]>((resolve, reject) => {
      this.hanaClient?.prepare(sql, (err: any, statement: any) => {
        if (err) {
          return reject(err);
        }

        statement.exec(params, (err: any, result: any) => {
          if (err) {
            return reject(err);
          }
          resolve(result);
        });
      });
    });
  }

  /**
   * Commits the current transaction.
   */
  private async commitTransaction(): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      this.hanaClient?.commit((err: any) => {
        if (err) {
          return reject(err);
        }
        resolve();
      });
    });
  }
}
