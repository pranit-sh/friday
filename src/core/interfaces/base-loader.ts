import { EventEmitter } from 'node:events';
import { LoaderChunk, UnfilteredLoaderChunk } from '../../types';


export abstract class BaseLoader<
    MetadataTemplate extends Record<string, string | number | boolean> = Record<string, string | number | boolean>
> extends EventEmitter {

    protected readonly uniqueId: string;
    protected readonly chunkSize: number;
    protected readonly chunkOverlap: number;
    public readonly canIncrementallyLoad: boolean;
    protected readonly loaderMetadata: Record<string, unknown>;

    constructor(
        uniqueId: string,
        loaderMetadata: Record<string, unknown>,
        chunkSize = 1500,
        chunkOverlap = 150,
        canIncrementallyLoad = false,
    ) {
        super();

        this.uniqueId = uniqueId;
        this.chunkSize = chunkSize;
        this.chunkOverlap = chunkOverlap;
        this.loaderMetadata = loaderMetadata;
        this.canIncrementallyLoad = canIncrementallyLoad;
    }

    public getUniqueId(): string {
        return this.uniqueId;
    }

    protected async loadIncrementalChunk(
        incrementalGenerator: AsyncGenerator<LoaderChunk<MetadataTemplate>, void, void>,
    ) {
        this.emit('incrementalChunkAvailable', incrementalGenerator);
    }

    /**
     * This TypeScript function asynchronously processes chunks of data, cleans up the content,
     * calculates a content hash, and yields the modified chunks.
     */
    public async *getChunks(): AsyncGenerator<LoaderChunk<MetadataTemplate>, void, void> {
        const chunks = await this.getUnfilteredChunks();

        let count = 0;
        for await (const chunk of chunks) {
            chunk.pageContent = chunk.pageContent
                .replace(/(\r\n|\n|\r)/gm, ' ')
                .replace(/\s\s+/g, ' ')
                .trim();

            if (chunk.pageContent.length > 0) {
                yield {
                    ...chunk,
                };
                count++;
            }
        }
    }

    abstract getUnfilteredChunks(): AsyncGenerator<UnfilteredLoaderChunk<MetadataTemplate>, void, void>;
}
