import { ExtractChunkData, FridayConfig, InsertChunkData } from "../../types";

export interface BaseVectorDatabase {
    isActive(): boolean;
    getIngestedFiles(project_id: string): Promise<string[]>;
    insertChunks(chunks: InsertChunkData[], project_id: string): Promise<number>;
    saveFileMeta(fileId: string, entries: number, projectId: string): Promise<void>;
    deleteFile(fileId: string, project_id: string): Promise<void>;
    similaritySearch(project_id: string, query: number[], score: number, k: number): Promise<ExtractChunkData[]>;
}
