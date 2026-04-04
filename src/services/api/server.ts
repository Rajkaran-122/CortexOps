import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { Agent } from '@/core/orchestrator/index.js';
import { getSetting } from '@/common/utils/config.js';

const app = new Hono();

app.use('*', logger());
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'OPTIONS']
}));

app.onError((err, c) => {
  console.error(`[API Error]`, err);
  return c.json({ success: false, error: 'Internal Server Error' }, 500);
});

app.get('/', (c) => {
  return c.json({
    name: 'CortexOps API Gateway',
    version: '2.0.0-prototype',
    status: 'online',
    timestamp: new Date().toISOString()
  });
});

app.get('/v1/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));
app.post('/v1/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.post('/v1/research', async (c) => {
  const body = await c.req.json();
  const query = body.query;

  if (!query) {
    return c.json({ error: 'Query is required' }, 400);
  }

  // Create an agent instance
  const model = getSetting('modelId', 'gpt-5.4');
  const agent = await Agent.create({ model });

  // For a simple POST, we'll collect the final answer. 
  // Future iterations will support SSE streaming via dynamic task graphs.
  let finalAnswer = '';
  const events = [];

  try {
    for await (const event of agent.run(query)) {
      events.push(event);
      if (event.type === 'done') {
        finalAnswer = event.answer;
      }
    }

    return c.json({
      success: true,
      query,
      answer: finalAnswer,
      events: events.filter(e => e.type !== 'done') // events excluding the final one
    });
  } catch (err) {
    console.error('Agent execution error:', err);
    return c.json({ 
      success: false, 
      error: err instanceof Error ? err.message : 'Unknown agent error' 
    }, 500);
  }
});

const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;
console.log(`CortexOps API Gateway is starting on port ${port}...`);

serve({
  fetch: app.fetch,
  port
});
