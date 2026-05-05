import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { v4 as uuid } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PaginationDto } from '../common/dto/pagination.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateUserDto) {
    // Email uniqueness is checked up front so the user gets a clear message
    // instead of a Prisma constraint error.
    const exists = await this.prisma.users.findUnique({ where: { email: dto.email } });
    if (exists) throw new ConflictException('Email already exists');

    const hash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.users.create({
      data: { id: uuid(), name: dto.name, email: dto.email, password_hash: hash, role_id: dto.role_id, employee_code: dto.employee_code },
    });
    const { password_hash, ...result } = user;
    return result;
  }

  async findAll(pagination: PaginationDto) {
    const skip = (pagination.page - 1) * pagination.limit;
    const [items, total] = await Promise.all([
      this.prisma.users.findMany({
        skip,
        take: pagination.limit,
        select: {
          id: true,
          name: true,
          email: true,
          role_id: true,
          employee_code: true,
          is_active: true,
          last_login_at: true,
          created_at: true,
          updated_at: true,
          roles: { select: { id: true, name: true, permissions: true, description: true } },
        },
      }),
      this.prisma.users.count(),
    ]);
    const data = items.map((item: (typeof items)[number]) => ({ ...item, role: item.roles }));
    return { items: data, total, page: pagination.page, limit: pagination.limit };
  }

  async findOne(id: string) {
    const user = await this.prisma.users.findUnique({ where: { id }, select: { id: true, name: true, email: true, role_id: true, employee_code: true, is_active: true, avatar_url: true, last_login_at: true, created_at: true, updated_at: true, roles: { select: { id: true, name: true, permissions: true, description: true } } } });
    if (!user) throw new NotFoundException('User not found');
    return { ...user, role: user.roles };
  }

  async update(id: string, dto: UpdateUserDto) {
    await this.findOne(id);
    const data: any = { ...dto };
    if (dto.password) {
      data.password_hash = await bcrypt.hash(dto.password, 10);
      delete data.password;
    }
    const { password_hash, ...result } = await this.prisma.users.update({ where: { id }, data });
    return result;
  }

  async remove(id: string) {
    await this.findOne(id);
    // Soft-delete: deactivating a user keeps historical references (audit logs,
    // job assignments) valid while blocking new logins.
    const { password_hash, ...result } = await this.prisma.users.update({ where: { id }, data: { is_active: false } });
    return result;
  }

  async resetPassword(id: string, newPassword: string) {
    const user = await this.prisma.users.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    const hash = await bcrypt.hash(newPassword, 10);
    await this.prisma.users.update({ where: { id }, data: { password_hash: hash } });
    return { id: user.id, name: user.name, email: user.email, message: 'Password reset successfully' };
  }
}