// POST /api/ask — answers a visitor's question about Henry with Claude Haiku.
// Body: { question }. Responds { answer, pages } (page ids from the site), or
// { error } with a message fit to show the visitor.
// Needs ANTHROPIC_API_KEY: a Vercel environment variable in production, or
// .env.local when running `npm run dev`.
import Anthropic from '@anthropic-ai/sdk';
import { assistantContext, readAnswer } from './_lib/assistant.js';
import { liveSite } from './_lib/siteContent.js';

const MODEL = 'claude-haiku-5-5';
const MAX_QUESTION_LENGTH = 500;
// Answers are a few sentences; the cap also bounds cost per request
const MAX_TOKENS = 1024;
// How long an instance reuses the site content it last read
const CONTENT_MAX_AGE_MS = 60_000;

// Per-instance throttle. Fluid Compute reuses instances, so this catches casual
// hammering; add a Vercel Firewall rate-limit rule for a hard limit.
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 10;
const recentRequests = new Map();

function isRateLimited(ip) {
  const now = Date.now();
  const times = (recentRequests.get(ip) || []).filter(time => now - time < WINDOW_MS);
  times.push(now);
  recentRequests.set(ip, times);
  if (recentRequests.size > 5000) recentRequests.clear();
  return times.length > MAX_PER_WINDOW;
}

let client = null;

const reply = (body, status = 200) => Response.json(body, { status });

export async function POST(request) {
  // Only the site's own pages may call this from a browser
  const origin = request.headers.get('origin');
  if (origin && new URL(origin).host !== request.headers.get('host')) {
    return reply({ error: 'Not allowed.' }, 403);
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
  if (isRateLimited(ip)) {
    return reply({ error: 'Too many questions at once. Try again in a minute.' }, 429);
  }

  let question;
  try {
    ({ question } = await request.json());
  } catch {
    return reply({ error: 'Send a question.' }, 400);
  }
  question = typeof question === 'string' ? question.trim() : '';
  if (!question) return reply({ error: 'Send a question.' }, 400);
  if (question.length > MAX_QUESTION_LENGTH) {
    return reply({ error: `Keep questions under ${MAX_QUESTION_LENGTH} characters.` }, 400);
  }

  // The key comes from the environment; without it there's nothing to call
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY is not set');
    return reply({ error: 'Answers aren’t set up yet.' }, 503);
  }
  client ??= new Anthropic();

  try {
    const { pageIds, systemPrompt, outputSchema } = assistantContext((await liveSite({ maxAgeMs: CONTENT_MAX_AGE_MS })).doc);
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      // Short factual answers from a fixed context don't need deep thinking
      output_config: {
        effort: 'low',
        format: { type: 'json_schema', schema: outputSchema },
      },
      system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: `<question>${question}</question>` }],
    });
    return reply(readAnswer(message, pageIds));
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) {
      return reply({ error: 'Lots of questions right now. Try again in a minute.' }, 429);
    }
    if (error instanceof Anthropic.AuthenticationError) {
      console.error('Anthropic API key rejected:', error.message);
      return reply({ error: 'Answers aren’t set up yet.' }, 503);
    }
    if (error instanceof Anthropic.APIError) {
      console.error(`Anthropic API error ${error.status}:`, error.message);
    } else {
      console.error('Couldn’t answer:', error);
    }
    return reply({ error: 'Couldn’t answer that right now.' }, 502);
  }
}
