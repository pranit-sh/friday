import * as vscode from 'vscode';
import * as dotenv from 'dotenv';
import path from 'path';

import { createFridayServices } from './core/util/helper';
import { FRIDAY_PARTICIPANT_ID } from './constants';
import {
  handleHowtoCommand,
  handleIngestCommand,
  handlePingCommand,
  handleQuery,
} from './core/util/commands';

export async function activate(context: vscode.ExtensionContext) {
  dotenv.config({ path: path.join(__dirname, '..', '.env') });
  const { store, db, llm, ragApplication } = await createFridayServices();

  const handler: vscode.ChatRequestHandler = async (request, context, stream) => {
    switch (request.command) {
      case 'howto':
        return handleHowtoCommand(stream, request.prompt);
      case 'ping':
        return handlePingCommand(stream, db, store);
      case 'ingest':
        return handleIngestCommand(request, stream, ragApplication, db, store, llm);
      default:
        return handleQuery(request, context, stream, ragApplication);
    }
  };

  const friday = vscode.chat.createChatParticipant(FRIDAY_PARTICIPANT_ID, handler);

  friday.followupProvider = {
    provideFollowups(result) {
      if (!result.metadata?.followup) {
        return [];
      }
      return [
        {
          prompt: result.metadata.prompt,
          label: vscode.l10n.t(result.metadata.label),
          command: result.metadata.command,
        },
      ];
    },
  };
}

export function deactivate() {}
