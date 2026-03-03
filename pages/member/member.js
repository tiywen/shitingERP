/**
 * 会员中心 - 登录状态、会员种类、工单、订单、发票
 * 登录方式：微信手机号一键 / 验证码
 */

const ROLE_LABELS = {
  owner: '业主',
  member: '院友',
  visitor: '访客',
};

const { request } = require('../../utils/request');

Page({
  data: {
    isLoggedIn: false,
    roleLabel: '访客',
    userName: '',
    form: { phone: '', code: '' },
    countdown: 0,
    countdownTimer: null,
  },

  onLoad() {
    this._setTabBarSelected(2);
  },

  onShow() {
    this._setTabBarSelected(2);
    this._updateUserStatus();
  },

  onUnload() {
    if (this.data.countdownTimer) clearInterval(this.data.countdownTimer);
  },

  _updateUserStatus() {
    const app = getApp();
    const role = app.getUserRole?.() || app.globalData?.userRole || 'visitor';
    const isLoggedIn = app.globalData?.isLoggedIn ?? false;
    const userInfo = app.globalData?.userInfo || {};
    const userName = userInfo.nickname || userInfo.name || userInfo.phone || '';
    this.setData({
      isLoggedIn,
      roleLabel: ROLE_LABELS[role] || '访客',
      userName,
    });
  },

  _setTabBarSelected(index) {
    const tabBar = this.getTabBar?.();
    if (tabBar) tabBar.setData({ selected: index });
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field;
    const value = e.detail.value;
    this.setData({ ['form.' + field]: value });
  },

  onWechatPhone(e) {
    if (e.detail.errMsg && e.detail.errMsg !== 'getPhoneNumber:ok') {
      wx.showToast({ title: e.detail.errMsg || '用户取消授权', icon: 'none' });
      return;
    }
    const phoneCode = e.detail.code;
    if (!phoneCode) {
      wx.showToast({ title: '请使用真机体验微信手机号授权', icon: 'none' });
      return;
    }
    wx.showLoading({ title: '登录中' });
    wx.login({
      success: (loginRes) => {
        request({
          url: '/auth/wechat-phone',
          method: 'POST',
          data: { wxCode: loginRes.code, phoneCode },
        })
          .then((data) => {
            wx.hideLoading();
            const userInfo = {
              id: data.userId,
              userId: data.userId,
              role: data.role || 'visitor',
              name: data.name,
              nickname: data.nickname,
              phone: data.phone,
            };
            getApp().setLoggedIn(userInfo);
            this._updateUserStatus();
            wx.showToast({ title: '登录成功', icon: 'success' });
          })
          .catch((err) => {
            wx.hideLoading();
            wx.showToast({ title: err.message || '登录失败', icon: 'none' });
          });
      },
      fail: () => {
        wx.hideLoading();
        wx.showToast({ title: '登录失败', icon: 'none' });
      },
    });
  },

  onSendCode() {
    const phone = (this.data.form.phone || '').trim().replace(/\D/g, '');
    if (phone.length < 11) {
      wx.showToast({ title: '请输入正确手机号', icon: 'none' });
      return;
    }
    request({
      url: '/auth/send-code',
      method: 'POST',
      data: { phone },
    })
      .then(() => {
        wx.showToast({ title: '验证码已发送', icon: 'success' });
        this._startCountdown();
      })
      .catch((err) => wx.showToast({ title: err.message || '发送失败', icon: 'none' }));
  },

  _startCountdown() {
    if (this.data.countdownTimer) clearInterval(this.data.countdownTimer);
    let countdown = 60;
    this.setData({ countdown });
    const timer = setInterval(() => {
      countdown--;
      this.setData({ countdown });
      if (countdown <= 0) {
        clearInterval(timer);
        this.setData({ countdownTimer: null });
      }
    }, 1000);
    this.setData({ countdownTimer: timer });
  },

  onVerifyCode() {
    const { phone, code } = this.data.form;
    const p = (phone || '').trim().replace(/\D/g, '');
    if (p.length < 11) {
      wx.showToast({ title: '请输入正确手机号', icon: 'none' });
      return;
    }
    if (!(code || '').trim()) {
      wx.showToast({ title: '请输入验证码', icon: 'none' });
      return;
    }
    wx.showLoading({ title: '登录中' });
    const doVerify = (wxCode) => {
      request({
        url: '/auth/verify-code',
        method: 'POST',
        data: { phone: p, code: (code || '').trim(), wxCode: wxCode || undefined },
      })
        .then((data) => {
          wx.hideLoading();
          const userInfo = {
            id: data.userId,
            userId: data.userId,
            role: data.role || 'visitor',
            name: data.name,
            nickname: data.nickname,
            phone: data.phone,
          };
          getApp().setLoggedIn(userInfo);
          this._updateUserStatus();
          wx.showToast({ title: '登录成功', icon: 'success' });
        })
        .catch((err) => {
          wx.hideLoading();
          wx.showToast({ title: err.message || '登录失败', icon: 'none' });
        });
    };
    wx.login({
      success: (res) => doVerify(res.code),
      fail: () => doVerify(null),
    });
  },

  onLogout() {
    wx.showModal({
      title: '退出登录',
      content: '确定退出吗？',
      success: (res) => {
        if (res.confirm) {
          getApp().logout();
          this._updateUserStatus();
          wx.showToast({ title: '已退出', icon: 'none' });
        }
      },
    });
  },

  goWorkOrders() {
    wx.navigateTo({ url: '/packageMember/work-orders/work-orders' });
  },

  goOrders() {
    wx.navigateTo({ url: '/packageMember/orders/orders' });
  },

  goMyBookings() {
    wx.navigateTo({ url: '/packageMember/my-bookings/my-bookings' });
  },

  goInvoices() {
    wx.navigateTo({ url: '/packageMember/invoices/invoices' });
  },

  goMall() {
    wx.showToast({ title: '商城功能开发中', icon: 'none' });
  },
});
