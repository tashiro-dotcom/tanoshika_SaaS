const originalEnv = process.env.NEXT_PUBLIC_API_BASE_URL;

type MockResponseInit = {
  status: number;
  body?: string;
  jsonBody?: unknown;
  blobBody?: Blob;
  headers?: Record<string, string>;
};

function createMockResponse({ status, body, jsonBody, blobBody, headers = {} }: MockResponseInit) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get(name: string) {
        return headers[name.toLowerCase()] ?? headers[name] ?? null;
      },
    },
    text: jest.fn().mockResolvedValue(body ?? (jsonBody ? JSON.stringify(jsonBody) : '')),
    json: jest.fn().mockResolvedValue(jsonBody),
    blob: jest.fn().mockResolvedValue(blobBody ?? new Blob()),
  } as unknown as Response;
}

function installFetchMock(implementation: typeof fetch) {
  Object.defineProperty(globalThis, 'fetch', {
    configurable: true,
    writable: true,
    value: implementation,
  });
}

function installUrlMethod(name: 'createObjectURL' | 'revokeObjectURL', implementation: (...args: never[]) => unknown) {
  Object.defineProperty(URL, name, {
    configurable: true,
    writable: true,
    value: implementation,
  });
}

describe('admin api client', () => {
  afterEach(() => {
    jest.resetModules();
    jest.restoreAllMocks();
    if (originalEnv === undefined) {
      delete process.env.NEXT_PUBLIC_API_BASE_URL;
    } else {
      process.env.NEXT_PUBLIC_API_BASE_URL = originalEnv;
    }
  });

  it('uses the default api base url when env is unset', async () => {
    delete process.env.NEXT_PUBLIC_API_BASE_URL;
    const { apiBaseUrl } = await import('../api-client');
    expect(apiBaseUrl()).toBe('http://localhost:3001');
  });

  it('uses the env api base url when present', async () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = 'https://example.test';
    const { apiBaseUrl } = await import('../api-client');
    expect(apiBaseUrl()).toBe('https://example.test');
  });

  it('maps structured api errors into ApiError', async () => {
    const fetchMock = jest.fn<typeof fetch>().mockResolvedValue(
      createMockResponse({ status: 403, jsonBody: { code: 'forbidden' }, headers: { 'Content-Type': 'application/json' } }),
    );
    installFetchMock(fetchMock);
    const { fetchJson } = await import('../api-client');

    await expect(fetchJson('/service-users', 'token')).rejects.toMatchObject({
      name: 'ApiError',
      status: 403,
      message: 'この操作を実行する権限がありません。',
    });
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:3001/service-users', {
      headers: { Authorization: 'Bearer token' },
      cache: 'no-store',
    });
  });

  it('keeps generic 500 messages readable', async () => {
    installFetchMock(jest.fn<typeof fetch>().mockResolvedValue(createMockResponse({ status: 500, body: 'server exploded' })));
    const { fetchJson } = await import('../api-client');

    await expect(fetchJson('/wages/rules', 'token')).rejects.toThrow('API呼び出しに失敗しました（HTTP 500）');
  });

  it('bubbles network errors from fetch', async () => {
    installFetchMock(jest.fn<typeof fetch>().mockRejectedValue(new Error('network down')));
    const { fetchJson } = await import('../api-client');

    await expect(fetchJson('/attendance', 'token')).rejects.toThrow('network down');
  });

  it('downloads a file using the content disposition filename', async () => {
    const anchor = document.createElement('a');
    const createElementSpy = jest.spyOn(document, 'createElement').mockReturnValue(anchor);
    const appendSpy = jest.spyOn(document.body, 'appendChild');
    const clickSpy = jest.spyOn(anchor, 'click').mockImplementation(() => {});
    const createObjectUrl = jest.fn(() => 'blob:test');
    const revokeObjectUrl = jest.fn();
    installUrlMethod('createObjectURL', createObjectUrl);
    installUrlMethod('revokeObjectURL', revokeObjectUrl);
    installFetchMock(
      jest.fn<typeof fetch>().mockResolvedValue(
        createMockResponse({
          status: 200,
          blobBody: new Blob(['csv-data']),
          headers: { 'content-disposition': 'attachment; filename="slip.csv"' },
        }),
      ),
    );
    const { downloadAuthenticatedFile } = await import('../api-client');

    const filename = await downloadAuthenticatedFile('/wages/1/slip.csv', 'token', 'fallback.csv');

    expect(filename).toBe('slip.csv');
    expect(anchor.download).toBe('slip.csv');
    expect(clickSpy).toHaveBeenCalled();
    expect(createObjectUrl).toHaveBeenCalled();
    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:test');
    expect(appendSpy).toHaveBeenCalledWith(anchor);
    expect(createElementSpy).toHaveBeenCalledWith('a');
  });
});
