-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "paymentMethod" TEXT NOT NULL DEFAULT 'MOBILE_MONEY',
ADD COLUMN     "receiptUrl" TEXT,
ALTER COLUMN "transactionCode" DROP NOT NULL;
