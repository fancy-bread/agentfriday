import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { openServer, closeServer, type ServerFixture } from './helpers/openServer.js';

describe('daemon lifecycle', () => {
  let f: ServerFixture;

  beforeEach(async () => { f = await openServer(); });
  afterEach(async () => { if (f) await closeServer(f); });

  it('server connects and client can list tools without error', async () => {
    const result = await f.client.listTools();
    expect(result.tools).toBeDefined();
    expect(Array.isArray(result.tools)).toBe(true);
  });

  it('closeServer resolves without throwing', async () => {
    await expect(closeServer(f)).resolves.toBeUndefined();
    f = null!;
  });
});

describe('memory_append', () => {
  let f: ServerFixture;

  beforeEach(async () => { f = await openServer(); });
  afterEach(async () => { if (f) await closeServer(f); });

  it('valid content returns { id } as non-empty string', async () => {
    const result = await f.client.callTool({
      name: 'memory_append',
      arguments: { content: 'remember this' },
    });
    expect(result.isError).toBeFalsy();
    const text = (result.content as Array<{ type: string; text: string }>)
      .find(c => c.type === 'text')?.text ?? '';
    const payload = JSON.parse(text) as { id: string };
    expect(payload.id).toBeTruthy();
    expect(typeof payload.id).toBe('string');
  });

  it('empty content returns isError response and server stays running', async () => {
    const result = await f.client.callTool({
      name: 'memory_append',
      arguments: { content: '' },
    });
    expect(result.isError).toBe(true);
    const after = await f.client.listTools();
    expect(after.tools).toBeDefined();
  });
});

describe('memory_query', () => {
  let f: ServerFixture;

  beforeEach(async () => { f = await openServer(); });
  afterEach(async () => { if (f) await closeServer(f); });

  it('empty vault returns { entries: [] } without error', async () => {
    const result = await f.client.callTool({
      name: 'memory_query',
      arguments: { context: 'anything' },
    });
    expect(result.isError).toBeFalsy();
    const text = (result.content as Array<{ type: string; text: string }>)
      .find(c => c.type === 'text')?.text ?? '';
    const payload = JSON.parse(text) as { entries: unknown[] };
    expect(payload.entries).toEqual([]);
  });

  it('after appending, query returns entries with correct fields', async () => {
    await f.client.callTool({ name: 'memory_append', arguments: { content: 'hello world' } });
    const result = await f.client.callTool({
      name: 'memory_query',
      arguments: { context: 'hello' },
    });
    expect(result.isError).toBeFalsy();
    const text = (result.content as Array<{ type: string; text: string }>)
      .find(c => c.type === 'text')?.text ?? '';
    const payload = JSON.parse(text) as { entries: Array<{ id: string; content: string; createdAt: number; action: string }> };
    expect(payload.entries.length).toBeGreaterThan(0);
    const entry = payload.entries[0];
    expect(entry.id).toBeTruthy();
    expect(entry.content).toBe('hello world');
    expect(typeof entry.createdAt).toBe('number');
    expect(entry.action).toBe('append');
  });

  it('limit parameter caps result count', async () => {
    await f.client.callTool({ name: 'memory_append', arguments: { content: 'entry one' } });
    await f.client.callTool({ name: 'memory_append', arguments: { content: 'entry two' } });
    await f.client.callTool({ name: 'memory_append', arguments: { content: 'entry three' } });
    const result = await f.client.callTool({
      name: 'memory_query',
      arguments: { context: 'entry', limit: 2 },
    });
    const text = (result.content as Array<{ type: string; text: string }>)
      .find(c => c.type === 'text')?.text ?? '';
    const payload = JSON.parse(text) as { entries: unknown[] };
    expect(payload.entries.length).toBeLessThanOrEqual(2);
  });
});

describe('memory_amend', () => {
  let f: ServerFixture;

  beforeEach(async () => { f = await openServer(); });
  afterEach(async () => { if (f) await closeServer(f); });

  it('valid id + content returns new { id } different from original', async () => {
    const appendResult = await f.client.callTool({ name: 'memory_append', arguments: { content: 'original' } });
    const appendText = (appendResult.content as Array<{ type: string; text: string }>)
      .find(c => c.type === 'text')?.text ?? '';
    const { id: originalId } = JSON.parse(appendText) as { id: string };

    const amendResult = await f.client.callTool({
      name: 'memory_amend',
      arguments: { id: originalId, content: 'updated' },
    });
    expect(amendResult.isError).toBeFalsy();
    const amendText = (amendResult.content as Array<{ type: string; text: string }>)
      .find(c => c.type === 'text')?.text ?? '';
    const { id: newId } = JSON.parse(amendText) as { id: string };
    expect(newId).toBeTruthy();
    expect(newId).not.toBe(originalId);
  });

  it('amended entry appears in results, original does not', async () => {
    const appendResult = await f.client.callTool({ name: 'memory_append', arguments: { content: 'stale content' } });
    const appendText = (appendResult.content as Array<{ type: string; text: string }>)
      .find(c => c.type === 'text')?.text ?? '';
    const { id } = JSON.parse(appendText) as { id: string };

    await f.client.callTool({ name: 'memory_amend', arguments: { id, content: 'fresh content' } });

    const queryResult = await f.client.callTool({ name: 'memory_query', arguments: { context: 'content' } });
    const queryText = (queryResult.content as Array<{ type: string; text: string }>)
      .find(c => c.type === 'text')?.text ?? '';
    const { entries } = JSON.parse(queryText) as { entries: Array<{ content: string }> };
    const contents = entries.map(e => e.content);
    expect(contents).toContain('fresh content');
    expect(contents).not.toContain('stale content');
  });

  it('unknown id returns isError response and server stays running', async () => {
    const result = await f.client.callTool({
      name: 'memory_amend',
      arguments: { id: '00000000-0000-0000-0000-000000000000', content: 'update' },
    });
    expect(result.isError).toBe(true);
    const after = await f.client.listTools();
    expect(after.tools).toBeDefined();
  });
});

describe('memory_redact', () => {
  let f: ServerFixture;

  beforeEach(async () => { f = await openServer(); });
  afterEach(async () => { if (f) await closeServer(f); });

  it('valid id returns new { id } (redaction record)', async () => {
    const appendResult = await f.client.callTool({ name: 'memory_append', arguments: { content: 'to forget' } });
    const appendText = (appendResult.content as Array<{ type: string; text: string }>)
      .find(c => c.type === 'text')?.text ?? '';
    const { id } = JSON.parse(appendText) as { id: string };

    const redactResult = await f.client.callTool({ name: 'memory_redact', arguments: { id } });
    expect(redactResult.isError).toBeFalsy();
    const redactText = (redactResult.content as Array<{ type: string; text: string }>)
      .find(c => c.type === 'text')?.text ?? '';
    const { id: redactId } = JSON.parse(redactText) as { id: string };
    expect(redactId).toBeTruthy();
    expect(redactId).not.toBe(id);
  });

  it('redacted entry does not appear in subsequent query results', async () => {
    const appendResult = await f.client.callTool({ name: 'memory_append', arguments: { content: 'secret memory' } });
    const appendText = (appendResult.content as Array<{ type: string; text: string }>)
      .find(c => c.type === 'text')?.text ?? '';
    const { id } = JSON.parse(appendText) as { id: string };

    await f.client.callTool({ name: 'memory_redact', arguments: { id } });

    const queryResult = await f.client.callTool({ name: 'memory_query', arguments: { context: 'secret' } });
    const queryText = (queryResult.content as Array<{ type: string; text: string }>)
      .find(c => c.type === 'text')?.text ?? '';
    const { entries } = JSON.parse(queryText) as { entries: Array<{ content: string }> };
    expect(entries.map(e => e.content)).not.toContain('secret memory');
  });

  it('optional reason accepted without error', async () => {
    const appendResult = await f.client.callTool({ name: 'memory_append', arguments: { content: 'with reason' } });
    const appendText = (appendResult.content as Array<{ type: string; text: string }>)
      .find(c => c.type === 'text')?.text ?? '';
    const { id } = JSON.parse(appendText) as { id: string };

    const result = await f.client.callTool({
      name: 'memory_redact',
      arguments: { id, reason: 'no longer relevant' },
    });
    expect(result.isError).toBeFalsy();
  });

  it('unknown id returns isError response and server stays running', async () => {
    const result = await f.client.callTool({
      name: 'memory_redact',
      arguments: { id: '00000000-0000-0000-0000-000000000000' },
    });
    expect(result.isError).toBe(true);
    const after = await f.client.listTools();
    expect(after.tools).toBeDefined();
  });
});

describe('tool metadata', () => {
  let f: ServerFixture;

  beforeEach(async () => { f = await openServer(); });
  afterEach(async () => { if (f) await closeServer(f); });

  it('tool list contains all four tools with names, descriptions, and input schemas', async () => {
    const result = await f.client.listTools();
    const names = result.tools.map(t => t.name);
    expect(names).toContain('memory_append');
    expect(names).toContain('memory_query');
    expect(names).toContain('memory_amend');
    expect(names).toContain('memory_redact');
    for (const tool of result.tools) {
      expect(tool.description).toBeTruthy();
      expect(tool.inputSchema).toBeDefined();
      expect(tool.inputSchema.type).toBe('object');
    }
  });
});

describe('full sequence', () => {
  let f: ServerFixture;

  beforeEach(async () => { f = await openServer(); });
  afterEach(async () => { if (f) await closeServer(f); });

  it('append → query (present) → amend → query (updated) → redact → query (absent)', async () => {
    const appendResult = await f.client.callTool({ name: 'memory_append', arguments: { content: 'original content' } });
    const appendText = (appendResult.content as Array<{ type: string; text: string }>)
      .find(c => c.type === 'text')?.text ?? '';
    const { id } = JSON.parse(appendText) as { id: string };

    const q1 = await f.client.callTool({ name: 'memory_query', arguments: { context: 'content' } });
    const q1Text = (q1.content as Array<{ type: string; text: string }>).find(c => c.type === 'text')?.text ?? '';
    const q1Entries = (JSON.parse(q1Text) as { entries: Array<{ content: string }> }).entries;
    expect(q1Entries.map(e => e.content)).toContain('original content');

    const amendResult = await f.client.callTool({ name: 'memory_amend', arguments: { id, content: 'updated content' } });
    const amendText = (amendResult.content as Array<{ type: string; text: string }>)
      .find(c => c.type === 'text')?.text ?? '';
    const { id: amendedId } = JSON.parse(amendText) as { id: string };

    const q2 = await f.client.callTool({ name: 'memory_query', arguments: { context: 'content' } });
    const q2Text = (q2.content as Array<{ type: string; text: string }>).find(c => c.type === 'text')?.text ?? '';
    const q2Entries = (JSON.parse(q2Text) as { entries: Array<{ content: string }> }).entries;
    const q2Contents = q2Entries.map(e => e.content);
    expect(q2Contents).toContain('updated content');
    expect(q2Contents).not.toContain('original content');

    await f.client.callTool({ name: 'memory_redact', arguments: { id: amendedId } });

    const q3 = await f.client.callTool({ name: 'memory_query', arguments: { context: 'content' } });
    const q3Text = (q3.content as Array<{ type: string; text: string }>).find(c => c.type === 'text')?.text ?? '';
    const q3Entries = (JSON.parse(q3Text) as { entries: Array<{ content: string }> }).entries;
    expect(q3Entries.map(e => e.content)).not.toContain('updated content');

    const alive = await f.client.listTools();
    expect(alive.tools).toBeDefined();
  });
});
