/*
  Warnings:

  - The primary key for the `DeviceConsumption` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `EnergyUsagePoint` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `RecentActivity` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- AlterTable
ALTER TABLE "DeviceConsumption" DROP CONSTRAINT "DeviceConsumption_pkey",
ADD CONSTRAINT "DeviceConsumption_pkey" PRIMARY KEY ("datasetId", "id");

-- AlterTable
ALTER TABLE "EnergyUsagePoint" DROP CONSTRAINT "EnergyUsagePoint_pkey",
ADD CONSTRAINT "EnergyUsagePoint_pkey" PRIMARY KEY ("datasetId", "id");

-- AlterTable
ALTER TABLE "RecentActivity" DROP CONSTRAINT "RecentActivity_pkey",
ADD CONSTRAINT "RecentActivity_pkey" PRIMARY KEY ("datasetId", "id");
