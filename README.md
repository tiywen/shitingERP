# shitingERP

石亭 ERP 微信小程序，面向业主、院友、访客的订房与服务应用。

## 项目结构

```
shitingERP/
├── app.js                 # 小程序入口、用户角色管理
├── app.json               # 全局配置、tabBar、分包
├── app.wxss               # 全局样式
├── project.config.json    # 微信开发者工具配置（需填写 AppID）
├── sitemap.json
├── custom-tab-bar/        # 自定义底部导航
├── config/                # 全局配置
├── utils/                 # 工具函数（request、storage）
├── components/            # 通用组件
├── pages/                 # 主包页面
│   ├── index/             # 首页（订房 / 商城 双入口）
│   ├── room/              # 订房列表（原首页订房能力）
│   ├── booking/           # 预订表单
│   ├── service/           # 服务
│   └── member/            # 会员
├── packageService/        # 服务分包
│   ├── checkin/           # 入住服务
│   ├── checkin-tutorial/  # 入住教程
│   ├── work-order/        # 工单
│   ├── facility-detail/   # 设施介绍（静态）
│   └── facility-booking/  # 设施预约
├── packageMall/           # 商城分包（演示数据，暂未对接后端）
│   ├── mall/              # 商品列表
│   ├── mall-detail/       # 商品详情
│   └── mall-order/        # 确认订单（演示提交）
├── packageMember/         # 会员分包
│   ├── work-orders/       # 工单状态
│   ├── orders/            # 订单
│   └── invoices/          # 发票
├── server/                # 后端 (Node.js + Express + Prisma)
│   ├── prisma/
│   │   ├── schema.prisma  # 数据库模型
│   │   └── seed.js        # 种子数据
│   ├── src/
│   │   ├── index.js       # 入口
│   │   └── routes/        # 接口路由
│   ├── package.json
│   └── .env               # 数据库连接等配置
├── admin/                 # 后台管理网站 (React + Vite)
│   ├── src/
│   │   ├── App.jsx
│   │   ├── api.js
│   │   └── pages/         # 订单(实时)、各表 CRUD
│   ├── package.json
│   └── vite.config.js
```

## 快速开始

### 本地运行（推荐先看这里）

在本地跑通后端 + 小程序模拟器，按下面顺序做一遍即可。

**1. 准备 MySQL**

- 安装 MySQL（如 8.0），启动服务
- 创建数据库：`CREATE DATABASE shiting_erp CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`

**2. 后端**

```bash
cd server
cp .env.example .env    # 已有 .env 可跳过
```

编辑 `server/.env`：

- `DATABASE_URL` 改成你的连接串，例如：`mysql://root:你的密码@localhost:3306/shiting_erp`
- `PORT` 保持 `3000` 或改成你想要的端口（后面小程序 baseUrl 要和这里一致）

然后执行：

```bash
npm install
npm run db:generate
npm run db:push        # 建表
npm run db:seed        # 初始化房型、设施等
npm run dev            # 启动，默认 http://localhost:3000
```

看到「后端已启动」后，在浏览器访问 `http://localhost:3000/api/health` 应返回 `{"ok":true,...}`。

**3. 小程序指向本地**

编辑项目根目录下的 `config/index.js`，把 `baseUrl` 改成你本机后端地址（注意端口要和 server 的 PORT 一致）：

```javascript
baseUrl: 'http://localhost:3000/api',   // 若 PORT=3001 则改为 3001
```

- 在**微信开发者工具**里打开本项目，编译运行即可；模拟器会请求本机后端。
- 若用**真机预览**，需把 `localhost` 改成你电脑的局域网 IP（如 `http://192.168.1.100:3000/api`），并保证手机和电脑在同一 WiFi。

**4. 后台管理（可选）**

```bash
cd admin
npm install
```

在 `admin/.env` 里设置 `VITE_API_TARGET=http://localhost:3000`（端口与后端一致），然后：

```bash
npm run dev
```

浏览器打开控制台里提示的地址（一般为 http://localhost:5174）即可管理数据。

---

### 小程序

1. 使用微信开发者工具打开本项目
2. 在 `project.config.json` 中填写你的小程序 AppID
3. 在 `config/index.js` 中配置后端 API 地址 (`baseUrl`)
4. 编译运行

### 后端

1. 安装 MySQL，创建数据库 `shiting_erp`
2. 复制 `server/.env.example` 为 `server/.env`，填写数据库连接
3. `cd server && npm install`
4. `npm run db:generate && npm run db:push` 创建表结构
5. `npm run db:seed` 初始化房型、设施数据
6. `npm run dev` 启动后端（默认 http://localhost:3000）

### 后台管理

1. 确保后端已启动
2. `cd admin && npm install`
3. `npm run dev` 启动后台（默认 http://localhost:5174）
4. 可查看、编辑所有数据表，订单列表每 5 秒自动刷新

## 用户与角色

用户role：业主、院友、访客
用户登录后识别角色种类
业主：业主识别编号、关联户号、姓名（代号）、手机号
院友：会员编号、关联业主编号、姓名（代号）、手机号
访客：游客编号、姓名（代号）、手机号
未登录用户视为访客

菜单功能：
一、订房
1. 选择时间
2. 显示可订房型及价格列表，自动apply业主/院友折扣
3. 重新选择时间或点击预订
4. 预订时需输入：住客姓名、联系电话、预计到店时间、备注，页面顶端显示房间种类和日期确认，显示入住和取消政策，下方显示订单金额和提交订单按钮

二、服务
1. 入住服务（如有活跃订单则显示具体操作页面，如无活跃订单则显示教程页面）：添加入住人、微信邀请入住人、开发票
2. 工单服务（如有多个关联房间可选择为哪个房间发布工单）：
    a. 开关地暖
    b. 开关门窗通风
    c. 报修
    d. 快递取送
    e. 其它需求
3. 石亭设施
    a. 停车场：静态介绍
    b. 餐厅预约：选择时间
    c. K歌房预约
    d. 洗衣房：静态介绍
    f. 匹克球场预约

三、会员
1. 查看工单状态（已提交、进行中、已完成）
2. 查看订单
3. 查看发票
4. 商城入口