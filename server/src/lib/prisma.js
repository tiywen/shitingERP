/**
 * Prisma 客户端单例
 * 所有路由共用同一实例，避免多连接池耗尽
 */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

module.exports = { prisma };
