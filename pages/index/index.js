/**
 * 订房首页 - 携程/去哪儿风格：日期选择、房型筛选、卡片列表
 */

const app = getApp();
const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

Page({
  data: {
    checkinDate: '',
    checkoutDate: '',
    minDate: '',
    minCheckoutDate: '',
    nights: 0,
    roomTypes: [],
    filteredRoomTypes: [],
    adultCount: 2,
    hasDiscount: false,
    checkinWeekday: '',
    checkoutWeekday: '',
    checkinDisplay: '',
    checkoutDisplay: '',
    bedTypeFilters: [{ value: '', label: '全部' }],
    selectedBedType: '',
  },

  onLoad() {
    this._setTabBarSelected(0);
    this._initDate();
  },

  onShow() {
    this._setTabBarSelected(0);
    this.setData({ hasDiscount: app.hasDiscount() });
    this._applyFilter();
  },

  _setTabBarSelected(index) {
    const tabBar = this.getTabBar?.();
    if (tabBar) tabBar.setData({ selected: index });
  },

  _formatDate(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  },

  _addDays(dateStr, days) {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + days);
    return this._formatDate(d);
  },

  _formatDisplayDate(dateStr) {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    return `${m}月${d}日`;
  },

  _getWeekday(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return WEEKDAYS[d.getDay()];
  },

  _calcNights(checkin, checkout) {
    const a = new Date(checkin);
    const b = new Date(checkout);
    return Math.max(0, Math.floor((b - a) / (24 * 60 * 60 * 1000)));
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
    this._updateDateDisplay();
    this._refreshNightsAndRooms(today, tomorrow);
  },

  _updateDateDisplay() {
    const { checkinDate, checkoutDate } = this.data;
    this.setData({
      checkinWeekday: this._getWeekday(checkinDate),
      checkoutWeekday: this._getWeekday(checkoutDate),
      checkinDisplay: this._formatDisplayDate(checkinDate),
      checkoutDisplay: this._formatDisplayDate(checkoutDate),
    });
  },

  onCheckinChange(e) {
    const checkin = e.detail.value;
    const minCheckout = this._addDays(checkin, 1);
    let checkout = this.data.checkoutDate;
    if (this._calcNights(checkin, checkout) <= 0) checkout = minCheckout;
    this.setData({
      checkinDate: checkin,
      checkoutDate: checkout,
      minCheckoutDate: minCheckout,
    });
    this._updateDateDisplay();
    this._refreshNightsAndRooms(checkin, checkout);
  },

  onCheckoutChange(e) {
    const checkout = e.detail.value;
    const checkin = this.data.checkinDate;
    let validCheckout = checkout;
    if (this._calcNights(checkin, checkout) <= 0) validCheckout = this._addDays(checkin, 1);
    this.setData({ checkoutDate: validCheckout });
    this._updateDateDisplay();
    this._refreshNightsAndRooms(checkin, validCheckout);
  },

  _refreshNightsAndRooms(checkin, checkout) {
    const c1 = checkin != null ? checkin : this.data.checkinDate;
    const c2 = checkout != null ? checkout : this.data.checkoutDate;
    const nights = this._calcNights(c1, c2);
    this.setData({ nights });
    if (c1 && c2) this.loadRoomTypes(c1, c2);
  },

  loadRoomTypes(checkin, checkout) {
    const { request } = require('../../utils/request');
    const hasDiscount = app.hasDiscount();
    wx.showLoading({ title: '加载中' });
    const query = `checkin=${encodeURIComponent(checkin)}&checkout=${encodeURIComponent(checkout)}&hasDiscount=${hasDiscount ? 'true' : 'false'}`;
    request({
      url: `/room-types?${query}`,
      method: 'GET',
    })
      .then((res) => {
        wx.hideLoading();
        const list = (res.list || []).map((rt) => ({
          ...rt,
          displayName: rt.typeName || rt.roomName || rt.name,
        }));
        const bedTypes = [...new Set(list.map((r) => r.bedType).filter(Boolean))];
        const filters = [{ value: '', label: '全部' }, ...bedTypes.map((b) => ({ value: b, label: b }))];
        this.setData({
          roomTypes: list,
          bedTypeFilters: filters,
        });
        this._applyFilter();
      })
      .catch((err) => {
        wx.hideLoading();
        wx.showToast({ title: err.message || '加载失败', icon: 'none' });
        this.setData({ roomTypes: [], filteredRoomTypes: [] });
      });
  },

  onFilterTap(e) {
    const value = e.currentTarget.dataset.value || '';
    this.setData({ selectedBedType: value });
    this._applyFilter();
  },

  _applyFilter() {
    const { roomTypes, selectedBedType } = this.data;
    let list = roomTypes;
    if (selectedBedType) {
      list = roomTypes.filter((r) => r.bedType === selectedBedType);
    }
    this.setData({ filteredRoomTypes: list });
  },

  goBooking(e) {
    const { id, name, price, bedtype, maxoccupancy } = e.currentTarget.dataset;
    const { checkinDate, checkoutDate, nights } = this.data;
    wx.navigateTo({
      url: `/pages/booking/booking?checkin=${checkinDate}&checkout=${checkoutDate}&nights=${nights}&roomId=${id}&roomName=${encodeURIComponent(name)}&price=${price}&bedType=${encodeURIComponent(bedtype || '')}&maxOccupancy=${maxoccupancy || 0}`,
    });
  },

  previewRoomImages(e) {
    const urls = e.currentTarget.dataset.urls || [];
    const current = e.currentTarget.dataset.current;
    if (!urls || urls.length === 0) return;
    wx.previewImage({
      current: current || urls[0],
      urls,
    });
  },

  onContact() {
    wx.showModal({
      title: '联系酒店',
      content: '请拨打酒店前台电话咨询',
      showCancel: true,
      confirmText: '拨打电话',
      success: (res) => {
        if (res.confirm) {
          wx.makePhoneCall({ phoneNumber: '400-000-0000' });
        }
      },
    });
  },
});
