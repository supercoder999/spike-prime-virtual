export interface FirmwareInstallResponse {
  success: boolean;
  message: string;
  output: string;
}

export interface LegoRestoreInfoResponse {
  success: boolean;
  message: string;
  restore_url: string;
  note: string;
}

export interface CFirmwareBuildFlashRequest {
  source_code: string;
  filename?: string;
  source_path?: string;
  build_command?: string;
  flash_command?: string;
}

export interface CFirmwareBuildFlashResponse {
  success: boolean;
  message: string;
  source_path: string;
  build_command: string;
  flash_command: string;
  build_output: string;
  flash_output: string;
}

import { API_BASE_URL } from './config';

const API_BASE = `${API_BASE_URL}/api/firmware`;

async function getErrorMessage(response: Response): Promise<string> {
  const text = await response.text();
  if (!text) return 'Firmware installation failed';

  try {
    const data = JSON.parse(text) as { detail?: string };
    return data.detail || text;
  } catch {
    return text;
  }
}

export async function installPybricksFirmware(firmwareFile: File): Promise<FirmwareInstallResponse> {
  const form = new FormData();
  form.append('firmware', firmwareFile);

  const response = await fetch(`${API_BASE}/pybricks/install`, {
    method: 'POST',
    body: form,
  });

  if (!response.ok) {
    const message = await getErrorMessage(response);
    throw new Error(message);
  }

  return response.json();
}

export async function installLatestStablePrimehubFirmware(): Promise<FirmwareInstallResponse> {
  const response = await fetch(`${API_BASE}/pybricks/install/primehub/stable`, {
    method: 'POST',
  });

  if (!response.ok) {
    const message = await getErrorMessage(response);
    throw new Error(message);
  }

  return response.json();
}

export async function getLegoRestoreInfo(): Promise<LegoRestoreInfoResponse> {
  const response = await fetch(`${API_BASE}/lego/restore-info`, {
    method: 'GET',
  });

  if (!response.ok) {
    const message = await getErrorMessage(response);
    throw new Error(message);
  }

  return response.json();
}

export async function restoreLegoFirmwareFromBackup(backupFile: File): Promise<FirmwareInstallResponse> {
  const form = new FormData();
  form.append('backup', backupFile);

  const response = await fetch(`${API_BASE}/lego/restore/local`, {
    method: 'POST',
    body: form,
  });

  if (!response.ok) {
    const message = await getErrorMessage(response);
    throw new Error(message);
  }

  return response.json();
}

export async function restoreBundledLegoFirmware(): Promise<FirmwareInstallResponse> {
  const response = await fetch(`${API_BASE}/lego/restore/bundled`, {
    method: 'POST',
  });

  if (!response.ok) {
    const message = await getErrorMessage(response);
    throw new Error(message);
  }

  return response.json();
}

export async function buildAndFlashCFirmware(
  request: CFirmwareBuildFlashRequest
): Promise<CFirmwareBuildFlashResponse> {
  const response = await fetch(`${API_BASE}/c/build-flash`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const message = await getErrorMessage(response);
    throw new Error(message);
  }

  return response.json();
}
