/**
 * 认证相关路由 - 手机号登录
 * 支持：1. 微信手机号一键登录 2. 验证码登录
 */

const express = require('express');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

const APP_ID = process.env.WECHAT_APPID;
const APP_SECRET = process.env.WECHAT_SECRET;

let accessTokenCache = { token: null, expires: 0 };

async function getAccessToken() {
  if (accessTokenCache.token && Date.now() < accessTokenCache.expires - 60000) {
    return accessTokenCache.token;
  }
  const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${APP_ID}&secret=${APP_SECRET}`;
  const resp = await fetch(url);
  const data = await resp.json();
  if (data.access_token) {
    accessTokenCache = { token: data.access_token, expires: Date.now() + (data.expires_in || 7200) * 1000 };
    return data.access_token;
  }
  throw new Error(data.errmsg || '获取access_token失败');
}

/** 验证码存储（生产环境建议用 Redis） */
const codeStore = new Map();
const CODE_TTL = 5 * 60 * 1000;
const DEV_CODE = '123456';

function genCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function setCode(phone, code) {
  codeStore.set(phone, { code, expires: Date.now() + CODE_TTL });
}

function verifyCode(phone, code) {
  const entry = codeStore.get(phone);
  if (!entry) return false;
  if (Date.now() > entry.expires) {
    codeStore.delete(phone);
    return false;
  }
  const ok = entry.code === code || (process.env.NODE_ENV !== 'production' && code === DEV_CODE);
  if (ok) codeStore.delete(phone);
  return ok;
}

function toUserJson(user) {
  return {
    userId: user.id,
    role: user.role,
    name: user.name,
    nickname: user.nickname,
    phone: user.phone,
  };
}

/**
 * POST /api/login
 * 保留兼容：微信 code 登录（仅获取 openid，用于匿名态）
 */
router.post('/login', async (req, res) => {
  try {
    const { code } = req.body;
    let openid = null;
    if (APP_ID && APP_SECRET && code) {
      const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${APP_ID}&secret=${APP_SECRET}&js_code=${code}&grant_type=authorization_code`;
      const resp = await fetch(url);
      const data = await resp.json();
      if (data.openid) openid = data.openid;
    }
    if (!openid) openid = 'dev_' + (code || Date.now());

    let user = await prisma.user.findUnique({ where: { openid } });
    if (!user) {
      user = await prisma.user.create({
        data: { openid, role: 'visitor', visitorCode: 'V' + Date.now().toString(36).slice(-6) },
      });
    }
    res.json(toUserJson(user));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '登录失败' });
  }
});

/**
 * POST /api/auth/wechat-phone
 * 微信手机号一键登录
 * Body: { wxCode, phoneCode }
 * wxCode: wx.login 的 code，用于获取 openid
 * phoneCode: getPhoneNumber 返回的 code，用于获取手机号
 */
router.post('/auth/wechat-phone', async (req, res) => {
  try {
    const { wxCode, phoneCode } = req.body;
    if (!phoneCode) return res.status(400).json({ message: '缺少手机号授权' });

    let openid = null;
    if (APP_ID && APP_SECRET && wxCode) {
      const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${APP_ID}&secret=${APP_SECRET}&js_code=${wxCode}&grant_type=authorization_code`;
      const resp = await fetch(url);
      const data = await resp.json();
      if (data.openid) openid = data.openid;
    }

    const token = await getAccessToken();
    const phoneUrl = `https://api.weixin.qq.com/wxa/business/getuserphonenumber?access_token=${token}`;
    const phoneResp = await fetch(phoneUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: phoneCode }),
    });
    const phoneData = await phoneResp.json();
    const phone = phoneData.phone_info?.phoneNumber || phoneData.phone_info?.purePhoneNumber;
    if (!phone) return res.status(400).json({ message: phoneData.errmsg || '获取手机号失败' });

    let user = await prisma.user.findFirst({
      where: { OR: [{ openid: openid || undefined }, { phone }] },
    });
    if (user) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          ...(openid && { openid }),
          phone,
          nickname: user.nickname, // 可扩展：从微信获取昵称
        },
      });
    } else {
      user = await prisma.user.create({
        data: {
          openid: openid || 'wx_' + Date.now(),
          phone,
          role: 'visitor',
          visitorCode: 'V' + Date.now().toString(36).slice(-6),
        },
      });
    }
    res.json(toUserJson(user));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || '登录失败' });
  }
});

/**
 * POST /api/auth/send-code
 * 发送验证码
 * Body: { phone }
 */
router.post('/auth/send-code', async (req, res) => {
  try {
    const phone = String(req.body.phone || '').trim().replace(/\D/g, '');
    if (phone.length < 11) return res.status(400).json({ message: '请输入正确的手机号' });

    const code = genCode();
    setCode(phone, code);
    // 生产环境：调用短信服务发送 code。开发环境可打印到控制台
    if (process.env.NODE_ENV !== 'production') {
      console.log('[DEV] 验证码:', phone, code);
    }
    // TODO: 接入阿里云/腾讯云短信: await sendSms(phone, code);
    res.json({ message: '验证码已发送' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '发送失败' });
  }
});

/**
 * POST /api/auth/verify-code
 * 验证码登录 / 注册
 * Body: { phone, code, wxCode? }
 * wxCode 可选，传入则绑定 openid
 */
router.post('/auth/verify-code', async (req, res) => {
  try {
    const { phone: rawPhone, code, wxCode } = req.body;
    const phone = String(rawPhone || '').trim().replace(/\D/g, '');
    if (phone.length < 11) return res.status(400).json({ message: '请输入正确的手机号' });
    if (!code) return res.status(400).json({ message: '请输入验证码' });

    if (!verifyCode(phone, String(code))) {
      return res.status(400).json({ message: '验证码错误或已过期' });
    }

    let openid = null;
    if (APP_ID && APP_SECRET && wxCode) {
      const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${APP_ID}&secret=${APP_SECRET}&js_code=${wxCode}&grant_type=authorization_code`;
      const resp = await fetch(url);
      const data = await resp.json();
      if (data.openid) openid = data.openid;
    }

    let user = await prisma.user.findFirst({ where: { phone } });
    if (user) {
      if (openid) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { openid },
        });
      }
    } else {
      user = await prisma.user.create({
        data: {
          openid: openid || 'sms_' + Date.now(),
          phone,
          role: 'visitor',
          visitorCode: 'V' + Date.now().toString(36).slice(-6),
        },
      });
    }
    res.json(toUserJson(user));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || '登录失败' });
  }
});

module.exports = router;
