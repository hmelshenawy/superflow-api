import { Injectable, NotFoundException } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { PaginationDto } from '../common/dto/pagination.dto';

@Injectable()
export class VehiclesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateVehicleDto) {
    return this.prisma.vehicles.create({ data: { id: uuid(), customer_id: dto.customer_id, vin: dto.vin, make: dto.make, model: dto.model, year: dto.year, plate: dto.plate, color: dto.color, odometer_km: dto.odometer_km, vehicle_type: dto.vehicle_type || undefined, engine: dto.engine } });
  }

  async findAll(pagination: PaginationDto) {
    const skip = (pagination.page - 1) * pagination.limit;
    const [items, total] = await Promise.all([
      this.prisma.vehicles.findMany({ skip, take: pagination.limit, orderBy: { created_at: 'desc' } }),
      this.prisma.vehicles.count(),
    ]);
    return { items, total, page: pagination.page, limit: pagination.limit };
  }

  async findOne(id: string) {
    const vehicle = await this.prisma.vehicles.findUnique({
      where: { id },
      include: { customers: true, jobs: true, vehicle_service_history: true },
    });
    if (!vehicle) throw new NotFoundException('Vehicle not found');
    return vehicle;
  }

  async findByVin(vin: string) {
    return this.prisma.vehicles.findUnique({ where: { vin }, include: { customers: true } });
  }

  async findByCustomer(customerId: string) {
    return this.prisma.vehicles.findMany({ where: { customer_id: customerId } });
  }

  async update(id: string, dto: UpdateVehicleDto) {
    await this.findOne(id);
    return this.prisma.vehicles.update({ where: { id }, data: dto });
  }
}