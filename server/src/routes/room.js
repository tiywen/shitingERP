/**
 * 房型 / 订房相关路由
 */

const express = require('express');
const { prisma } = require('../lib/prisma');

const router = express.Router();

/**
 * GET /api/room-types
 * 查询可订房型（按入住/离店日期）
 * Query: checkin, checkout, hasDiscount
 */
router.get('/room-types', async (req, res) => {
  try {
    const { checkin, checkout, hasDiscount } = req.query;
    if (!checkin || !checkout) {
      return res.status(400).json({ message: '缺少 checkin 或 checkout 参数' });
    }

    const roomTypes = await prisma.roomType.findMany({
      orderBy: { price: 'asc' },
      include: { images: { orderBy: { sortOrder: 'asc' } } },
    });

    const baseUrl = (req.protocol && req.get('host')) ? `${req.protocol}://${req.get('host')}` : '';
    const hasDis = hasDiscount === 'true';
    const list = roomTypes.map((rt) => {
      const price = Number(rt.price);
      const discountPrice = Number(rt.discountPrice);
      const displayPrice = hasDis ? discountPrice : price;
      const imageUrls = (rt.images || []).map((img) => `${baseUrl}/uploads/${img.path}`);
      const imageUrl = imageUrls[0] || null;
      return {
        id: rt.id,
        name: rt.name,
        typeName: rt.typeName,
        roomNo: rt.roomNo,
        roomName: rt.roomName,
        bedType: rt.bedType || '',
        maxOccupancy: rt.maxOccupancy,
        price,
        discountPrice,
        originalPrice: rt.originalPrice != null ? Number(rt.originalPrice) : price,
        displayPrice,
        hasDiscount: hasDis && discountPrice < price,
        imageUrl,
        imageUrls,
      };
    });

    res.json({ list });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '服务器错误' });
  }
});

/**
 * POST /api/orders
 * 创建订单
 */
router.post('/orders', async (req, res) => {
  try {
    const {
      roomTypeId,
      checkin,
      checkout,
      nights,
      pricePerNight,
      totalAmount,
      guestName,
      guestPhone,
      arriveTime,
      remark,
      userId,
    } = req.body;

    if (!roomTypeId || !checkin || !checkout || !guestName || !guestPhone) {
      return res.status(400).json({ message: '缺少必填参数' });
    }

    const order = await prisma.order.create({
      data: {
        userId: userId || null,
        roomTypeId: Number(roomTypeId),
        checkinDate: new Date(checkin),
        checkoutDate: new Date(checkout),
        nights: Number(nights),
        pricePerNight,
        totalAmount,
        guestName,
        guestPhone,
        arriveTime: arriveTime || null,
        remark: remark || null,
        status: 'pending',
      },
    });

    res.json({ id: order.id, message: '订单提交成功' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '服务器错误' });
  }
});

/**
 * GET /api/orders
 * 获取用户订单列表
 * Query: userId
 */
router.get('/orders', async (req, res) => {
  try {
    const userId = req.query.userId;
    if (!userId) {
      return res.status(400).json({ message: '缺少 userId 参数' });
    }

    const orders = await prisma.order.findMany({
      where: { userId: parseInt(userId, 10) },
      include: {
        roomType: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const statusMap = {
      pending: '待确认',
      confirmed: '已确认',
      checked_in: '已入住',
      checked_out: '已离店',
      cancelled: '已取消',
    };

    const list = orders.map((o) => ({
      id: o.id,
      roomTypeName: o.roomType.name,
      bedType: o.roomType.bedType,
      maxOccupancy: o.roomType.maxOccupancy,
      checkinDate: o.checkinDate.toISOString().slice(0, 10),
      checkoutDate: o.checkoutDate.toISOString().slice(0, 10),
      nights: o.nights,
      totalAmount: Number(o.totalAmount),
      guestName: o.guestName,
      guestPhone: o.guestPhone,
      status: o.status,
      statusText: statusMap[o.status] || o.status,
      createdAt: o.createdAt.toISOString(),
    }));

    res.json({ list });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '服务器错误' });
  }
});

module.exports = router;
