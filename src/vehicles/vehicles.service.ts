import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { PaginationDto } from '../common/dto/pagination.dto';

@Injectable()
export class VehiclesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateVehicleDto) {
    return this.prisma.vehicles.create({
      data: {
        id: uuid(),
        customer_id: dto.customer_id,
        vin: dto.vin?.toUpperCase(),
        make: dto.make,
        model: dto.model,
        year: dto.year,
        plate: dto.plate,
        color: dto.color,
        odometer_km: dto.odometer_km,
        vehicle_type: dto.vehicle_type || undefined,
        engine: dto.engine,
      },
    });
  }

  async findAll(pagination: PaginationDto) {
    const skip = (pagination.page - 1) * pagination.limit;
    const [items, total] = await Promise.all([
      this.prisma.vehicles.findMany({
        skip,
        take: pagination.limit,
        include: { customers: { select: { id: true, name: true, phone: true } } },
        orderBy: { created_at: 'desc' },
      }),
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
    const normalizedVin = vin.trim().toUpperCase();
    if (normalizedVin.length !== 17) throw new BadRequestException('VIN must be exactly 17 characters');

    const existingVehicle = await this.prisma.vehicles.findUnique({
      where: { vin: normalizedVin },
      include: { customers: { select: { id: true, name: true, phone: true } } },
    });

    let decoded: any = null;
    try {
      const response = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${normalizedVin}?format=json`);
      const data: any = await response.json();
      const row = data?.Results?.[0];
      if (row) {
        decoded = {
          vin: normalizedVin,
          make: row.Make || null,
          model: row.Model || null,
          year: row.ModelYear ? Number(row.ModelYear) : null,
          bodyClass: row.BodyClass || null,
          engine: row.EngineModel || row.DisplacementL || null,
          fuelType: row.FuelTypePrimary || null,
          manufacturer: row.Manufacturer || null,
          plantCountry: row.PlantCountry || null,
          errorCode: row.ErrorCode || null,
          errorText: row.ErrorText || null,
        };
      }
    } catch {
      decoded = null;
    }

    return {
      vin: normalizedVin,
      existingVehicle,
      decoded,
    };
  }

  async findByCustomer(customerId: string) {
    return this.prisma.vehicles.findMany({ where: { customer_id: customerId }, orderBy: { created_at: 'desc' } });
  }

  async update(id: string, dto: UpdateVehicleDto) {
    await this.findOne(id);
    return this.prisma.vehicles.update({
      where: { id },
      data: {
        ...dto,
        vin: dto.vin?.toUpperCase(),
        vehicle_type: dto.vehicle_type || undefined,
      },
    });
  }
}
