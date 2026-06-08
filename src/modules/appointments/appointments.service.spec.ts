import { AppointmentsService } from './appointments.service';

describe('AppointmentsService availability overlap', () => {
  function makeService(slotDurationMin = 30) {
    const prisma = {
      tenant: {
        schedule_config: {
          findFirst: jest.fn().mockResolvedValue({
            is_open: true,
            open_time: '08:00',
            close_time: '17:00',
            slot_duration_min: slotDurationMin,
          }),
        },
        holidays: { findFirst: jest.fn().mockResolvedValue(null) },
        schedule_breaks: { findMany: jest.fn().mockResolvedValue([]) },
        staff_members: {
          findFirst: jest.fn().mockResolvedValue({
            id: 'staff-1',
            name: 'Pilot Advisor',
            working_days: [1],
            max_concurrent_jobs: 1,
          }),
        },
        staff_leaves: { findFirst: jest.fn().mockResolvedValue(null) },
        appointments: {
          count: jest.fn().mockResolvedValue(0),
          create: jest.fn().mockImplementation(({ data }) => Promise.resolve(data)),
        },
      },
    };

    return { prisma, service: new AppointmentsService(prisma as any) };
  }

  it('checks conflicts with half-open intervals for back-to-back bookings', async () => {
    const { prisma, service } = makeService();

    await service.create({
      staff_id: 'staff-1',
      start_time: '2026-06-08T09:00',
      duration_min: 30,
      title: 'Back-to-back booking',
    });

    const where = prisma.tenant.appointments.count.mock.calls[0][0].where;
    expect(where).toMatchObject({
      staff_id: 'staff-1',
      status: { notIn: ['cancelled', 'done'] },
    });
    expect(where.start_time.lt.getTime()).toBe(new Date('2026-06-08T05:30:00.000Z').getTime());
    expect(where.end_time.gt.getTime()).toBe(new Date('2026-06-08T05:00:00.000Z').getTime());
  });

  it('defaults new bookings to one 30-minute slot when duration is omitted', async () => {
    const { prisma, service } = makeService();

    await service.create({
      staff_id: 'staff-1',
      start_time: '2026-06-08T09:00',
      title: 'Default duration booking',
    });

    const data = prisma.tenant.appointments.create.mock.calls[0][0].data;
    expect(data.duration_min).toBe(30);
    expect(data.start_time.getTime()).toBe(new Date('2026-06-08T05:00:00.000Z').getTime());
    expect(data.end_time.getTime()).toBe(new Date('2026-06-08T05:30:00.000Z').getTime());
  });

  it('uses the schedule slot duration as the omitted-duration default', async () => {
    const { prisma, service } = makeService(60);

    await service.create({
      staff_id: 'staff-1',
      start_time: '2026-06-08T09:00',
      title: 'Schedule duration booking',
    });

    const data = prisma.tenant.appointments.create.mock.calls[0][0].data;
    expect(data.duration_min).toBe(60);
    expect(data.end_time.getTime()).toBe(new Date('2026-06-08T06:00:00.000Z').getTime());
  });
});
