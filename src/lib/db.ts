import "server-only"
import { PrismaClient } from '@prisma/client'
// بنعرف الـ Singleton عشان الـ Development mode في Next.js
const prismaClientSingleton = () => {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })
}

type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientSingleton | undefined
}

// هنا بنضمن إن Prisma مش هتشتغل غير لو إحنا فعلاً في بيئة Server
export const prisma = globalForPrisma.prisma ?? prismaClientSingleton()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma