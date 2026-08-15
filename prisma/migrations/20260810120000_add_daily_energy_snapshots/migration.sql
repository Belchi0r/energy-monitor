BEGIN;

CREATE TABLE public."DailyEnergySnapshot" (
    "id" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "snapshotDate" DATE NOT NULL,
    "totalConsumptionKwh" DOUBLE PRECISION NOT NULL,
    "estimatedCost" DOUBLE PRECISION NOT NULL,
    "activeDeviceCount" INTEGER NOT NULL,
    "tariffBrlPerKwh" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyEnergySnapshot_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "DailyEnergySnapshot_totalConsumptionKwh_check"
      CHECK ("totalConsumptionKwh" >= 0),
    CONSTRAINT "DailyEnergySnapshot_estimatedCost_check"
      CHECK ("estimatedCost" >= 0),
    CONSTRAINT "DailyEnergySnapshot_activeDeviceCount_check"
      CHECK ("activeDeviceCount" >= 0),
    CONSTRAINT "DailyEnergySnapshot_tariffBrlPerKwh_check"
      CHECK ("tariffBrlPerKwh" >= 0)
);

CREATE TABLE public."DailyDeviceEnergySnapshot" (
    "id" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "deviceNameSnapshot" TEXT NOT NULL,
    "estimatedConsumptionKwh" DOUBLE PRECISION NOT NULL,
    "estimatedCost" DOUBLE PRECISION NOT NULL,
    "active" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyDeviceEnergySnapshot_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "DailyDeviceEnergySnapshot_estimatedConsumptionKwh_check"
      CHECK ("estimatedConsumptionKwh" >= 0),
    CONSTRAINT "DailyDeviceEnergySnapshot_estimatedCost_check"
      CHECK ("estimatedCost" >= 0),
    CONSTRAINT "DailyDeviceEnergySnapshot_snapshotId_fkey"
      FOREIGN KEY ("snapshotId")
      REFERENCES public."DailyEnergySnapshot"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "DailyEnergySnapshot_userId_snapshotDate_key"
ON public."DailyEnergySnapshot"("userId", "snapshotDate");

CREATE INDEX "DailyEnergySnapshot_userId_snapshotDate_idx"
ON public."DailyEnergySnapshot"("userId", "snapshotDate" DESC);

CREATE UNIQUE INDEX "DailyDeviceEnergySnapshot_snapshotId_deviceId_key"
ON public."DailyDeviceEnergySnapshot"("snapshotId", "deviceId");

CREATE INDEX "DailyDeviceEnergySnapshot_snapshotId_idx"
ON public."DailyDeviceEnergySnapshot"("snapshotId");

ALTER TABLE public."DailyEnergySnapshot" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."DailyDeviceEnergySnapshot" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "DailyEnergySnapshot_select_own"
ON public."DailyEnergySnapshot"
FOR SELECT
TO authenticated
USING ((SELECT auth.uid()) = "userId");

CREATE POLICY "DailyEnergySnapshot_insert_own"
ON public."DailyEnergySnapshot"
FOR INSERT
TO authenticated
WITH CHECK ((SELECT auth.uid()) = "userId");

CREATE POLICY "DailyEnergySnapshot_update_own"
ON public."DailyEnergySnapshot"
FOR UPDATE
TO authenticated
USING ((SELECT auth.uid()) = "userId")
WITH CHECK ((SELECT auth.uid()) = "userId");

CREATE POLICY "DailyEnergySnapshot_delete_own"
ON public."DailyEnergySnapshot"
FOR DELETE
TO authenticated
USING ((SELECT auth.uid()) = "userId");

CREATE POLICY "DailyDeviceEnergySnapshot_select_own"
ON public."DailyDeviceEnergySnapshot"
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public."DailyEnergySnapshot" AS snapshot
    WHERE snapshot."id" = "snapshotId"
      AND snapshot."userId" = (SELECT auth.uid())
  )
);

CREATE POLICY "DailyDeviceEnergySnapshot_insert_own"
ON public."DailyDeviceEnergySnapshot"
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public."DailyEnergySnapshot" AS snapshot
    WHERE snapshot."id" = "snapshotId"
      AND snapshot."userId" = (SELECT auth.uid())
  )
);

CREATE POLICY "DailyDeviceEnergySnapshot_update_own"
ON public."DailyDeviceEnergySnapshot"
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public."DailyEnergySnapshot" AS snapshot
    WHERE snapshot."id" = "snapshotId"
      AND snapshot."userId" = (SELECT auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public."DailyEnergySnapshot" AS snapshot
    WHERE snapshot."id" = "snapshotId"
      AND snapshot."userId" = (SELECT auth.uid())
  )
);

CREATE POLICY "DailyDeviceEnergySnapshot_delete_own"
ON public."DailyDeviceEnergySnapshot"
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public."DailyEnergySnapshot" AS snapshot
    WHERE snapshot."id" = "snapshotId"
      AND snapshot."userId" = (SELECT auth.uid())
  )
);

COMMIT;
