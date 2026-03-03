/**
 * 设施预约 - 用户端「我的预约」通用接口（所有设施）
 */

const express = require('express');
const { prisma } = require('../lib/prisma');

const router = express.Router();

const STATUS_LABELS = { pending: '已提交', confirmed: '已确认', cancelled: '已取消' };
const MEAL_LABELS = { breakfast: '早餐', lunch: '午餐', dinner: '晚餐' };
const TYPE_LABELS = { table: '桌餐', individual: '单人餐' };

/**
 * GET /api/facilities/my-bookings?userId=xxx
 * 当前用户全部设施预约列表（含餐厅的餐次/类型/人数）
 */
router.get('/my-bookings', async (req, res) => {
  try {
    const userId = req.query.userId;
    if (!userId) {
      return res.status(400).json({ message: '缺少 userId 参数' });
    }

    const list = await prisma.facilityBooking.findMany({
      where: { userId: parseInt(userId, 10), status: { not: 'cancelled' } },
      include: { facility: true },
      orderBy: [{ bookingDate: 'desc' }, { timeSlot: 'asc' }],
    });

    const result = list.map((b) => {
      const facilityName = b.facility ? b.facility.name : '设施';
      const isRestaurant = facilityName === '餐厅';
      return {
        id: b.id,
        facilityId: b.facilityId,
        facilityName,
        date: b.bookingDate instanceof Date ? b.bookingDate.toISOString().slice(0, 10) : b.bookingDate,
        timeSlot: b.timeSlot,
        status: b.status,
        statusLabel: STATUS_LABELS[b.status] || b.status,
        remark: b.remark,
        createdAt: b.createdAt instanceof Date ? b.createdAt.toISOString() : b.createdAt,
        ...(isRestaurant && {
          mealPeriod: b.mealPeriod,
          mealLabel: MEAL_LABELS[b.mealPeriod] || b.mealPeriod,
          bookingType: b.bookingType,
          bookingTypeLabel: TYPE_LABELS[b.bookingType] || b.bookingType,
          headcount: b.headcount,
        }),
      };
    });

    res.json({ list: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || '服务器错误' });
  }
});

module.exports = router;
