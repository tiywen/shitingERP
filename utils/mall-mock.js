/**
 * 商城演示数据（暂未对接后端）
 */
const PRODUCTS = [
  {
    id: 'tea-001',
    name: '石亭精选茶叶',
    subtitle: '礼盒装 · 伴手礼优选',
    price: 20,
    unit: '盒',
    cover: '',
    images: [],
    tags: ['精美包装', '礼盒', '伴手礼'],
    salesText: '演示商品',
    detailHtml: '',
    specs: [
      { label: '规格', value: '1 盒（约 100g）' },
      { label: '包装', value: '精美礼盒，适合馈赠' },
      { label: '产地', value: '精选茶区' },
    ],
    desc: '精选茶叶，香气清雅，口感甘醇。采用精美礼盒包装，无论是自饮还是馈赠亲友都十分合适。当前为演示数据，下单后将有工作人员与您联系确认。',
  },
];

function getProductById(id) {
  return PRODUCTS.find((p) => p.id === id) || PRODUCTS[0];
}

module.exports = {
  PRODUCTS,
  getProductById,
};
