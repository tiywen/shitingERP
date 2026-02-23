/**
 * 认证相关路由 - 微信登录
 */

const express = require('express');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

/**
 * POST /api/auth/login
 * 微信登录：传入 wx.login 的 code，返回用户信息
 */
router.post('/login', async (req, res) => {
  try {
    const { code } = req.body;
    let openid = null;

    const appId = process.env.WECHAT_APPID;
    const appSecret = process.env.WECHAT_SECRET;

    if (appId && appSecret && code) {
      // 调用微信接口获取 openid
      const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${appId}&secret=${appSecret}&js_code=${code}&grant_type=authorization_code`;
      const resp = await fetch(url);
      const data = await resp.json();
      if (data.openid) {
        openid = data.openid;
      }
    }

    // 开发环境：无 code 或未配置微信密钥时使用测试用户
    if (!openid) {
      openid = 'dev_' + (code || Date.now());
    }

    let user = await prisma.user.findUnique({
      where: { openid },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          openid,
          role: 'visitor',
          visitorCode: 'V' + Date.now().toString(36).slice(-6),
        },
      });
    }

    res.json({
      userId: user.id,
      role: user.role,
      name: user.name,
      phone: user.phone,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '登录失败' });
  }
});

module.exports = router;
