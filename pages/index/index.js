/**
 * 订房首页 - 选择入住/离店日期、查看可订房型
 */

const app = getApp();

Page({
  data: {
    checkinDate: '',
    checkoutDate: '',
    minDate: '',
    minCheckoutDate: '', // 离店日期最小为入住次日
    nights: 0,
    roomTypes: [],
  },

  onLoad() {
    this._setTabBarSelected(0);
    this._initDate();
  },

  onShow() {
    this._setTabBarSelected(0);
  },

  _setTabBarSelected(index) {
    const tabBar = this.getTabBar?.();
    if (tabBar) tabBar.setData({ selected: index });
  },

  _initDate() {
    const today = this._formatDate(new Date());
    const tomorrow = this._addDays(today, 1);
    this.setData({
      checkinDate: today,
      checkoutDate: tomorrow,
      minDate: today,
      minCheckoutDate: tomorrow,
    });
    this._refreshNightsAndRooms();
  },

  _formatDate(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  },

  /** 日期加减天数 */
  _addDays(dateStr, days) {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + days);
    return this._formatDate(d);
  },

  /** 计算入住晚数 */
  _calcNights(checkin, checkout) {
    const a = new Date(checkin);
    const b = new Date(checkout);
    return Math.max(0, Math.floor((b - a) / (24 * 60 * 60 * 1000)));
  },

  onCheckinChange(e) {
    const checkin = e.detail.value;
    const minCheckout = this._addDays(checkin, 1);
    let checkout = this.data.checkoutDate;
    if (this._calcNights(checkin, checkout) <= 0) {
      checkout = minCheckout;
    }
    this.setData({
      checkinDate: checkin,
      checkoutDate: checkout,
      minCheckoutDate: minCheckout,
    });
    this._refreshNightsAndRooms();
  },

  onCheckoutChange(e) {
    const checkout = e.detail.value;
    const checkin = this.data.checkinDate;
    let validCheckout = checkout;
    if (this._calcNights(checkin, checkout) <= 0) {
      validCheckout = this._addDays(checkin, 1);
    }
    this.setData({ checkoutDate: validCheckout });
    this._refreshNightsAndRooms();
  },

  _refreshNightsAndRooms() {
    const { checkinDate, checkoutDate } = this.data;
    const nights = this._calcNights(checkinDate, checkoutDate);
    this.setData({ nights });
    this.loadRoomTypes(checkinDate, checkoutDate);
  },

  /** 加载可订房型（调用后端 API） */
  loadRoomTypes(checkin, checkout) {
    const { request } = require('../../utils/request');
    const hasDiscount = app.hasDiscount();
    wx.showLoading({ title: '加载中' });
    request({
      url: '/room-types',
      method: 'GET',
      data: {
        checkin,
        checkout,
        hasDiscount: hasDiscount ? 'true' : 'false',
      },
    })
      .then((res) => {
        wx.hideLoading();
        this.setData({ roomTypes: res.list || [] });
      })
      .catch((err) => {
        wx.hideLoading();
        wx.showToast({ title: err.message || '加载失败', icon: 'none' });
        this.setData({ roomTypes: [] });
      });
  },

  goBooking(e) {
    const { id, name, price, bedtype, maxoccupancy } = e.currentTarget.dataset;
    const { checkinDate, checkoutDate, nights } = this.data;
    wx.navigateTo({
      url: `/pages/booking/booking?checkin=${checkinDate}&checkout=${checkoutDate}&nights=${nights}&roomId=${id}&roomName=${encodeURIComponent(name)}&price=${price}&bedType=${encodeURIComponent(bedtype || '')}&maxOccupancy=${maxoccupancy || 0}`,
    });
  },
});
