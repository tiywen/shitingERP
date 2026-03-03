/**
 * 餐厅预约 API
 * 规则：每日可预约第二日、第三日、第四日的三餐；桌餐 10 人起订，单人餐可选人数。
 */

const express = require('express');
const { prisma } = require('../lib/prisma');

const router = express.Router({ mergeParams: true });

const DEFAULT_CAPACITY = 40;

// 每餐可选时间段
const TIME_SLOTS_BY_MEAL = {
  breakfast: ['07:00', '07:30', '08:00', '08:30', '09:00'],
  lunch: ['11:00', '11:30', '12:00', '12:30', '13:00'],
  dinner: ['17:00', '17:30', '18:00', '18:30', '19:00'],
};

/** 获取餐厅设施（按名称），找不到返回 null */
async function getRestaurantFacility() {
  const facility = await prisma.facility.findFirst({
    where: { name: '餐厅' },
  });
  return facility;
}

/** 获取“今日”日期（按服务器本地日期） */
function getTodayLocalDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** 可预约日期：第二日、第三日、第四日 */
function getAvailableDates() {
  const today = getTodayLocalDate();
  const base = new Date(today + 'T12:00:00');
  const labels = ['第二日', '第三日', '第四日'];
  return labels.map((label, i) => {
    const d = new Date(base);
    d.setDate(d.getDate() + i + 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${day}`;
    return { date: dateStr, label };
  });
}

/** 某日某餐已预约人数（pending + confirmed） */
async function getMealBookedCount(facilityId, date, meal) {
  const start = new Date(date + 'T00:00:00');
  const end = new Date(date + 'T23:59:59');
  const list = await prisma.facilityBooking.findMany({
    where: {
      facilityId,
      bookingDate: { gte: start, lte: end },
      mealPeriod: meal,
      status: { in: ['pending', 'confirmed'] },
    },
    select: { headcount: true },
  });
  const total = (list || []).reduce((sum, b) => sum + (Number(b.headcount) || 0), 0);
  return total;
}

/**
 * GET /api/facilities/restaurant/available-dates
 */
router.get('/available-dates', async (req, res) => {
  try {
    const facility = await getRestaurantFacility();
    if (!facility) {
      return res.json({ dates: [] });
    }
    const dates = getAvailableDates();
    res.json({ dates });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || '服务器错误' });
  }
});

/**
 * GET /api/facilities/restaurant/time-slots?date=YYYY-MM-DD&meal=breakfast|lunch|dinner
 * 返回时段列表及该餐已约人数、上限，前端用 currentTotal + 用户选择人数 判断是否超额
 */
router.get('/time-slots', async (req, res) => {
  try {
    const { date, meal } = req.query;
    if (!date || !meal) {
      return res.status(400).json({ message: '缺少 date 或 meal 参数' });
    }
    const slots = TIME_SLOTS_BY_MEAL[meal];
    if (!slots) {
      return res.status(400).json({ message: '无效餐次' });
    }
    const facility = await getRestaurantFacility();
    let currentTotal = 0;
    const limit = facility ? (facility.bookingCapacity != null ? facility.bookingCapacity : DEFAULT_CAPACITY) : DEFAULT_CAPACITY;
    if (facility) {
      currentTotal = await getMealBookedCount(facility.id, date, meal);
    }
    const list = slots.map((value) => ({ value, label: value }));
    res.json({ list, currentTotal, limit });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || '服务器错误' });
  }
});

/**
 * GET /api/facilities/restaurant/capacity?date=YYYY-MM-DD&meal=xxx
 * 返回该餐已约人数与上限，前端用 currentTotal + 预约人数 判断是否超额
 */
router.get('/capacity', async (req, res) => {
  try {
    const { date, meal } = req.query;
    if (!date || !meal) {
      return res.status(400).json({ message: '缺少 date 或 meal 参数' });
    }
    const facility = await getRestaurantFacility();
    if (!facility) {
      return res.json({ currentTotal: 0, limit: DEFAULT_CAPACITY });
    }
    const currentTotal = await getMealBookedCount(facility.id, date, meal);
    const limit = facility.bookingCapacity != null ? facility.bookingCapacity : DEFAULT_CAPACITY;
    res.json({ currentTotal, limit });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || '服务器错误' });
  }
});

/**
 * POST /api/facilities/restaurant/book
 * Body: { userId, date, meal, bookingType, headcount, timeSlot, remark? }
 */
router.post('/book', async (req, res) => {
  try {
    const { userId, date, meal, bookingType, headcount, timeSlot, remark } = req.body;

    if (!userId || !date || !meal || !bookingType || headcount == null || !timeSlot) {
      return res.status(400).json({ message: '缺少必填参数：userId、date、meal、bookingType、headcount、timeSlot' });
    }

    const facility = await getRestaurantFacility();
    if (!facility) {
      return res.status(503).json({ message: '餐厅预约功能暂未配置' });
    }
    const allowedDates = getAvailableDates().map((d) => d.date);
    if (!allowedDates.includes(date)) {
      return res.status(400).json({ message: '所选日期不在可预约范围内（仅限第二日、第三日、第四日）' });
    }

    const slots = TIME_SLOTS_BY_MEAL[meal];
    if (!slots || !slots.includes(timeSlot)) {
      return res.status(400).json({ message: '所选时间段无效' });
    }

    const num = parseInt(headcount, 10);
    if (Number.isNaN(num) || num < 1) {
      return res.status(400).json({ message: '人数至少为 1' });
    }
    if (bookingType === 'table' && num < 10) {
      return res.status(400).json({ message: '桌餐至少 10 人起订' });
    }
    if (bookingType === 'individual' && num > 50) {
      return res.status(400).json({ message: '单人餐人数不超过 50' });
    }

    const currentTotal = await getMealBookedCount(facility.id, date, meal);
    const limit = facility.bookingCapacity != null ? facility.bookingCapacity : DEFAULT_CAPACITY;
    if (currentTotal + num > limit) {
      return res.status(400).json({ message: '对不起，预约已满' });
    }

    const booking = await prisma.facilityBooking.create({
      data: {
        facilityId: facility.id,
        userId: Number(userId),
        bookingDate: new Date(date + 'T12:00:00'),
        timeSlot: String(timeSlot),
        mealPeriod: meal,
        bookingType: bookingType === 'table' ? 'table' : 'individual',
        headcount: num,
        remark: remark ? String(remark).trim() : null,
        status: 'pending',
      },
    });

    res.json({
      id: booking.id,
      message: '预约提交成功，请等待确认',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || '服务器错误' });
  }
});

/**
 * GET /api/facilities/restaurant/my-bookings?userId=xxx
 */
router.get('/my-bookings', async (req, res) => {
  try {
    const userId = req.query.userId;
    if (!userId) {
      return res.status(400).json({ message: '缺少 userId 参数' });
    }

    const facility = await getRestaurantFacility();
    if (!facility) {
      return res.json({ list: [] });
    }
    const list = await prisma.facilityBooking.findMany({
      where: {
        facilityId: facility.id,
        userId: parseInt(userId, 10),
        status: { not: 'cancelled' },
      },
      orderBy: [{ bookingDate: 'asc' }, { timeSlot: 'asc' }],
      include: { facility: { select: { name: true } } },
    });

    const mealLabels = { breakfast: '早餐', lunch: '午餐', dinner: '晚餐' };
    const typeLabels = { table: '桌餐', individual: '单人餐' };
    const statusLabels = { pending: '已提交', confirmed: '已确认', cancelled: '已取消' };

    const result = list.map((b) => ({
      id: b.id,
      date: b.bookingDate.toISOString().slice(0, 10),
      meal: b.mealPeriod,
      mealLabel: mealLabels[b.mealPeriod] || b.mealPeriod,
      bookingType: b.bookingType,
      bookingTypeLabel: typeLabels[b.bookingType] || b.bookingType,
      headcount: b.headcount,
      timeSlot: b.timeSlot,
      status: b.status,
      statusLabel: statusLabels[b.status] || b.status,
      remark: b.remark,
      createdAt: b.createdAt.toISOString(),
    }));

    res.json({ list: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || '服务器错误' });
  }
});

module.exports = router;
