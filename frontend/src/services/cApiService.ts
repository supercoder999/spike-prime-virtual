const API_BASE = 'http://localhost:8000/api/c-api';

export interface CApiSymbol {
  name: string;
  signature: string;
  header: string;
}

export interface CApiResponse {
  include_dir: string;
  headers_scanned: number;
  functions: CApiSymbol[];
  macros: CApiSymbol[];
  types: CApiSymbol[];
}

export async function fetchCApiSymbols(): Promise<CApiResponse> {
  const resp = await fetch(`${API_BASE}/symbols`);
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Failed to load C API symbols (${resp.status}): ${text}`);
  }
  return resp.json();
}
