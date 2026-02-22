/**
 * 数据库种子脚本 - 初始化房型、设施等基础数据
 * 运行: npm run db:seed
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const roomTypeCount = await prisma.roomType.count();
  if (roomTypeCount === 0) {
    await prisma.roomType.createMany({
      data: [
        { name: '标准大床房', bedType: '大床', maxOccupancy: 2, price: 388, discountPrice: 350 },
        { name: '景观双床房', bedType: '双床', maxOccupancy: 3, price: 488, discountPrice: 420 },
        { name: '家庭套房', bedType: '大床+沙发床', maxOccupancy: 4, price: 688, discountPrice: 620 },
      ],
    });
    console.log('✓ 房型数据已初始化');
  } else {
    console.log(' 房型数据已存在，跳过');
  }

  const facilityCount = await prisma.facility.count();
  if (facilityCount === 0) {
    await prisma.facility.createMany({
      data: [
        { name: '停车场', type: 'static', description: '地下停车场，24小时开放。' },
        { name: '餐厅', type: 'booking', description: '石亭餐厅，需提前预约。' },
        { name: 'K歌房', type: 'booking', description: 'K歌房预约。' },
        { name: '洗衣房', type: 'static', description: '自助洗衣房，位于B1层。' },
        { name: '匹克球场', type: 'booking', description: '匹克球场预约。' },
      ],
    });
    console.log('✓ 设施数据已初始化');
  } else {
    console.log(' 设施数据已存在，跳过');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
