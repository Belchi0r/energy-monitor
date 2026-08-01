import { prisma } from "@/lib/prisma";
import { PrismaDeviceRepository } from "@/lib/repositories/prisma-device-repository";
import { DeviceService } from "@/lib/services/device-service";

export const deviceRepository = new PrismaDeviceRepository(prisma);

export const deviceService = new DeviceService(deviceRepository);
