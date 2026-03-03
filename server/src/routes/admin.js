/**
 * 后台管理 API - 所有表的 CRUD
 */

const path = require('path');
const fs = require('fs');
const express = require('express');
const multer = require('multer');
const { prisma } = require('../lib/prisma');

const router = express.Router({ mergeParams: true });

const UPLOADS_DIR = path.join(__dirname, '../../uploads');
const ROOM_TYPE_IMAGES_MAX = 10;
const ALLOWED_MIMES = ['image/png', 'image/jpeg', 'image/jpg'];

const MODELS = {
  user: prisma.user,
  roomType: prisma.roomType,
  room: prisma.room,
  order: prisma.order,
  workOrder: prisma.workOrder,
  facility: prisma.facility,
  facilityBooking: prisma.facilityBooking,
  invoice: prisma.invoice,
};

const INCLUDES = {
  room: { roomType: true },
  order: { roomType: true, user: true },
  workOrder: { user: true, room: true },
  facilityBooking: { facility: true, user: true },
  invoice: { order: true, user: true },
  roomType: { images: { orderBy: { sortOrder: 'asc' } } },
};

const DATE_FIELDS = {
  user: ['createdAt', 'updatedAt'],
  roomType: ['createdAt', 'updatedAt'],
  room: [],
  order: ['checkinDate', 'checkoutDate', 'createdAt', 'updatedAt'],
  workOrder: ['createdAt', 'updatedAt'],
  facility: [],
  facilityBooking: ['bookingDate', 'createdAt', 'updatedAt'],
  invoice: ['createdAt', 'updatedAt'],
};

/** 从字符串/数字解析为数字，无效返回 null */
function parseNum(v) {
  if (v == null || v === '') return null;
  const n = Number(String(v).replace(/[^\d.-]/g, ''));
  return isNaN(n) ? null : n;
}


/** POST /api/admin/roomType/import - Excel 批量导入 */
router.post('/roomType/import', async (req, res) => {
  try {
    const { rows } = req.body;
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ message: '请上传有效的 Excel 数据' });
    }

    const norm = (s) => String(s || '').replace(/[\s\n\r]+/g, ' ').trim();
    const getVal = (row, ...keys) => {
      for (const k of keys) {
        const v = row[k];
        if (v != null && v !== '') return v;
      }
      for (const rowKey of Object.keys(row)) {
        if (keys.some((k) => norm(rowKey) === norm(k))) {
          const v = row[rowKey];
          if (v != null && v !== '') return v;
        }
      }
      return null;
    };

    let created = 0;
    const opt = (data, key, val) => {
      if (val != null && val !== '') data[key] = val;
    };
    const optNum = (data, key, val) => {
      const n = parseNum(val);
      if (n != null) data[key] = n;
    };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const typeNameVal = getVal(row, '房型', 'typeName');
      const roomNameVal = getVal(row, '客房名称', 'roomName');
      const name = typeNameVal || roomNameVal;
      if (!name) continue;

      const priceVal = parseNum(getVal(row, '原价', 'originalPrice')) ?? 0;
      const discountVal = parseNum(getVal(row, '会员假日价\n周五周六', '会员平日价\n周日至周四', 'memberWeekendPrice', 'memberWeekdayPrice')) ?? priceVal;

      const data = {
        name: String(name),
        bedType: String(row.bedType || ''),
        maxOccupancy: 2,
        price: priceVal,
        discountPrice: discountVal,
      };

      opt(data, 'roomNo', getVal(row, '房号', 'roomNo'));
      opt(data, 'typeName', typeNameVal);
      opt(data, 'roomName', roomNameVal);
      optNum(data, 'memberWeekdayPrice', getVal(row, '会员平日价\n周日至周四', 'memberWeekdayPrice'));
      optNum(data, 'memberWeekendPrice', getVal(row, '会员假日价\n周五周六', 'memberWeekendPrice'));
      optNum(data, 'platformWeekdayPrice', getVal(row, '平台平日价\n周日至周四', 'platformWeekdayPrice'));
      optNum(data, 'platformWeekendPrice', getVal(row, '平台假日价\n周五周六', 'platformWeekendPrice'));
      optNum(data, 'specialHolidayPrice', getVal(row, '特殊节假日', 'specialHolidayPrice'));
      optNum(data, 'platformPromoWeekday', getVal(row, '平台推广\n平日价', 'platformPromoWeekday'));
      optNum(data, 'platformPromoWeekend', getVal(row, '平台推广\n假日价', 'platformPromoWeekend'));
      optNum(data, 'originalPrice', getVal(row, '原价', 'originalPrice'));
      opt(data, 'descriptionZh', getVal(row, '房型说明 (中)', 'descriptionZh'));
      opt(data, 'descriptionEn', getVal(row, '房型说明 (英)', 'descriptionEn'));

      try {
        await prisma.roomType.create({ data });
        created++;
      } catch (err) {
        console.error('导入失败 第', i + 1, '行:', row);
        throw new Error(`第 ${i + 1} 行导入失败: ${err.message}`);
      }
    }
    res.json({ success: true, created, message: `成功导入 ${created} 条` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || '导入失败' });
  }
});

const roomTypeImagesStorage = multer.diskStorage({
  destination(req, file, cb) {
    const roomTypeId = req.params.id;
    const dir = path.join(UPLOADS_DIR, 'room-types', String(roomTypeId));
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `${Date.now()}${ext}`);
  },
});

const uploadRoomTypeImage = multer({
  storage: roomTypeImagesStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter(req, file, cb) {
    if (ALLOWED_MIMES.includes(file.mimetype)) cb(null, true);
    else cb(new Error('仅支持 PNG/JPG 图片'));
  },
}).single('image');

/** GET /api/admin/roomType/:id/images - 房型图列表 */
router.get('/roomType/:id/images', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const images = await prisma.roomTypeImage.findMany({
      where: { roomTypeId: id },
      orderBy: { sortOrder: 'asc' },
    });
    const baseUrl = (req.protocol && req.get('host')) ? `${req.protocol}://${req.get('host')}` : '';
    const list = images.map((img) => ({
      id: img.id,
      path: img.path,
      url: `${baseUrl}/uploads/${img.path}`,
      sortOrder: img.sortOrder,
    }));
    res.json({ list });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || '服务器错误' });
  }
});

/** POST /api/admin/roomType/:id/images - 上传房型图（最多 10 张） */
router.post('/roomType/:id/images', (req, res, next) => {
  uploadRoomTypeImage(req, res, async (err) => {
    if (err) return res.status(400).json({ message: err.message });
    try {
      const roomTypeId = parseInt(req.params.id, 10);
      const count = await prisma.roomTypeImage.count({ where: { roomTypeId } });
      if (count >= ROOM_TYPE_IMAGES_MAX) {
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        return res.status(400).json({ message: `每个房型最多上传 ${ROOM_TYPE_IMAGES_MAX} 张图片` });
      }
      const relativePath = path.relative(UPLOADS_DIR, req.file.path).replace(/\\/g, '/');
      const image = await prisma.roomTypeImage.create({
        data: { roomTypeId, path: relativePath, sortOrder: count },
      });
      const baseUrl = (req.protocol && req.get('host')) ? `${req.protocol}://${req.get('host')}` : '';
      res.json({
        id: image.id,
        path: image.path,
        url: `${baseUrl}/uploads/${image.path}`,
        sortOrder: image.sortOrder,
      });
    } catch (e) {
      if (req.file && req.file.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      console.error(e);
      res.status(500).json({ message: e.message || '上传失败' });
    }
  });
});

/** DELETE /api/admin/roomType/:id/images/:imageId - 删除房型图 */
router.delete('/roomType/:id/images/:imageId', async (req, res) => {
  try {
    const imageId = parseInt(req.params.imageId, 10);
    const image = await prisma.roomTypeImage.findFirst({
      where: { id: imageId, roomTypeId: parseInt(req.params.id, 10) },
    });
    if (!image) return res.status(404).json({ message: '图片不存在' });
    const fullPath = path.join(UPLOADS_DIR, image.path);
    if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    await prisma.roomTypeImage.delete({ where: { id: imageId } });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || '服务器错误' });
  }
});

/** 将 Prisma 结果转为可 JSON 序列化的对象（Date/Decimal/关联等） */
function toJson(obj) {
  if (!obj) return null;
  const o = { ...obj };
  for (const k of Object.keys(o)) {
    if (o[k] instanceof Date) o[k] = o[k].toISOString();
    else if (o[k] && typeof o[k] === 'object' && o[k].constructor?.name === 'Decimal') o[k] = Number(o[k]);
    else if (k === 'images' && Array.isArray(o[k])) {
      o[k] = o[k].map((img) => ({ id: img.id, path: img.path, sortOrder: img.sortOrder }));
    }
  }
  return o;
}

/** GET /api/admin/restaurant-bookings - 仅餐厅预约列表（含用户、设施） */
router.get('/restaurant-bookings', async (req, res) => {
  try {
    const facility = await prisma.facility.findFirst({ where: { name: '餐厅' } });
    if (!facility) return res.json({ list: [] });

    const list = await prisma.facilityBooking.findMany({
      where: { facilityId: facility.id },
      include: { facility: true, user: true },
      orderBy: [{ bookingDate: 'desc' }, { timeSlot: 'asc' }],
    });
    const mealLabels = { breakfast: '早餐', lunch: '午餐', dinner: '晚餐' };
    const typeLabels = { table: '桌餐', individual: '单人餐' };
    const statusLabels = { pending: '已提交', confirmed: '已确认', cancelled: '已取消' };
    const out = list.map((b) => {
      const u = b.user;
      return {
        id: b.id,
        userId: b.userId,
        userName: u ? (u.nickname || u.name || u.phone || `用户${b.userId}`) : `用户${b.userId}`,
        userPhone: u ? u.phone : '',
        facilityName: b.facility ? b.facility.name : '',
        bookingDate: b.bookingDate instanceof Date ? b.bookingDate.toISOString().slice(0, 10) : b.bookingDate,
        timeSlot: b.timeSlot,
        mealPeriod: b.mealPeriod,
        mealLabel: mealLabels[b.mealPeriod] || b.mealPeriod || '-',
        bookingType: b.bookingType,
        bookingTypeLabel: typeLabels[b.bookingType] || b.bookingType || '-',
        headcount: b.headcount,
        remark: b.remark,
        status: b.status,
        statusLabel: statusLabels[b.status] || b.status,
        createdAt: b.createdAt instanceof Date ? b.createdAt.toISOString() : b.createdAt,
      };
    });
    res.json({ list: out });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || '服务器错误' });
  }
});

/** GET /api/admin/restaurant-settings - 餐厅预约设置（每餐人数上限） */
router.get('/restaurant-settings', async (req, res) => {
  try {
    const facility = await prisma.facility.findFirst({ where: { name: '餐厅' } });
    const capacityPerMeal = facility && facility.bookingCapacity != null ? facility.bookingCapacity : 40;
    res.json({ capacityPerMeal });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || '服务器错误' });
  }
});

/** PUT /api/admin/restaurant-settings - 更新餐厅预约每餐人数上限 */
router.put('/restaurant-settings', async (req, res) => {
  try {
    const { capacityPerMeal } = req.body;
    const num = capacityPerMeal != null ? parseInt(capacityPerMeal, 10) : null;
    if (num == null || isNaN(num) || num < 1 || num > 999) {
      return res.status(400).json({ message: '人数上限须为 1～999 的整数' });
    }
    const facility = await prisma.facility.findFirst({ where: { name: '餐厅' } });
    if (!facility) {
      return res.status(404).json({ message: '未找到餐厅设施' });
    }
    await prisma.facility.update({
      where: { id: facility.id },
      data: { bookingCapacity: num },
    });
    res.json({ capacityPerMeal: num });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || '服务器错误' });
  }
});

/** GET /api/admin/:model - 列表 */
router.get('/:model', async (req, res) => {
  try {
    const model = MODELS[req.params.model];
    if (!model) return res.status(404).json({ message: '模型不存在' });

    const include = INCLUDES[req.params.model];
    const list = await model.findMany({ include: include || undefined, orderBy: { id: 'desc' } });
    res.json({ list: list.map(toJson) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || '服务器错误' });
  }
});

/** GET /api/admin/:model/:id - 单条 */
router.get('/:model/:id', async (req, res) => {
  try {
    const model = MODELS[req.params.model];
    if (!model) return res.status(404).json({ message: '模型不存在' });
    const include = INCLUDES[req.params.model];
    const row = await model.findUnique({
      where: { id: parseInt(req.params.id, 10) },
      include: include || undefined,
    });
    if (!row) return res.status(404).json({ message: '记录不存在' });
    res.json(toJson(row));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || '服务器错误' });
  }
});

/** POST /api/admin/:model - 新建 */
router.post('/:model', async (req, res) => {
  try {
    const model = MODELS[req.params.model];
    if (!model) return res.status(404).json({ message: '模型不存在' });

    const data = { ...req.body };
    const dates = DATE_FIELDS[req.params.model] || [];
    for (const d of dates) {
      if (data[d]) data[d] = new Date(data[d]);
    }
    const row = await model.create({ data });
    res.json(toJson(row));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || '服务器错误' });
  }
});

/** PUT /api/admin/:model/:id - 更新 */
router.put('/:model/:id', async (req, res) => {
  try {
    const model = MODELS[req.params.model];
    if (!model) return res.status(404).json({ message: '模型不存在' });

    const data = { ...req.body };
    delete data.id;
    const dates = DATE_FIELDS[req.params.model] || [];
    for (const d of dates) {
      if (data[d]) data[d] = new Date(data[d]);
    }
    const row = await model.update({
      where: { id: parseInt(req.params.id, 10) },
      data,
    });
    res.json(toJson(row));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || '服务器错误' });
  }
});

/** DELETE /api/admin/:model/:id - 删除 */
router.delete('/:model/:id', async (req, res) => {
  try {
    const model = MODELS[req.params.model];
    if (!model) return res.status(404).json({ message: '模型不存在' });
    await model.delete({ where: { id: parseInt(req.params.id, 10) } });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || '服务器错误' });
  }
});

module.exports = router;
