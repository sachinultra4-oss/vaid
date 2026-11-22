export interface DateRangeFilter {
  preset: 'today' | '7d' | '30d' | 'custom';
  from: string;
  to: string;
}

export function computePresetDates(preset: 'today' | '7d' | '30d'): { from: string; to: string } {
  const now = new Date();
  const to = now.toISOString().slice(0, 10);
  const start = new Date(now);
  if (preset === 'today') {
    return { from: to, to };
  }
  if (preset === '7d') {
    start.setDate(start.getDate() - 6);
    return { from: start.toISOString().slice(0, 10), to };
  }
  start.setDate(start.getDate() - 29);
  return { from: start.toISOString().slice(0, 10), to };
}

export async function adminFetch<T>(
  path: string,
  token: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = new Headers(options.headers || {});
  headers.set('Authorization', `Bearer ${token}`);
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(path, { ...options, headers });
  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      const data = (await res.json()) as { error?: string };
      if (data.error) msg = data.error;
    } catch {
      // ignore json parse error
    }
    const err = new Error(msg) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }

  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) {
    return (await res.json()) as T;
  }
  return (await res.text()) as unknown as T;
}
