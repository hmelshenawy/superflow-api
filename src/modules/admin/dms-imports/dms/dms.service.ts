import { Injectable } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { PrismaService } from '../../../../prisma/prisma.service';
import { MockDmsAdapter } from './mock-dms.adapter';

@Injectable()
export class DmsService {
  constructor(private prisma: PrismaService) {}

  private adapter() {
    return new MockDmsAdapter();
  }

  async getStatus(workshopId: string) {
    const [workshop, integration, lastEvent] = await Promise.all([
      this.prisma.raw.workshops.findUnique({ where: { id: workshopId } }),
      this.prisma.raw.integrations.findFirst({ where: { workshop_id: workshopId, type: 'dms' } }),
      this.prisma.raw.integration_events.findFirst({
        where: { workshop_id: workshopId, event_type: 'dms_mock_sync' },
        orderBy: { created_at: 'desc' },
      }),
    ]);

    return {
      provider: integration?.name || 'mock-dms',
      enabled: Boolean((workshop as any)?.dms_integration_enabled || integration?.is_enabled),
      productMode: (workshop as any)?.product_mode || 'WORKSHOP',
      lastSyncTime: lastEvent?.created_at ?? null,
      lastStatus: lastEvent?.status ?? 'pending',
      imported: lastEvent?.payload ? JSON.parse(lastEvent.payload) : null,
    };
  }

  async sync(workshopId: string) {
    const adapter = this.adapter();
    const [openRepairOrders, advisorData, technicianData, revenueData, partsData] = await Promise.all([
      adapter.fetchOpenRepairOrders(),
      adapter.fetchAdvisorData(),
      adapter.fetchTechnicianData(),
      adapter.fetchRevenueData(),
      adapter.fetchPartsData(),
    ]);

    const payload = {
      importedJobs: openRepairOrders.length,
      importedCustomers: new Set(openRepairOrders.map((item) => item.customerName).filter(Boolean)).size,
      importedVehicles: new Set(openRepairOrders.map((item) => item.vehicleDescription).filter(Boolean)).size,
      advisorRows: advisorData.length,
      technicianRows: technicianData.length,
      revenueAvailable: Boolean(revenueData),
      partsRows: partsData.length,
    };

    let integration = await this.prisma.raw.integrations.findFirst({ where: { workshop_id: workshopId, type: 'dms' } });
    if (!integration) {
      integration = await this.prisma.raw.integrations.create({
        data: {
          id: uuid(),
          workshop_id: workshopId,
          name: 'mock-dms',
          type: 'dms',
          is_enabled: true,
          config: JSON.stringify({ provider: 'mock', mode: 'placeholder' }),
        },
      });
    }

    await this.prisma.raw.integration_events.create({
      data: {
        id: uuid(),
        integration_id: integration.id,
        workshop_id: workshopId,
        event_type: 'dms_mock_sync',
        direction: 'inbound',
        payload: JSON.stringify(payload),
        response: JSON.stringify({ openRepairOrders, advisorData, technicianData, revenueData, partsData }),
        status: 'success',
        attempt_count: 1,
      },
    });

    await this.prisma.raw.workshops.update({
      where: { id: workshopId },
      data: { dms_integration_enabled: true } as any,
    });

    return { ok: true, provider: integration.name, ...payload };
  }
}
