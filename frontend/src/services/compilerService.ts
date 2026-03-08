import { API_BASE_URL } from './config';

const API_BASE = `${API_BASE_URL}/api/compiler`;

export interface CompileRequest {
  source_code: string;
  filename?: string;
}

export interface CCompileRequest {
  source_code: string;
  filename?: string;
}

export interface CCompileDownloadResult {
  binary: Uint8Array;
  buildCommand?: string;
}

/**
 * Compile Python source to .mpy bytecode via the backend mpy-cross compiler.
 * Returns the raw bytecode as a Uint8Array, ready to be downloaded to the hub.
 */
export async function compilePythonAndDownload(request: CompileRequest): Promise<Uint8Array> {
  const resp = await fetch(`${API_BASE}/compile/download`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      source_code: request.source_code,
      filename: request.filename || 'main.py',
    }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    let detail = text;
    try {
      const json = JSON.parse(text);
      detail = json.detail || text;
    } catch { /* use raw text */ }
    throw new Error(`Python compile failed: ${detail}`);
  }

  const buffer = await resp.arrayBuffer();
  return new Uint8Array(buffer);
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
