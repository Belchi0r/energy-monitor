-- AlterTable
ALTER TABLE "Device" ADD COLUMN     "userId" UUID;

-- CreateIndex
CREATE INDEX "Device_userId_idx" ON "Device"("userId");
