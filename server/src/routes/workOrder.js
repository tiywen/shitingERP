/**
 * 工单相关路由
 */

const express = require('express');
const { prisma } = require('../lib/prisma');

const router = express.Router();

const TYPE_NAMES = {
  heating: '开关地暖',
  ventilation: '开关门窗通风',
  repair: '报修',
  delivery: '快递取送',
  other: '其它需求',
};

const STATUS_MAP = {
  submitted: '已提交',
  in_progress: '处理中',
  completed: '已完成',
};

/**
 * POST /api/work-orders
 * 用户提交工单
 */
router.post('/', async (req, res) => {
  try {
    const { userId, roomId, type, roomKind, content } = req.body;

    if (!userId || !type) {
      return res.status(400).json({ message: '缺少必填参数 userId、type' });
    }
    if (!content || !String(content).trim()) {
      return res.status(400).json({ message: '请填写服务要求' });
    }

    const order = await prisma.workOrder.create({
      data: {
        userId: Number(userId),
        roomId: roomId ? Number(roomId) : null,
        type,
        roomKind: roomKind || null,
        content: String(content).trim(),
        status: 'submitted',
      },
    });

    res.json({ id: order.id, message: '工单提交成功' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || '服务器错误' });
  }
});

/**
 * GET /api/work-orders
 * 获取用户工单列表
 * Query: userId
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.query.userId;
    if (!userId) {
      return res.status(400).json({ message: '缺少 userId 参数' });
    }

    const list = await prisma.workOrder.findMany({
      where: { userId: parseInt(userId, 10) },
      orderBy: { createdAt: 'desc' },
    });

    const result = list.map((o) => {
      const created = o.createdAt.toISOString();
      return {
        id: o.id,
        type: o.type,
        typeName: TYPE_NAMES[o.type] || o.type,
        status: o.status,
        statusText: STATUS_MAP[o.status] || o.status,
        roomKind: o.roomKind,
        content: o.content,
        adminRemark: o.adminRemark,
        createdAt: created,
        createdAtText: created.slice(0, 16).replace('T', ' '),
      };
    });

    res.json({ list: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '服务器错误' });
  }
});

module.exports = router;
