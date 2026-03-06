import { API_BASE_URL } from './config';

const API_BASE = `${API_BASE_URL}/api/compiler`;

export interface CCompileRequest {
  source_code: string;
  filename?: string;
}

export interface CCompileDownloadResult {
  binary: Uint8Array;
  buildCommand?: string;
}

export async function compileCAndDownload(request: CCompileRequest): Promise<CCompileDownloadResult> {
  const resp = await fetch(`${API_BASE}/c/compile/download`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`C compile failed (${resp.status}): ${text}`);
  }

  const buffer = await resp.arrayBuffer();
  return {
    binary: new Uint8Array(buffer),
    buildCommand: resp.headers.get('X-Pybricks-C-Build-Command') || undefined,
  };
}
