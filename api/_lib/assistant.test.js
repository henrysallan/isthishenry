import { describe, it, expect } from 'vitest';
import { DECLINE, OUTPUT_SCHEMA, PAGE_IDS, SYSTEM_PROMPT, readAnswer } from './assistant.js';
import { POST } from '../ask.js';

const textMessage = (text, stop_reason = 'end_turn') => ({ stop_reason, content: [{ type: 'text', text }] });

describe('assistant context', () => {
  it('describes every searchable page and limits replies to those ids', () => {
    for (const id of PAGE_IDS) expect(SYSTEM_PROMPT).toContain(`<page id="${id}"`);
    expect(OUTPUT_SCHEMA.properties.pages.items.enum).toEqual(PAGE_IDS);
  });
});

describe('readAnswer', () => {
  it('keeps known page ids only, without repeats, at most three', () => {
    const [a, b, c, d] = PAGE_IDS;
    const reply = readAnswer(textMessage(JSON.stringify({ answer: ' Yes. ', pages: [a, 'nope', a, b, c, d] })));
    expect(reply).toEqual({ answer: 'Yes.', pages: [a, b, c] });
  });

  it('declines politely when the model refuses', () => {
    expect(readAnswer({ stop_reason: 'refusal', content: [] })).toEqual({ answer: DECLINE, pages: [] });
  });

  it('throws on a cut-off or empty reply', () => {
    expect(() => readAnswer(textMessage('{"answer": "Hen', 'max_tokens'))).toThrow();
    expect(() => readAnswer(textMessage(JSON.stringify({ answer: '', pages: [] })))).toThrow();
  });
});

describe('POST /api/ask validation', () => {
  const ask = (body, headers = {}) => POST(new Request('http://isthishenry.test/api/ask', {
    method: 'POST',
    headers: { host: 'isthishenry.test', 'content-type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  }));

  it('rejects other sites', async () => {
    const response = await ask({ question: 'Hi' }, { origin: 'https://elsewhere.example' });
    expect(response.status).toBe(403);
  });

  it('rejects missing, empty and overlong questions', async () => {
    expect((await ask('not json')).status).toBe(400);
    expect((await ask({ question: '   ' })).status).toBe(400);
    expect((await ask({ question: 'x'.repeat(501) })).status).toBe(400);
  });
});
