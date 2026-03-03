/**
 * 石亭 ERP 后端入口
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const roomRoutes = require('./routes/room');
const authRoutes = require('./routes/auth');
const workOrderRoutes = require('./routes/workOrder');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// 静态文件：房型图等上传文件
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// API 路由
app.use('/api', authRoutes);
app.use('/api', roomRoutes);
app.use('/api/work-orders', workOrderRoutes);
app.use('/api/admin', adminRoutes);

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ ok: true, message: '石亭 ERP API' });
});

// 部署到服务器时建议 listen(PORT, '0.0.0.0') 以接受外网访问
app.listen(PORT, () => {
  console.log(`石亭 ERP 后端已启动: http://localhost:${PORT}`);
});
