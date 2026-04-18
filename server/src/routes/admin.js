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
  fixedAsset: prisma.fixedAsset,
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
  fixedAsset: ['purchaseTime', 'createdAt', 'updatedAt'],
};

/** 从字符串/数字解析为数字，无效返回 null */
function parseNum(v) {
  if (v == null || v === '') return null;
  const n = Number(String(v).replace(/[^\d.-]/g, ''));
  return isNaN(n) ? null : n;
}

/** 固定资产 Excel 规定表头（顺序可任意，但必须全部存在） */
const FIXED_ASSET_HEADERS = ['序号', '资产类别', '资产名称', '规格型号', '数量', '单位', '价格', '采购时间', '使用年限', '使用情况', '产品序列号', '产品外观', '存放地点', '日常管理人', '备注'];
/** 导入时可空的三项，其余均为必填 */
const FIXED_ASSET_OPTIONAL = ['产品序列号', '产品外观', '备注', '规格型号'];
const FIXED_ASSET_REQUIRED = FIXED_ASSET_HEADERS.filter((h) => !FIXED_ASSET_OPTIONAL.includes(h));

function normHeader(s) {
  return String(s ?? '').replace(/\s+/g, ' ').trim();
}

function isEmpty(v) {
  return v == null || String(v).trim() === '';
}

function parseDate(v) {
  if (v == null || v === '') return null;
  const s = String(v).trim();
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

/** POST /api/admin/fixedAsset/import - 固定资产 Excel 导入（表头与格式校验） */
router.post('/fixedAsset/import', async (req, res) => {
  try {
    const { rows } = req.body;
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ message: '请上传有效的 Excel 数据' });
    }
    const norm = normHeader;
    const firstRow = rows[0] || {};
    const headers = Object.keys(firstRow).map(norm).filter(Boolean);
    const required = FIXED_ASSET_HEADERS.map(norm);
    const missing = required.filter((h) => !headers.includes(h));
    if (missing.length) {
      return res.status(400).json({ message: `表头与规定不一致，缺少：${missing.join('、')}` });
    }
    const keyMap = {};
    Object.keys(firstRow).forEach((k) => {
      keyMap[norm(k)] = k;
    });
    const get = (row, label) => row[keyMap[norm(label)]];
    const serialNos = rows.map((r) => parseNum(get(r, '序号'))).filter((n) => n != null);
    const seen = new Set();
    const duplicates = [];
    for (const no of serialNos) {
      if (seen.has(no)) {
        if (!duplicates.includes(no)) duplicates.push(no);
      } else {
        seen.add(no);
      }
    }
    if (duplicates.length > 0) {
      return res.status(400).json({ message: `导入失败：存在重复序号，请检查后重试。重复序号：${duplicates.join('、')}` });
    }
    let created = 0;
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      for (const label of FIXED_ASSET_REQUIRED) {
        const val = get(row, label);
        if (isEmpty(val)) {
          return res.status(400).json({ message: `第 ${i + 1} 行「${label}」为必填项，不能为空` });
        }
      }
      const quantity = parseNum(get(row, '数量'));
      const price = parseNum(get(row, '价格'));
      const purchaseTime = parseDate(get(row, '采购时间'));
      const serialNo = parseNum(get(row, '序号'));
      if (quantity === null || quantity < 0) {
        return res.status(400).json({ message: `第 ${i + 1} 行「数量」格式应为有效数字` });
      }
      if (price === null) {
        return res.status(400).json({ message: `第 ${i + 1} 行「价格」格式应为有效数字` });
      }
      if (!purchaseTime) {
        return res.status(400).json({ message: `第 ${i + 1} 行「采购时间」格式应为有效日期` });
      }
      if (serialNo === null) {
        return res.status(400).json({ message: `第 ${i + 1} 行「序号」格式应为数字` });
      }
      const data = {
        serialNo,
        category: get(row, '资产类别') ?? undefined,
        name: get(row, '资产名称') ?? undefined,
        specification: get(row, '规格型号') ?? undefined,
        quantity,
        unit: get(row, '单位') ?? undefined,
        price,
        purchaseTime,
        serviceLife: get(row, '使用年限') ?? undefined,
        usageStatus: get(row, '使用情况') ?? undefined,
        productSerialNo: get(row, '产品序列号') ?? undefined,
        productAppearance: get(row, '产品外观') ?? undefined,
        storageLocation: get(row, '存放地点') ?? undefined,
        dailyManager: get(row, '日常管理人') ?? undefined,
        remark: get(row, '备注') ?? undefined,
      };
      const clean = {};
      Object.keys(data).forEach((k) => {
        let v = data[k];
        if (v === undefined || v === '') return;
        if (typeof v === 'object' && v !== null && !(v instanceof Date)) {
          v = v.value != null ? v.value : (typeof v.toString === 'function' ? v.toString() : String(v));
          if (v === '[object Object]' || (typeof v === 'string' && !v.trim())) return;
          v = typeof v === 'string' ? v.trim() : v;
        }
        if (k === 'purchaseTime') {
          if (!(v instanceof Date)) {
            const raw = (v && typeof v === 'object' && v.value != null) ? v.value : v;
            v = parseDate(raw) || null;
          }
          if (!v || !(v instanceof Date)) return;
        }
        if (['serialNo', 'quantity'].includes(k)) v = parseInt(v, 10);
        if (k === 'price') v = Number(v);
        if (['category', 'name', 'specification', 'unit', 'serviceLife', 'usageStatus', 'productSerialNo', 'productAppearance', 'storageLocation', 'dailyManager', 'remark'].includes(k)) {
          v = String(v).trim() || undefined;
          if (v === undefined) return;
        }
        clean[k] = v;
      });
      // 确保日期字段为原生 Date，避免收到 { $type: "DateTime", value } 等对象
      if (clean.purchaseTime != null && typeof clean.purchaseTime === 'object' && !(clean.purchaseTime instanceof Date)) {
        const raw = clean.purchaseTime.value ?? clean.purchaseTime;
        const d = parseDate(raw);
        if (d) clean.purchaseTime = d;
        else return res.status(400).json({ message: `第 ${i + 1} 行「采购时间」无法解析为有效日期` });
      }
      try {
        await prisma.fixedAsset.create({ data: clean });
        created++;
      } catch (err) {
        console.error('固定资产导入失败 第', i + 1, '行:', row);
        return res.status(400).json({ message: `第 ${i + 1} 行导入失败: ${err.message}` });
      }
    }
    res.json({ success: true, created, message: `成功导入 ${created} 条` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || '导入失败' });
  }
});

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

const FIXED_ASSET_IMAGES_MAX = 10;
const fixedAssetImagesStorage = multer.diskStorage({
  destination(req, file, cb) {
    const id = req.params.id;
    const dir = path.join(UPLOADS_DIR, 'fixed-assets', String(id));
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `${Date.now()}${ext}`);
  },
});
const uploadFixedAssetImage = multer({
  storage: fixedAssetImagesStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter(req, file, cb) {
    if (ALLOWED_MIMES.includes(file.mimetype)) cb(null, true);
    else cb(new Error('仅支持 PNG/JPG 图片'));
  },
}).single('image');

/** GET /api/admin/fixedAsset/:id/images - 固定资产产品外观图列表 */
router.get('/fixedAsset/:id/images', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const images = await prisma.fixedAssetImage.findMany({
      where: { fixedAssetId: id },
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

/** POST /api/admin/fixedAsset/:id/images - 上传产品外观图（最多 10 张） */
router.post('/fixedAsset/:id/images', (req, res, next) => {
  uploadFixedAssetImage(req, res, async (err) => {
    if (err) return res.status(400).json({ message: err.message });
    try {
      const fixedAssetId = parseInt(req.params.id, 10);
      const count = await prisma.fixedAssetImage.count({ where: { fixedAssetId } });
      if (count >= FIXED_ASSET_IMAGES_MAX) {
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        return res.status(400).json({ message: `每条资产最多上传 ${FIXED_ASSET_IMAGES_MAX} 张图片` });
      }
      const relativePath = path.relative(UPLOADS_DIR, req.file.path).replace(/\\/g, '/');
      const image = await prisma.fixedAssetImage.create({
        data: { fixedAssetId, path: relativePath, sortOrder: count },
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

/** DELETE /api/admin/fixedAsset/:id/images/:imageId - 删除产品外观图 */
router.delete('/fixedAsset/:id/images/:imageId', async (req, res) => {
  try {
    const imageId = parseInt(req.params.imageId, 10);
    const image = await prisma.fixedAssetImage.findFirst({
      where: { id: imageId, fixedAssetId: parseInt(req.params.id, 10) },
    });
    if (!image) return res.status(404).json({ message: '图片不存在' });
    const fullPath = path.join(UPLOADS_DIR, image.path);
    if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    await prisma.fixedAssetImage.delete({ where: { id: imageId } });
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

/** GET /api/admin/ktv-bookings - K歌房预约列表（谁约了哪个时段，状态：已预约/已取消） */
router.get('/ktv-bookings', async (req, res) => {
  try {
    const facility = await prisma.facility.findFirst({ where: { name: 'K歌房' } });
    if (!facility) return res.json({ list: [] });
    const list = await prisma.facilityBooking.findMany({
      where: { facilityId: facility.id },
      include: { facility: true, user: true },
      orderBy: [{ bookingDate: 'desc' }, { timeSlot: 'asc' }],
    });
    const statusLabels = { confirmed: '已预约', cancelled: '已取消' };
    const out = list.map((b) => {
      const u = b.user;
      return {
        id: b.id,
        userId: b.userId,
        userName: u ? (u.nickname || u.name || u.phone || `用户${b.userId}`) : `用户${b.userId}`,
        userPhone: u ? u.phone : '',
        bookingDate: b.bookingDate instanceof Date ? b.bookingDate.toISOString().slice(0, 10) : b.bookingDate,
        timeSlot: b.timeSlot,
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

/** GET /api/admin/pickleball-bookings - 匹克球场预约列表 */
router.get('/pickleball-bookings', async (req, res) => {
  try {
    const facility = await prisma.facility.findFirst({ where: { name: '匹克球场' } });
    if (!facility) return res.json({ list: [] });
    const list = await prisma.facilityBooking.findMany({
      where: { facilityId: facility.id },
      include: { facility: true, user: true },
      orderBy: [{ bookingDate: 'desc' }, { timeSlot: 'asc' }],
    });
    const statusLabels = { confirmed: '已预约', cancelled: '已取消' };
    const out = list.map((b) => {
      const u = b.user;
      return {
        id: b.id,
        userId: b.userId,
        userName: u ? (u.nickname || u.name || u.phone || `用户${b.userId}`) : `用户${b.userId}`,
        userPhone: u ? u.phone : '',
        bookingDate: b.bookingDate instanceof Date ? b.bookingDate.toISOString().slice(0, 10) : b.bookingDate,
        timeSlot: b.timeSlot,
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

/** GET /api/admin/:model - 列表 */
router.get('/:model', async (req, res) => {
  try {
    const model = MODELS[req.params.model];
    if (!model) return res.status(404).json({ message: '模型不存在' });

    const include = INCLUDES[req.params.model];
    let list = await model.findMany({ include: include || undefined, orderBy: { id: 'desc' } });

    if (req.params.model === 'fixedAsset' && list.length > 0) {
      try {
        const ids = list.map((r) => r.id);
        const images = await prisma.fixedAssetImage.findMany({
          where: { fixedAssetId: { in: ids } },
          orderBy: { sortOrder: 'asc' },
        });
        const byAsset = {};
        images.forEach((img) => {
          if (!byAsset[img.fixedAssetId]) byAsset[img.fixedAssetId] = [];
          byAsset[img.fixedAssetId].push({ id: img.id, path: img.path, sortOrder: img.sortOrder });
        });
        list = list.map((row) => ({ ...row, images: byAsset[row.id] || [] }));
      } catch (e) {
        list = list.map((row) => ({ ...row, images: [] }));
      }
    }

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
    if (err.code === 'P2003') {
      return res.status(409).json({
        message: '该记录仍存在关联数据（如订单、房间、工单等），无法删除。请先处理关联数据后再试。',
      });
    }
    res.status(500).json({ message: err.message || '服务器错误' });
  }
});

module.exports = router;
