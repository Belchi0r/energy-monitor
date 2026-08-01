CREATE TABLE public."Device" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "powerWatts" DOUBLE PRECISION NOT NULL,
    "averageDailyHours" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Device_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Device_name_key" ON public."Device"("name");

ALTER TABLE public."Device" ENABLE ROW LEVEL SECURITY;
