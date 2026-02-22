Component({
  data: {
    selected: 0,
    list: [
      { pagePath: '/pages/index/index', text: '订房' },
      { pagePath: '/pages/service/service', text: '服务' },
      { pagePath: '/pages/member/member', text: '会员' },
    ],
  },

  methods: {
    switchTab(e) {
      const index = e.currentTarget.dataset.index;
      const item = this.data.list[index];
      wx.switchTab({ url: item.pagePath });
    },
  },
});
