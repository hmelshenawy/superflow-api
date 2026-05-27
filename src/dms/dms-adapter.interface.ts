export interface DmsRepairOrder {
  roNumber: string;
  status: string;
  advisorCode?: string;
  technicianCode?: string;
  promisedAt?: string;
  customerName?: string;
  vehicleDescription?: string;
}

export interface DmsAdvisorData {
  advisorCode: string;
  name: string;
  openRepairOrders: number;
  approvalDelayHours: number;
  conversionRate?: number;
}

export interface DmsTechnicianData {
  technicianCode: string;
  name: string;
  assignedHours: number;
  availableHours: number;
}

export interface DmsRevenueData {
  revenue?: number;
  laborSales?: number;
  partsSales?: number;
  partsMargin?: number;
  deferredWorkValue?: number;
}

export interface DmsPartsData {
  partNumber: string;
  description: string;
  quantityAvailable?: number;
  margin?: number;
}

export interface DmsAdapter {
  fetchOpenRepairOrders(): Promise<DmsRepairOrder[]>;
  fetchJobStatus(roNumber: string): Promise<DmsRepairOrder | null>;
  fetchAdvisorData(): Promise<DmsAdvisorData[]>;
  fetchTechnicianData(): Promise<DmsTechnicianData[]>;
  fetchRevenueData(): Promise<DmsRevenueData | null>;
  fetchPartsData(): Promise<DmsPartsData[]>;
}
