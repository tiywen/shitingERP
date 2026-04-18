/**
 * K歌房 / 匹克球场 时段预约
 * 未来 3 天，9:00-21:00 每 1 小时一格，多选最多 3 个时段
 * 入口：facility=ktv | facility=pickleball
 */

const { request } = require('../../utils/request');

const FACILITY_NAMES = { ktv: 'K歌房', pickleball: '匹克球场' };

Page({
  data: {
    facility: 'ktv',
    facilityName: 'K歌房',
    dates: [],
    selected: [],
    loading: true,
    error: '',
    emptyHint: '',
    submitting: false,
  },

  onLoad(options) {
    const facility = (options.facility || 'ktv') === 'pickleball' ? 'pickleball' : 'ktv';
    this.setData({
      facility,
      facilityName: FACILITY_NAMES[facility],
    });
    wx.setNavigationBarTitle({ title: `${FACILITY_NAMES[facility]}预约` });
    this.loadAvailability();
  },

  loadAvailability() {
    this.setData({ loading: true, error: '', emptyHint: '' });
    request({
      url: `/facilities/slot-availability?facility=${encodeURIComponent(this.data.facility)}`,
      method: 'GET',
    })
      .then((res) => {
        const dates = (res.dates || []).map((d) => ({
          ...d,
          slots: (d.slots || []).map((s) => ({ ...s, selected: false })),
        }));
        const emptyHint =
          dates.length === 0
            ? (res.hint || '暂无可预约时段，请稍后再试或联系管理员')
            : '';
        this.setData({ dates, loading: false, emptyHint });
      })
      .catch((err) => {
        this.setData({ error: err.message || '加载失败', loading: false, emptyHint: '' });
      });
  },

  onSlotTap(e) {
    const { date, slot } = e.currentTarget.dataset;
    if (!slot || !slot.available) return;
    const { dates, selected } = this.data;
    const key = `${date}_${slot.timeSlot}`;
    const idx = selected.findIndex((s) => s.key === key);
    if (idx >= 0) {
      selected.splice(idx, 1);
    } else {
      if (selected.length >= 3) {
        wx.showToast({ title: '最多选 3 个时段', icon: 'none' });
        return;
      }
      selected.push({ date, timeSlot: slot.timeSlot, key });
    }
    const newDates = dates.map((d) => ({
      ...d,
      slots: d.slots.map((s) => ({
        ...s,
        selected: selected.some((x) => x.date === d.date && x.timeSlot === s.timeSlot),
      })),
    }));
    this.setData({ dates: newDates, selected });
  },

  submit() {
    const { facility, selected } = this.data;
    if (selected.length === 0) {
      wx.showToast({ title: '请选择时段', icon: 'none' });
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
      url: '/facilities/slot-book',
      method: 'POST',
      data: {
        userId,
        facility,
        slots: selected.map((s) => ({ date: s.date, timeSlot: s.timeSlot })),
      },
    })
      .then(() => {
        wx.showToast({ title: '预约成功', icon: 'success' });
        setTimeout(() => wx.navigateBack(), 1500);
      })
      .catch((err) => {
        this.setData({ submitting: false });
        wx.showToast({ title: err.message || '提交失败', icon: 'none' });
      });
  },
});
