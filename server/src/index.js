/**
 * 石亭 ERP 后端入口
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const roomRoutes = require('./routes/room');
const authRoutes = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// API 路由
app.use('/api', authRoutes);
app.use('/api', roomRoutes);

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ ok: true, message: '石亭 ERP API' });
});

app.listen(PORT, () => {
  console.log(`石亭 ERP 后端已启动: http://localhost:${PORT}`);
});
