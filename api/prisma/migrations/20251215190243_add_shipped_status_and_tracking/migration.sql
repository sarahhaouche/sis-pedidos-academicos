-- AlterEnum
ALTER TYPE "public"."OrderStatus" ADD VALUE 'SHIPPED';

-- AlterTable
ALTER TABLE "public"."Order" ADD COLUMN     "trackingCode" TEXT;
