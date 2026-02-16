const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// 内存存储（重启会丢数据，后面可以换数据库）
const judgments = [];

app.post('/judgments', (req, res) => {
  const { entity, action, scope, timestamp } = req.body;

  if (!entity || !action) {
    return res.status(400).json({ error: 'entity and action are required' });
  }

  const id = 'jgd_' + Date.now() + Math.random().toString(36).substring(2, 6);

  const judgment = {
    id,
    entity,
    action,
    scope: scope || {},
    timestamp: timestamp || new Date().toISOString(),
    recorded_at: new Date().toISOString()
  };

  judgments.push(judgment);

  res.json({
    id: judgment.id,
    status: 'recorded',
    timestamp: judgment.recorded_at
  });
});

app.get('/judgments/:id', (req, res) => {
  const judgment = judgments.find(j => j.id === req.params.id);
  if (!judgment) {
    return res.status(404).json({ error: 'Judgment not found' });
  }
  res.json(judgment);
});

app.listen(port, () => {
  console.log(`HJS API running at http://localhost:${port}`);
});