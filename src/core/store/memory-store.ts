import { Chunk, FridayConfig } from "../../types";

export class MemoryStore {
  private fridayConfig: FridayConfig | null = null;
  private context: Chunk[] = [];
  private historySummary: string = '';
  private intent: string = '';

  constructor() {}

  public setConfig(fridayConfig: FridayConfig) {
    this.fridayConfig = fridayConfig;
  }

  public getConfig(): FridayConfig | null {
    return this.fridayConfig;
  }

  public setContext(context: Chunk[]) {
    this.context = context;
  }

  public getContext(): Chunk[] {
    return this.context;
  }

  public setHistorySummary(historySummary: string) {
    this.historySummary = historySummary;
  }

  public getHistorySummary(): string {
    return this.historySummary;
  }

  public setIntent(intent: string) {
    this.intent = intent;
  }

  public getIntent(): string {
    return this.intent;
  }
}
