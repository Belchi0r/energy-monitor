CREATE TYPE public."UsageProfileType" AS ENUM (
    'CONTINUOUS',
    'MORNING',
    'AFTERNOON',
    'EVENING',
    'NIGHT',
    'SPLIT',
    'CUSTOM',
    'DISTRIBUTED'
);

ALTER TABLE public."Device"
    ADD COLUMN "usageProfileType" public."UsageProfileType" NOT NULL DEFAULT 'DISTRIBUTED',
    ADD COLUMN "usageWindows" JSONB NOT NULL DEFAULT '[]';
