import { DmsAdapter, DmsAdvisorData, DmsPartsData, DmsRepairOrder, DmsRevenueData, DmsTechnicianData } from './dms-adapter.interface';

export class MockDmsAdapter implements DmsAdapter {
  async fetchOpenRepairOrders(): Promise<DmsRepairOrder[]> {
    return [
      { roNumber: 'DMS-1042', status: 'in_progress', advisorCode: 'ADV-1', technicianCode: 'TECH-1', customerName: 'Imported Customer', vehicleDescription: 'Toyota Prado', promisedAt: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString() },
      { roNumber: 'DMS-1043', status: 'waiting_parts', advisorCode: 'ADV-2', technicianCode: 'TECH-2', customerName: 'Fleet Account', vehicleDescription: 'Nissan Patrol' },
    ];
  }

  async fetchJobStatus(roNumber: string): Promise<DmsRepairOrder | null> {
    const jobs = await this.fetchOpenRepairOrders();
    return jobs.find((job) => job.roNumber === roNumber) ?? null;
  }

  async fetchAdvisorData(): Promise<DmsAdvisorData[]> {
    return [
      { advisorCode: 'ADV-1', name: 'Service Advisor', openRepairOrders: 12, approvalDelayHours: 3, conversionRate: 0.64 },
      { advisorCode: 'ADV-2', name: 'Senior Advisor', openRepairOrders: 9, approvalDelayHours: 5, conversionRate: 0.58 },
    ];
  }

  async fetchTechnicianData(): Promise<DmsTechnicianData[]> {
    return [
      { technicianCode: 'TECH-1', name: 'Technician One', assignedHours: 6.5, availableHours: 8 },
      { technicianCode: 'TECH-2', name: 'Technician Two', assignedHours: 8.5, availableHours: 8 },
    ];
  }

  async fetchRevenueData(): Promise<DmsRevenueData | null> {
    return { revenue: 128000, laborSales: 62000, partsSales: 66000, partsMargin: 0.31, deferredWorkValue: 18400 };
  }

  async fetchPartsData(): Promise<DmsPartsData[]> {
    return [
      { partNumber: 'DMS-OIL-5W30', description: 'Engine Oil 5W30', quantityAvailable: 28, margin: 0.24 },
      { partNumber: 'DMS-BRK-PAD', description: 'Brake Pad Set', quantityAvailable: 6, margin: 0.34 },
    ];
  }
}
