-- CreateTable
CREATE TABLE "DashboardDataset" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "rangeLabel" TEXT NOT NULL,
    "daysCount" INTEGER NOT NULL,
    "granularity" TEXT NOT NULL,
    "currentPowerW" DOUBLE PRECISION,
    "activeDevices" INTEGER NOT NULL,

    CONSTRAINT "DashboardDataset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnergyUsagePoint" (
    "id" TEXT NOT NULL,
    "datasetId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "shortLabel" TEXT NOT NULL,
    "consumptionKwh" DOUBLE PRECISION NOT NULL,
    "isWeekend" BOOLEAN,

    CONSTRAINT "EnergyUsagePoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeviceConsumption" (
    "id" TEXT NOT NULL,
    "datasetId" TEXT NOT NULL,
    "device" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "consumptionKwh" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "DeviceConsumption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecentActivity" (
    "id" TEXT NOT NULL,
    "datasetId" TEXT NOT NULL,
    "device" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "occurredAt" TEXT NOT NULL,
    "occurredAtIso" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,

    CONSTRAINT "RecentActivity_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "EnergyUsagePoint" ADD CONSTRAINT "EnergyUsagePoint_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "DashboardDataset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeviceConsumption" ADD CONSTRAINT "DeviceConsumption_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "DashboardDataset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecentActivity" ADD CONSTRAINT "RecentActivity_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "DashboardDataset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
