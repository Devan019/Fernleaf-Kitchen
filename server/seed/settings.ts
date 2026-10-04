import { randomUUID } from 'node:crypto';
import { prisma } from './utils.js';

export async function seedSettings() {
  const defaultSettings = [
    {
      key: 'KITCHEN_WORKING_DAYS',
      value: 'MONDAY,TUESDAY,WEDNESDAY,THURSDAY,FRIDAY,SUNDAY',
      description: 'Kitchen operating working days (includes Sunday)',
    },
    {
      key: 'CUTOFF_TIME',
      value: '16:00',
      description: 'Kitchen cut-off time in HH:mm',
    },
    {
      key: 'CUTOFF_WORKING_DAYS',
      value: '0',
      description: 'Number of kitchen working days prior to delivery date (0 keeps test orders editable)',
    },
    {
      key: 'KITCHEN_TIMEZONE',
      value: 'UTC',
      description: 'Kitchen operational timezone',
    },
    {
      key: 'AT_RISK_THRESHOLD_MINUTES',
      value: '30',
      description: 'Threshold in minutes to flag prep units as at-risk',
    },
  ];

  for (const s of defaultSettings) {
    await prisma.kitchenSetting.upsert({
      where: { key: s.key },
      update: { value: s.value, description: s.description, updatedAt: new Date() },
      create: {
        id: randomUUID(),
        key: s.key,
        value: s.value,
        description: s.description,
        updatedAt: new Date(),
      },
    });
  }

  // Kitchen Holidays
  const christmas = new Date('2026-12-25T00:00:00.000Z');
  await prisma.kitchenHoliday.upsert({
    where: { date: christmas },
    update: { name: 'Christmas Day', updatedAt: new Date() },
    create: {
      id: randomUUID(),
      date: christmas,
      name: 'Christmas Day',
      description: 'Kitchen closed for Christmas',
      updatedAt: new Date(),
    },
  });

  // Ensure NO kitchen holiday exists for today 2026-10-04
  const today = new Date('2026-10-04T00:00:00.000Z');
  const todayHoliday = await prisma.kitchenHoliday.findUnique({
    where: { date: today },
  });
  if (todayHoliday) {
    await prisma.kitchenHoliday.delete({ where: { date: today } });
  }

  return { count: defaultSettings.length };
}
