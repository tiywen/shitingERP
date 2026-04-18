/**
 * 设施预约 - 用户端「我的预约」+ K歌房/匹克球场时段预约
 */

const express = require('express');
const { prisma } = require('../lib/prisma');

const router = express.Router();

// 时段设施：key -> 设施名称
const SLOT_FACILITIES = { ktv: 'K歌房', pickleball: '匹克球场' };
// 开放 9:00-21:00，每 slot 1 小时，共 12 个：09:00～20:00
const SLOT_TIMES = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'];

function getTodayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** 未来 3 天日期 */
function getNext3Days() {
  const base = new Date(getTodayStr() + 'T12:00:00');
  const labels = ['明日', '后天', '大后天'];
  return labels.map((label, i) => {
    const d = new Date(base);
    d.setDate(d.getDate() + i + 1);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return { date: dateStr, label };
  });
}

/** 获取设施（按名称），返回 null 若不存在 */
async function getFacilityByName(name) {
  return prisma.facility.findFirst({ where: { name } });
}

/**
 * GET /api/facilities/slot-availability?facility=ktv|pickleball
 * 返回未来 3 天、每天 9:00-20:00 各时段是否可约
 */
router.get('/slot-availability', async (req, res) => {
  try {
    const facilityKey = req.query.facility;
    const facilityName = SLOT_FACILITIES[facilityKey];
    if (!facilityName) {
      return res.status(400).json({ message: 'facility 须为 ktv 或 pickleball' });
    }
    const facility = await getFacilityByName(facilityName);
    if (!facility) {
      return res.json({
        dates: [],
        hint: `数据库中未找到「${facilityName}」设施。请在服务器进入 server 目录执行：npm run db:seed`,
      });
    }
    const dates = getNext3Days();
    const dateStrs = dates.map((d) => d.date);
    const start = new Date(dateStrs[0] + 'T00:00:00');
    const end = new Date(dateStrs[dateStrs.length - 1] + 'T23:59:59');
    const existing = await prisma.facilityBooking.findMany({
      where: {
        facilityId: facility.id,
        bookingDate: { gte: start, lte: end },
        status: 'confirmed',
      },
      select: { bookingDate: true, timeSlot: true },
    });
    const bookedSet = new Set(
      existing.map((b) => {
        const d = b.bookingDate instanceof Date ? b.bookingDate.toISOString().slice(0, 10) : b.bookingDate;
        return `${d}_${b.timeSlot}`;
      })
    );
    const out = dates.map(({ date, label }) => ({
      date,
      label,
      slots: SLOT_TIMES.map((timeSlot) => {
        const key = `${date}_${timeSlot}`;
        const [h, m] = timeSlot.split(':').map(Number);
        const nextH = (h + 1) % 24;
        const nextStr = `${String(nextH).padStart(2, '0')}:00`;
        return {
          timeSlot,
          label: `${timeSlot}-${nextStr}`,
          available: !bookedSet.has(key),
        };
      }),
    }));
    res.json({ dates: out });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || '服务器错误' });
  }
});

/**
 * POST /api/facilities/slot-book
 * Body: { userId, facility: 'ktv'|'pickleball', slots: [{ date, timeSlot }, ...] }，最多 3 个
 */
router.post('/slot-book', async (req, res) => {
  try {
    const { userId, facility: facilityKey, slots } = req.body;
    if (!userId || !facilityKey || !Array.isArray(slots) || slots.length === 0) {
      return res.status(400).json({ message: '缺少 userId、facility 或 slots' });
    }
    if (slots.length > 3) {
      return res.status(400).json({ message: '每次最多预约 3 个时段' });
    }
    const facilityName = SLOT_FACILITIES[facilityKey];
    if (!facilityName) {
      return res.status(400).json({ message: 'facility 须为 ktv 或 pickleball' });
    }
    const facility = await getFacilityByName(facilityName);
    if (!facility) {
      return res.status(404).json({ message: '未找到该设施' });
    }
    const allowedDates = getNext3Days().map((d) => d.date);
    const allowedSlots = new Set(SLOT_TIMES);
    for (const s of slots) {
      if (!s.date || !s.timeSlot) {
        return res.status(400).json({ message: '每个 slot 须包含 date 和 timeSlot' });
      }
      if (!allowedDates.includes(s.date)) {
        return res.status(400).json({ message: '所选日期不在可约范围内' });
      }
      if (!allowedSlots.has(s.timeSlot)) {
        return res.status(400).json({ message: '所选时段无效' });
      }
    }
    const bookedSet = new Set();
    const datesInSlots = [...new Set(slots.map((s) => s.date))];
    const minDate = datesInSlots.sort()[0];
    const maxDate = datesInSlots[datesInSlots.length - 1];
    const start = new Date(minDate + 'T00:00:00');
    const end = new Date(maxDate + 'T23:59:59');
    const existing = await prisma.facilityBooking.findMany({
      where: {
        facilityId: facility.id,
        bookingDate: { gte: start, lte: end },
        status: 'confirmed',
      },
      select: { bookingDate: true, timeSlot: true },
    });
    existing.forEach((b) => {
      const d = b.bookingDate instanceof Date ? b.bookingDate.toISOString().slice(0, 10) : b.bookingDate;
      bookedSet.add(`${d}_${b.timeSlot}`);
    });
    for (const s of slots) {
      if (bookedSet.has(`${s.date}_${s.timeSlot}`)) {
        return res.status(400).json({ message: `时段 ${s.date} ${s.timeSlot} 已被预约` });
      }
    }
    const created = [];
    for (const s of slots) {
      const b = await prisma.facilityBooking.create({
        data: {
          facilityId: facility.id,
          userId: Number(userId),
          bookingDate: new Date(s.date + 'T12:00:00'),
          timeSlot: s.timeSlot,
          status: 'confirmed',
        },
      });
      created.push({ id: b.id, date: s.date, timeSlot: s.timeSlot });
    }
    res.json({ message: '预约成功', bookings: created });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || '服务器错误' });
  }
});

/**
 * POST /api/facilities/cancel-booking
 * 用户取消 K歌房/匹克球场 时段预约，释放 slot
 * Body: { userId, bookingId }
 */
router.post('/cancel-booking', async (req, res) => {
  try {
    const { userId, bookingId } = req.body;
    if (!userId || !bookingId) {
      return res.status(400).json({ message: '缺少 userId 或 bookingId' });
    }
    const booking = await prisma.facilityBooking.findUnique({
      where: { id: Number(bookingId) },
      include: { facility: true },
    });
    if (!booking) {
      return res.status(404).json({ message: '预约不存在' });
    }
    if (booking.userId !== Number(userId)) {
      return res.status(403).json({ message: '无权操作' });
    }
    const facilityName = booking.facility ? booking.facility.name : '';
    if (facilityName !== 'K歌房' && facilityName !== '匹克球场') {
      return res.status(400).json({ message: '仅支持取消 K歌房、匹克球场 的时段预约' });
    }
    if (booking.status !== 'confirmed') {
      return res.status(400).json({ message: '该预约已取消或不可取消' });
    }
    await prisma.facilityBooking.update({
      where: { id: booking.id },
      data: { status: 'cancelled' },
    });
    res.json({ message: '已取消' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || '服务器错误' });
  }
});

const STATUS_LABELS = { pending: '已提交', confirmed: '已确认', cancelled: '已取消' };
const SLOT_STATUS_LABELS = { confirmed: '已预约', cancelled: '已取消' };
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
      where: { userId: parseInt(userId, 10) },
      include: { facility: true },
      orderBy: [{ bookingDate: 'desc' }, { timeSlot: 'asc' }],
    });

    const result = list.map((b) => {
      const facilityName = b.facility ? b.facility.name : '设施';
      const isRestaurant = facilityName === '餐厅';
      const isSlot = facilityName === 'K歌房' || facilityName === '匹克球场';
      const statusLabel = isSlot ? (SLOT_STATUS_LABELS[b.status] || b.status) : (STATUS_LABELS[b.status] || b.status);
      return {
        id: b.id,
        facilityId: b.facilityId,
        facilityName,
        date: b.bookingDate instanceof Date ? b.bookingDate.toISOString().slice(0, 10) : b.bookingDate,
        timeSlot: b.timeSlot,
        status: b.status,
        statusLabel,
        canCancel: isSlot && b.status === 'confirmed',
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
