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
const restaurantRoutes = require('./routes/restaurant');
const facilityRoutes = require('./routes/facility');

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
app.use('/api/facilities/restaurant', restaurantRoutes);
app.use('/api/facilities', facilityRoutes);
app.use('/api/admin', adminRoutes);

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ ok: true, message: '石亭 ERP API' });
});

// 绑定 0.0.0.0：真机通过局域网 IP 访问本机后端时才能连上（仅 localhost 时部分环境外网卡收不到）
app.listen(PORT, '0.0.0.0', () => {
  console.log(`石亭 ERP 后端已启动: http://localhost:${PORT}（局域网请用本机 IP:${PORT}）`);
});
