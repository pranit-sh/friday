import * as vscode from 'vscode';
import {
  COMMAND_RESPONSE,
  CONFLUENCE_RESPONSE,
  HOWTO_RESPONSE,
  SETUP_RESPONSE,
} from '../../constants';
import { createMetadata } from './helper';
import { HanaDB } from '../databases/hana-db';
import { MemoryStore } from '../store/memory-store';
import { verifyConfigFile, verifyDataSource } from './files';
import { RAGApplication } from '../services/rag-application';
import { FridayConfig } from '../../types';
import { BaseModel } from '../interfaces/base-model';

export async function handleHowtoCommand(stream: vscode.ChatResponseStream, prompt: string) {
  switch (prompt) {
    case '--setup':
      stream.markdown(SETUP_RESPONSE);
      return createMetadata();
    case '--commands':
      stream.markdown(COMMAND_RESPONSE);
      return createMetadata();
    case '--confluence':
      stream.markdown(CONFLUENCE_RESPONSE);
      return createMetadata();
    default:
      stream.markdown(HOWTO_RESPONSE);
  }
}

export async function handlePingCommand(
  stream: vscode.ChatResponseStream,
  db: HanaDB,
  store: MemoryStore,
) {
  const config = await verifyConfigFile(stream, [
    'hana_endpoint',
    'hana_user',
    'hana_password',
    'project_id',
  ]);
  if (!config) {
    return createMetadata('how to use friday', 'howto', '--setup');
  }

  try {
    stream.progress('Connecting to Hana...');
    await db.init(config);
    store.setConfig(config);
    stream.markdown('Hana connection is active.');
    return createMetadata('ingest data', 'ingest');
  } catch (error) {
    stream.markdown(
      'Failed to connect to Hana. Make sure connection strings in `friday.config.json` are valid. See `/howto` command for details.',
    );
    return createMetadata('setup friday', 'howto', '--setup');
  }
}

export async function handleIngestCommand(
  request: vscode.ChatRequest,
  stream: vscode.ChatResponseStream,
  ragApp: RAGApplication,
  db: HanaDB,
  store: MemoryStore,
  llm: BaseModel,
): Promise<vscode.ChatResult> {
  const config = await verifyConfigFile(stream, [
    'hana_endpoint',
    'hana_user',
    'hana_password',
    'project_id',
  ]);
  if (!config) {
    return createMetadata('how to use friday', 'howto');
  }

  const dataSource = await verifyDataSource(stream);
  if (!dataSource) {
    return createMetadata('how to use friday', 'howto');
  }

  const fileUris = (await vscode.workspace.fs.readDirectory(dataSource))
    .filter(([_, type]) => type === vscode.FileType.File)
    .map(([name]) => vscode.Uri.joinPath(dataSource, name));

  if (!db.isActive()) {
    try {
      stream.progress('Connecting to DB...');
      await db.init(config);
    } catch {
      stream.markdown(
        'Failed to connect to Hana. Check `friday.config.json`. See `/howto` command for details.',
      );
      return createMetadata('how to use friday', 'howto');
    }
  }

  const flags = request.prompt.trim().split(' ');

  const isSync = flags.includes('--sync');
  const isHard = flags.includes('--hard');
  const isList = flags.includes('--list');

  if ((isSync && isHard) || (isList && (isSync || isHard))) {
    stream.markdown('You cannot use --sync and --hard (or --list with each others) together.');
    return createMetadata();
  }

  const extractImages = flags.includes('--extract-images');
  const withAttachment = flags.includes('--extract-attachment');
  const useLLM = flags.includes('--use-llm');

  if (isList) {
    return await listFiles(stream, ragApp);
  }

  if (isSync || isHard) {
    return await ingestFiles(stream, fileUris, ragApp, true, isHard, store, llm, {
      extractImages,
      withAttachment,
      useLLM,
    });
  }

  return await ingestFiles(stream, fileUris, ragApp, false, false, store, llm, {
    extractImages,
    withAttachment,
    useLLM,
  });
}

async function ingestFiles(
  stream: vscode.ChatResponseStream,
  fileUris: vscode.Uri[],
  ragApp: RAGApplication,
  sync: boolean,
  hard: boolean,
  store: MemoryStore,
  llm: BaseModel,
  options: {
    extractImages?: boolean;
    withAttachment?: boolean;
    useLLM?: boolean;
  } = {},
): Promise<vscode.ChatResult> {
  const ingestedFiles = await ragApp.getIngestedFiles();

  const fileUrlsTxtUri = fileUris.find(
    (uri) => uri.fsPath.split('/').pop() === 'friday.file-urls.txt',
  );
  const confluenceUrlsTxtUri = fileUris.find(
    (uri) => uri.fsPath.split('/').pop() === 'friday.confluence-pages.txt',
  );

  let fileUrls: string[] = [];
  let confluenceUrls: string[] = [];

  if (fileUrlsTxtUri) {
    fileUris = fileUris.filter((uri) => uri !== fileUrlsTxtUri);
    const fileUrlsContent = Buffer.from(
      await vscode.workspace.fs.readFile(fileUrlsTxtUri),
    ).toString('utf8');
    fileUrls = fileUrlsContent
      .split('\n')
      .map((url) => url.trim())
      .filter(Boolean);
  }

  if (confluenceUrlsTxtUri) {
    const config = await verifyConfigFile(stream, [
      'hana_endpoint',
      'hana_user',
      'hana_password',
      'project_id',
      'confluence_baseurl',
      'confluence_user',
      'confluence_apikey',
    ]);
    fileUris = fileUris.filter((uri) => uri !== confluenceUrlsTxtUri);
    const confluenceUrlsContent = Buffer.from(
      await vscode.workspace.fs.readFile(confluenceUrlsTxtUri),
    ).toString('utf8');
    confluenceUrls = confluenceUrlsContent
      .split('\n')
      .map((url) => url.trim())
      .filter(Boolean);
    if (!config) {
      stream.markdown('Confluence credentials not found. Skipping ingestion of confluence pages.');
      confluenceUrls = [];
    } else {
      store.setConfig({
        ...store.getConfig(),
        confluence_baseurl: config.confluence_baseurl,
        confluence_user: config.confluence_user,
        confluence_apikey: config.confluence_apikey,
      } as FridayConfig);
    }
  }

  const fileNames = [
    ...fileUris.map((uri) => uri.fsPath.split('/').pop()!).filter(Boolean),
    ...fileUrls,
    ...confluenceUrls,
  ];

  for (const uri of fileUris) {
    const fileName = uri.fsPath.split('/').pop()!;
    if (!fileName) {
      continue;
    }
    if (ingestedFiles.includes(fileName)) {
      if (hard) {
        stream.progress(`Deleting ${fileName}`);
        await ragApp.deleteFile(fileName);
      } else {
        stream.markdown(`Skipping ${fileName} as it already exists.`);
        continue;
      }
    }
    stream.progress(`Ingesting ${fileName}`);
    await ragApp.ingestFile(uri, options.extractImages, options.useLLM ? llm : undefined);
    stream.markdown(`Ingested ${fileName}`);
  }

  for (const url of fileUrls) {
    if (ingestedFiles.includes(url)) {
      if (hard) {
        stream.progress(`Deleting ${url}`);
        await ragApp.deleteFile(url);
      } else {
        stream.markdown(`Skipping ${url} as it already exists.`);
        continue;
      }
    }
    stream.progress(`Ingesting ${url}`);
    await ragApp.ingestFileUrl(
      url,
      undefined,
      options.extractImages,
      options.useLLM ? llm : undefined,
    );
    stream.markdown(`Ingested ${url}`);
  }

  for (const url of confluenceUrls) {
    if (ingestedFiles.includes(url)) {
      if (hard) {
        stream.progress(`Deleting ${url}`);
        await ragApp.deleteFile(url);
      } else {
        stream.markdown(`Skipping ${url} as it already exists.\n`);
        continue;
      }
    }
    if (
      !(
        store.getConfig()?.confluence_baseurl &&
        store.getConfig()?.confluence_user &&
        store.getConfig()?.confluence_apikey
      )
    ) {
      stream.markdown(
        'Confluence credentials not found. Check `friday.config.json`. See `/howto` command for details.',
      );
      break;
    }
    stream.progress(`Ingesting ${url}`);
    await ragApp.ingestConfluencePage(
      url,
      {
        baseUrl: store.getConfig()?.confluence_baseurl || '',
        user: store.getConfig()?.confluence_user || '',
        apiKey: store.getConfig()?.confluence_apikey || '',
      },
      options.extractImages,
      options.useLLM ? llm : undefined,
      options.withAttachment,
    );
    stream.markdown(`Ingested ${url}`);
  }

  if (sync || hard) {
    for (const ingestedFile of ingestedFiles) {
      if (!fileNames.includes(ingestedFile)) {
        stream.progress(`Deleting ${ingestedFile}`);
        await ragApp.deleteFile(ingestedFile);
        stream.markdown(`Deleted ${ingestedFile}`);
      }
    }
  }

  stream.markdown('\nIngestion finished.');
  return createMetadata();
}

async function listFiles(stream: vscode.ChatResponseStream, ragApp: RAGApplication) {
  stream.progress('Fetching ingested files...');
  const ingestedFiles = await ragApp.getIngestedFiles();
  if (ingestedFiles.length === 0) {
    stream.markdown('No documents ingested yet.');
    return createMetadata('ingest data', 'ingest');
  } else {
    stream.markdown(`Ingested files:\n- ${ingestedFiles.join('\n- ')}`);
    return createMetadata();
  }
}

export async function handleQuery(
  request: vscode.ChatRequest,
  context: vscode.ChatContext,
  stream: vscode.ChatResponseStream,
  ragApp: RAGApplication,
) {
  const config = await verifyConfigFile(stream, [
    'hana_endpoint',
    'hana_user',
    'hana_password',
    'project_id',
  ]);
  if (!config) {
    return createMetadata('how to use friday', 'howto');
  }

  const { response, sources } = await ragApp.query(request.prompt, context.history);
  for await (const chunk of response.stream.toContentStream()) {
    stream.markdown(chunk);
  }

  if (sources.length > 0) {
    stream.markdown(
      `\nSupporting context: ${sources.map((source: { uniqueFileId: string }) => `\`${source.uniqueFileId}\``).join(', ')}`,
    );
  }
  return createMetadata();
}
