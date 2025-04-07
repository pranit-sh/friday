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
    const configContent = JSON.parse(Buffer.from(await vscode.workspace.fs.readFile(configFilePath)).toString('utf8'));
    return {
      project_id: configContent.project_id || '',
      hana_endpoint: configContent.hana_endpoint || '',
      hana_user: configContent.hana_user || '',
      hana_password: configContent.hana_password || ''
    };
  } catch {
    return null;
  }
}