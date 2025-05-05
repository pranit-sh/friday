import * as vscode from 'vscode';
import { FridayConfig } from '../../types';

export async function fileExists(uri: vscode.Uri): Promise<boolean> {
  try {
    const stat = await vscode.workspace.fs.stat(uri);
    return stat.type === vscode.FileType.File;
  } catch {
    return false;
  }
}

export async function directoryExists(uri: vscode.Uri): Promise<boolean> {
  try {
    const stat = await vscode.workspace.fs.stat(uri);
    return stat.type === vscode.FileType.Directory;
  } catch {
    return false;
  }
}

export async function loadFileIfExists(fileName: string): Promise<FridayConfig | null> {
  if (!vscode.workspace.workspaceFolders) {
    return null;
  }
  const workspaceFolder = vscode.workspace.workspaceFolders[0].uri.fsPath;
  const configFilePath = vscode.Uri.file(`${workspaceFolder}/${fileName}`);

  try {
    const configContent = JSON.parse(
      Buffer.from(await vscode.workspace.fs.readFile(configFilePath)).toString('utf8'),
    );
    return {
      project_id: configContent.project_id || '',
      hana_endpoint: configContent.hana_endpoint || '',
      hana_user: configContent.hana_user || '',
      hana_password: configContent.hana_password || '',
      confluence_baseurl: configContent.confluence_baseurl || '',
      confluence_user: configContent.confluence_user || '',
      confluence_apikey: configContent.confluence_apikey || '',
    };
  } catch {
    return null;
  }
}

export async function verifyConfigFile(
  stream: vscode.ChatResponseStream,
  requiredParams: string[],
): Promise<FridayConfig | undefined> {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!workspaceFolder) {
    stream.markdown('Open a workspace to start using Friday.');
    return;
  }

  const configFilePath = vscode.Uri.file(`${workspaceFolder}/friday.config.json`);
  if (!(await fileExists(configFilePath))) {
    stream.markdown(
      'Config file not found. Create `friday.config.json`. See `/howto` command for details.',
    );
    return;
  }

  try {
    const configJson = JSON.parse(
      Buffer.from(await vscode.workspace.fs.readFile(configFilePath)).toString('utf8'),
    );
    const config: Record<string, string> = {};

    for (const param of requiredParams) {
      config[param] = configJson[param] || '';
    }

    if (Object.values(config).some((value) => !value)) {
      throw new Error();
    }
    return config as FridayConfig;
  } catch {
    stream.markdown(
      'Invalid config file. Ensure `friday.config.json` is correctly formatted and contains all required parameters. See /howto command for details.',
    );
  }
}

export async function verifyDataSource(
  stream: vscode.ChatResponseStream,
): Promise<vscode.Uri | undefined> {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!workspaceFolder) {
    stream.markdown('Open a workspace to start using Friday.');
    return;
  }

  const dataSourcePath = vscode.Uri.file(`${workspaceFolder}/friday.datasource`);
  if (!(await directoryExists(dataSourcePath))) {
    stream.markdown(
      'Data source directory not found. Create `friday.datasource`. See /howto command for details.',
    );
    return;
  }
  return dataSourcePath;
}
