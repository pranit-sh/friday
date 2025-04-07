import * as vscode from 'vscode';
import { FridayConfig } from './types';
import { fileExists, directoryExists } from './core/util/files';
import { createMetadata, createRagApplication } from './core/util/helper';
import { MemoryStore } from './core/store/memory-store';
import { RAGApplication } from './core/services/rag-application';
import { HOWTO_RESPONSE } from './constants';

import * as dotenv from 'dotenv';
import path from 'path';
import { HanaDB } from './core/databases/hana-db';

const FRIDAY_PARTICIPANT_ID = 'chat-participant.friday';

export async function activate(context: vscode.ExtensionContext) {
	dotenv.config({ path: path.join(__dirname, '..', '.env') });
	const { store, db, ragApplication } = await createRagApplication();
	
	const handler: vscode.ChatRequestHandler = async (request, context, stream, token) => {
		const commands: Record<string, () => Promise<vscode.ChatResult>> = {
			'howto': () => handleHowtoCommand(stream),
			'ping': () => handlePingCommand(stream, db, store),
			'ingest': () => handleIngestCommand(request, stream, ragApplication, db, store),
		};
		return commands[request.command ?? '']?.() ?? handleQuery(request, context, stream, ragApplication);
	};

	const friday = vscode.chat.createChatParticipant(FRIDAY_PARTICIPANT_ID, handler);
	friday.followupProvider = {
		provideFollowups(result) {
			return result.metadata?.followup ? [{
				prompt: result.metadata.prompt,
				label: vscode.l10n.t(result.metadata.label),
				command: result.metadata.followup,
			}] : [];
		}
	};
}

async function handleHowtoCommand(stream: vscode.ChatResponseStream) {
	stream.markdown(HOWTO_RESPONSE);
	return createMetadata('', '');
}

async function handlePingCommand(stream: vscode.ChatResponseStream, db: HanaDB, store: MemoryStore) {
	const config = await verifyConfigFile(stream);
	if (!config) return createMetadata('how to use friday', 'howto');

	try {
		stream.progress('Connecting to Hana...');
		await db.init(config);
		store.setConfig(config);
		stream.markdown('Hana connection is active.');
		return createMetadata('ingest data', 'ingest');
	} catch (error) {
		stream.markdown('Failed to connect to Hana. Check `friday.config.json`. See `/howto` command for details.');
		return createMetadata('how to use friday', 'howto');
	}
}

async function handleIngestCommand(request: vscode.ChatRequest, stream: vscode.ChatResponseStream, ragApp: RAGApplication, db: HanaDB, store: MemoryStore): Promise<vscode.ChatResult> {
	const config = await verifyConfigFile(stream);
	if (!config) return createMetadata('how to use friday', 'howto');

	const dataSource = await verifyDataSource(stream);
	if (!dataSource) return createMetadata('how to use friday', 'howto');

	const fileUris = (await vscode.workspace.fs.readDirectory(dataSource))
		.filter(([_, type]) => type === vscode.FileType.File)
		.map(([name]) => vscode.Uri.joinPath(dataSource, name));

	if (!db.isActive()) {
		try {
			stream.progress('Connecting to DB...');
			await db.init(config);
		} catch {
			stream.markdown('Failed to connect to Hana. Check `friday.config.json`. See `/howto` command for details.');
			return createMetadata('how to use friday', 'howto');
		}
	}

	const ingestionStrategies: Record<string, () => Promise<vscode.ChatResult>> = {
		'': () => ingestFiles(stream, fileUris, ragApp, false, false),
		'--sync': () => ingestFiles(stream, fileUris, ragApp, true, false),
		'--hard': () => ingestFiles(stream, fileUris, ragApp, true, true),
		'--list': () => listFiles(stream, ragApp),
	};

	return await (ingestionStrategies[request.prompt.trim()] ?? (() => {
		stream.markdown('Invalid flag. Avaliable flags are `--sync`, `--hard` and `--list`. See `/howto` command for details.');
		return createMetadata('how to use friday', 'howto');
	}))();
}

async function ingestFiles(stream: vscode.ChatResponseStream, fileUris: vscode.Uri[], ragApp: RAGApplication, sync: boolean, hard: boolean) {
	const ingestedFiles = await ragApp.getIngestedFiles();
	const fileNames = fileUris.map(uri => uri.fsPath.split('/').pop()!).filter(Boolean);

	for (const uri of fileUris) {
		const fileName = uri.fsPath.split('/').pop()!;
		stream.progress(`Ingesting ${fileName}`);
		if (ingestedFiles.includes(fileName)) {
			if (hard) {
				stream.progress(`Deleting ${fileName}`);
				await ragApp.deleteFile(fileName);
			} else {
				stream.markdown(`Skipping ${fileName} as it already exists.\n`);
				continue;
			}
		}
		await ragApp.ingestFile(uri);
		stream.markdown(`Ingested ${fileName}`);
	}

	if (sync) {
		for (const ingestedFile of ingestedFiles) {
			if (!fileNames.includes(ingestedFile)) {
				stream.progress(`Deleting ${ingestedFile}`);
				await ragApp.deleteFile(ingestedFile);
				stream.markdown(`Deleted ${ingestedFile}\n`);
			}
		}
	}

	stream.markdown('Ingestion finished.');
	return createMetadata('', '');
}

async function listFiles(stream: vscode.ChatResponseStream, ragApp: RAGApplication) {
	stream.progress('Fetching ingested files...');
	const ingestedFiles = await ragApp.getIngestedFiles();
	if (ingestedFiles.length === 0) {
		stream.markdown('No documents ingested yet.');
		return createMetadata('ingest data', 'ingest');
	} else {
		stream.markdown(`Ingested files:\n- ${ingestedFiles.join('\n- ')}`);
		return createMetadata('', '');
	}
}

async function handleQuery(request: vscode.ChatRequest, context: vscode.ChatContext, stream: vscode.ChatResponseStream, ragApp: RAGApplication) {
	const config = await verifyConfigFile(stream);
	if (!config) return createMetadata('how to use friday', 'howto');

	const { response, sources} = await ragApp.query(request.prompt, context.history);
	for await (const chunk of response.stream.toContentStream()) {
		stream.markdown(chunk);
	}

	if (sources.length > 0) {
		stream.markdown(`\nSupporting context: ${sources.map((source: { uniqueFileId: string; }) => `\`${source.uniqueFileId}\``).join(', ')}`);
	}
	return createMetadata('', '');
}

async function verifyConfigFile(stream: vscode.ChatResponseStream): Promise<FridayConfig | undefined> {
	const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
	if (!workspaceFolder) {
		stream.markdown('Open a workspace to start using Friday.');
		return;
	}

	const configFilePath = vscode.Uri.file(`${workspaceFolder}/friday.config.json`);
	if (!await fileExists(configFilePath)) {
		stream.markdown('Config file not found. Create `friday.config.json`. See `/howto` command for details.');
		return;
	}

	try {
		const configJson = JSON.parse(Buffer.from(await vscode.workspace.fs.readFile(configFilePath)).toString('utf8'));
		const config: FridayConfig = {
			project_id: configJson.project_id || '',
			hana_endpoint: configJson.hana_endpoint || '',
			hana_user: configJson.hana_user || '',
			hana_password: configJson.hana_password || ''
		};
		if (Object.values(config).some(value => !value)) throw new Error();
		return config;
	} catch {
		stream.markdown('Invalid config file. Ensure `friday.config.json` is correctly formatted. See /howto command for details.');
	}
}

async function verifyDataSource(stream: vscode.ChatResponseStream): Promise<vscode.Uri | undefined> {
	const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
	if (!workspaceFolder) {
		stream.markdown('Open a workspace to start using Friday.');
		return;
	}

	const dataSourcePath = vscode.Uri.file(`${workspaceFolder}/friday.datasource`);
	if (!await directoryExists(dataSourcePath)) {
		stream.markdown('Data source directory not found. Create `friday.datasource`. See /howto command for details.');
		return;
	}
	return dataSourcePath;
}

export function deactivate() { }
