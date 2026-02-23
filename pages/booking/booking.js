/**
 * 订房 - 预订表单页
 * 住客姓名、联系电话、预计到店时间、备注
 */

const { request } = require('../../utils/request');

Page({
  data: {
    checkin: '',
    checkout: '',
    nights: 0,
    roomId: '',
    roomName: '',
    bedType: '',
    maxOccupancy: 0,
    pricePerNight: 0,
    totalPrice: 0,
    form: {
      guestName: '',
      phone: '',
      arriveTime: '',
      remark: '',
    },
  },

  onLoad(options) {
    const nights = Number(options.nights) || 1;
    const pricePerNight = Number(options.price) || 0;
    const totalPrice = nights * pricePerNight;
    this.setData({
      checkin: options.checkin || '',
      checkout: options.checkout || '',
      nights,
      roomId: options.roomId || '',
      roomName: decodeURIComponent(options.roomName || ''),
      bedType: decodeURIComponent(options.bedType || ''),
      maxOccupancy: Number(options.maxOccupancy) || 0,
      pricePerNight,
      totalPrice,
    });
  },

  onInput(e) {
    const { field } = e.currentTarget.dataset;
    this.setData({ [`form.${field}`]: e.detail.value });
  },

  onArriveTimeChange(e) {
    this.setData({ 'form.arriveTime': e.detail.value });
  },

  submit() {
    const { form, checkin, checkout, nights, roomId, pricePerNight, totalPrice } = this.data;
    if (!form.guestName || !form.phone || !form.arriveTime) {
      wx.showToast({ title: '请填写必填项', icon: 'none' });
      return;
    }
    const app = getApp();
    const userId = app.globalData.userInfo?.userId || app.globalData.userInfo?.id;

    wx.showLoading({ title: '提交中' });
    request({
      url: '/orders',
      method: 'POST',
      data: {
        roomTypeId: roomId,
        checkin,
        checkout,
        nights,
        pricePerNight,
        totalAmount: totalPrice,
        guestName: form.guestName,
        guestPhone: form.phone,
        arriveTime: form.arriveTime,
        remark: form.remark || undefined,
        userId: userId || undefined,
      },
    })
      .then(() => {
        wx.hideLoading();
        wx.showToast({ title: '提交成功', icon: 'success' });
        setTimeout(() => wx.navigateBack(), 1500);
      })
      .catch((err) => {
        wx.hideLoading();
        wx.showToast({ title: err.message || '提交失败', icon: 'none' });
      });
  },
});
