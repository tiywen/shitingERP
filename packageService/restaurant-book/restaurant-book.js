/**
 * 餐厅预约表单：日期、餐次、时间、人数
 * 入口：type=table（桌餐 10 人起）| type=individual（单人餐可选人数）
 */

const { request } = require('../../utils/request');

const MEAL_OPTIONS = [
  { value: 'breakfast', label: '早餐' },
  { value: 'lunch', label: '午餐' },
  { value: 'dinner', label: '晚餐' },
];

Page({
  data: {
    type: 'table',
    bookingTypeLabel: '桌餐',
    dateOptions: [],
    dateIndex: 0,
    dateDisplay: '加载中…',
    selectedDate: '',
    mealOptions: MEAL_OPTIONS,
    mealIndex: 0,
    mealDisplay: '早餐',
    selectedMeal: 'breakfast',
    timeSlotOptions: [],
    timeSlotIndex: 0,
    timeSlotDisplay: '请先选择餐次',
    selectedTimeSlot: '',
    minHeadcount: 10,
    maxHeadcount: 50,
    headcount: 10,
    remark: '',
    submitting: false,
    mealFull: false,
    currentTotal: 0,
    capacityLimit: 40,
  },

  onLoad(options) {
    const type = (options.type || 'table') === 'individual' ? 'individual' : 'table';
    const minHeadcount = type === 'table' ? 10 : 1;
    this.setData({
      type,
      bookingTypeLabel: type === 'table' ? '桌餐' : '单人餐',
      minHeadcount,
      maxHeadcount: 50,
      headcount: minHeadcount,
    });
    this.loadDates();
  },

  loadDates() {
    request({
      url: '/facilities/restaurant/available-dates',
      method: 'GET',
    })
      .then((res) => {
        const dates = res.dates || [];
        const dateOptions = dates.map((d) => ({ date: d.date, label: `${d.label} ${d.date}` }));
        const first = dateOptions[0];
        this.setData({
          dateOptions,
          dateIndex: 0,
          dateDisplay: first ? first.label : (dates.length === 0 ? '暂无可预约日期' : '请选择'),
          selectedDate: first ? first.date : '',
        });
        if (first) this.loadTimeSlots(first.date, 'breakfast');
      })
      .catch((err) => {
        wx.showToast({ title: err.message || '获取日期失败', icon: 'none' });
        this.setData({ dateDisplay: '获取失败', dateOptions: [] });
      });
  },

  loadTimeSlots(date, meal) {
    if (!date || !meal) return;
    const query = `date=${encodeURIComponent(date)}&meal=${encodeURIComponent(meal)}`;
    request({
      url: `/facilities/restaurant/time-slots?${query}`,
      method: 'GET',
    })
      .then((res) => {
        const list = res.list || [];
        const currentTotal = Number(res.currentTotal) || 0;
        const limit = Number(res.limit) || 40;
        const timeSlotOptions = list.map((s) => ({ value: s.value, label: s.label || s.value }));
        const first = timeSlotOptions[0];
        const headcount = this.data.headcount;
        const mealFull = currentTotal + headcount > limit;
        this.setData({
          timeSlotOptions,
          timeSlotIndex: 0,
          timeSlotDisplay: first ? first.label : '无可用时段',
          selectedTimeSlot: first ? first.value : '',
          currentTotal,
          capacityLimit: limit,
          mealFull,
        });
      })
      .catch(() => {
        this.setData({
          timeSlotOptions: [],
          timeSlotDisplay: '获取失败',
          selectedTimeSlot: '',
          mealFull: false,
          currentTotal: 0,
          capacityLimit: 40,
        });
      });
  },

  _updateMealFull() {
    const { currentTotal, capacityLimit, headcount } = this.data;
    const mealFull = currentTotal + headcount > capacityLimit;
    this.setData({ mealFull });
  },

  onDateChange(e) {
    const idx = parseInt(e.detail.value, 10);
    const dateOptions = this.data.dateOptions;
    const item = dateOptions[idx];
    if (!item) return;
    this.setData({
      dateIndex: idx,
      dateDisplay: item.label,
      selectedDate: item.date,
    });
    this.loadTimeSlots(item.date, this.data.selectedMeal);
  },

  onMealChange(e) {
    const idx = parseInt(e.detail.value, 10);
    const mealOptions = this.data.mealOptions;
    const item = mealOptions[idx];
    if (!item) return;
    this.setData({
      mealIndex: idx,
      mealDisplay: item.label,
      selectedMeal: item.value,
    });
    this.loadTimeSlots(this.data.selectedDate, item.value);
  },

  onTimeSlotChange(e) {
    const idx = parseInt(e.detail.value, 10);
    const timeSlotOptions = this.data.timeSlotOptions;
    const item = timeSlotOptions[idx];
    if (!item) return;
    this.setData({
      timeSlotIndex: idx,
      timeSlotDisplay: item.label,
      selectedTimeSlot: item.value,
    });
  },

  minusHeadcount() {
    const { headcount, minHeadcount } = this.data;
    if (headcount <= minHeadcount) return;
    this.setData({ headcount: headcount - 1 }, () => this._updateMealFull());
  },

  plusHeadcount() {
    const { headcount, maxHeadcount } = this.data;
    if (headcount >= maxHeadcount) return;
    this.setData({ headcount: headcount + 1 }, () => this._updateMealFull());
  },

  onRemarkInput(e) {
    this.setData({ remark: e.detail.value || '' });
  },

  submit() {
    const { type, selectedDate, selectedMeal, selectedTimeSlot, headcount, remark, mealFull } = this.data;
    if (mealFull) {
      wx.showToast({ title: '对不起，预约已满', icon: 'none' });
      return;
    }
    if (!selectedDate || !selectedMeal || !selectedTimeSlot) {
      wx.showToast({ title: '请完整选择日期、餐次与时间', icon: 'none' });
      return;
    }

    const app = getApp();
    const userId = app.globalData?.userInfo?.userId || app.globalData?.userInfo?.id;
    if (!userId) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }

    this.setData({ submitting: true });
    request({
      url: '/facilities/restaurant/book',
      method: 'POST',
      data: {
        userId,
        date: selectedDate,
        meal: selectedMeal,
        bookingType: type,
        headcount,
        timeSlot: selectedTimeSlot,
        remark: remark ? remark.trim() : undefined,
      },
    })
      .then((res) => {
        wx.showToast({ title: res.message || '预约成功', icon: 'success' });
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      })
      .catch((err) => {
        this.setData({ submitting: false });
        wx.showToast({ title: err.message || '提交失败', icon: 'none' });
      });
  },
});
