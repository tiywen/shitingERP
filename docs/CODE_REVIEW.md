# 石亭 ERP 代码评审摘要

## 一、架构

### 已改进
- **Prisma 单例**：原各路由文件各自 `new PrismaClient()`，连接池易浪费。已抽成 `server/src/lib/prisma.js` 单例，auth/room/workOrder/admin 统一引用。

### 建议
- **后台鉴权**：`/api/admin` 目前无登录/Token 校验，任何人可访问。正式环境建议加鉴权（如 JWT 或 Session）。
- **路由顺序**：admin 中 `/roomType/:id/images` 等需写在 `/:model` 之前，当前顺序正确，后续新增“带参数的具体路径”时注意保持。
- **环境变量**：小程序 `config/index.js` 里 baseUrl 现为写死；可按环境区分（如开发用本地，生产用 env 或构建时注入）。

---

## 二、效率

### 已无问题
- **room-types**：一次查房型+图片，无 N+1。
- **admin 列表**：按 model 做 include，一次拉取关联。

### 可优化（非必须）
- **验证码存储**：auth 中用内存 `Map`，多实例部署会不共享；上线多机时建议改为 Redis。
- **房型图**：若房型与图片量很大，可考虑 room-types 只返回首图或分页，按需再拉全量图。
- **admin 通用 CRUD**：日期等字段在路由里按表名写死；若表很多可考虑从 schema 推导，当前规模可接受。

---

## 三、注释与可维护性

### 已补充/修正
- **server**
  - `lib/prisma.js`：说明单例用途。
  - `index.js`：注明部署时建议 `listen(PORT, '0.0.0.0')`。
  - `admin.js`：为 `parseNum`、`toJson` 补了用途说明。
- **小程序**
  - `config/index.js`：说明 baseUrl 含义及开发/真机用法。
- **admin**
  - `api.js`：文件头说明请求走代理及 VITE_API_TARGET。

### 现状良好
- auth/room/workOrder 的路由均有 JSDoc（路径、Query/Body 说明）。
- admin 的 MODELS/INCLUDES/DATE_FIELDS 含义可从命名看出，关键接口有注释。

### 可选增强
- 复杂接口（如 roomType/import）可在函数顶加 2～3 行业务说明（Excel 列与字段对应、必填项等）。
- Prisma schema 中关键 model 已有简短中文注释，可保持。

---

## 四、其它

- **错误处理**：接口多为 try/catch + 400|500 + message，风格统一。
- **安全**：admin 无鉴权；auth 验证码 TTL、DEV_CODE 仅开发用，生产需关掉或仅限测试环境。
- **依赖**：server 使用 multer/prisma/express 等常见库，无异常依赖。

---

*评审后已做改动：Prisma 单例、上述注释与配置说明。*
