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
    const exists = await this.prisma.users.findUnique({ where: { email: dto.email } });
    if (exists) throw new ConflictException('Email already exists');

    const hash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.users.create({
      data: { id: uuid(), name: dto.name, email: dto.email, password_hash: hash, role_id: dto.role_id },
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
          is_active: true,
          last_login_at: true,
          created_at: true,
          updated_at: true,
          roles: { select: { id: true, name: true, permissions: true, description: true } },
        },
      }),
      this.prisma.users.count(),
    ]);
    const data = items.map((item) => ({ ...item, role: item.roles }));
    return { items: data, data, total, page: pagination.page, limit: pagination.limit };
  }

  async findOne(id: string) {
    const user = await this.prisma.users.findUnique({ where: { id }, select: { id: true, name: true, email: true, role_id: true, is_active: true, avatar_url: true, last_login_at: true, created_at: true, updated_at: true, roles: { select: { id: true, name: true, permissions: true, description: true } } } });
    if (!user) throw new NotFoundException('User not found');
    return { ...user, role: user.roles };
  }

  async update(id: string, dto: UpdateUserDto) {
    await this.findOne(id);
    return this.prisma.users.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.users.update({ where: { id }, data: { is_active: false } });
  }
}