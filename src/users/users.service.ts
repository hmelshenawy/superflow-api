import { Injectable, ConflictException, NotFoundException, ForbiddenException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { v4 as uuid } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PaginationDto } from '../common/dto/pagination.dto';

const PLATFORM_ADMIN_ROLE_ID_CACHE: { id: string | null } = { id: null };

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  private async getPlatformAdminRoleId(): Promise<string | null> {
    if (PLATFORM_ADMIN_ROLE_ID_CACHE.id) return PLATFORM_ADMIN_ROLE_ID_CACHE.id;
    const role = await this.prisma.raw.roles.findFirst({ where: { name: 'platform_admin' } });
    if (role) PLATFORM_ADMIN_ROLE_ID_CACHE.id = role.id;
    return role?.id ?? null;
  }

  async create(dto: CreateUserDto, requestingUser?: any) {
    // Non-platform-admins cannot assign platform_admin role
    if (dto.role_id) {
      const platformRoleId = await this.getPlatformAdminRoleId();
      if (dto.role_id === platformRoleId && requestingUser?.role !== 'platform_admin') {
        throw new ForbiddenException('Only platform administrators can assign the platform_admin role');
      }
    }

    const exists = await this.prisma.raw.users.findUnique({ where: { email: dto.email } });
    if (exists) throw new ConflictException('Email already exists');

    const hash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.raw.users.create({
      data: { id: uuid(), name: dto.name, email: dto.email, password_hash: hash, role_id: dto.role_id, employee_code: dto.employee_code },
    });

    // If creator has a workshopId, auto-assign the new user to the same workshop
    const workshopId = requestingUser?.workshopId;
    if (workshopId) {
      await this.prisma.raw.user_workshop_access.create({
        data: { id: uuid(), user_id: user.id, workshop_id: workshopId, assigned_at: new Date() },
      }).catch(() => {});
    }

    const { password_hash, ...result } = user;
    return result;
  }

  async findAll(pagination: PaginationDto, requestingUser?: any) {
    const skip = (pagination.page - 1) * pagination.limit;

    // Platform admin sees all users
    if (requestingUser?.role === 'platform_admin') {
      const [items, total] = await Promise.all([
        this.prisma.raw.users.findMany({
          skip,
          take: pagination.limit,
          select: {
            id: true, name: true, email: true, role_id: true, employee_code: true,
            is_active: true, last_login_at: true, created_at: true, updated_at: true,
            roles: { select: { id: true, name: true, permissions: true, description: true } },
          },
        }),
        this.prisma.raw.users.count(),
      ]);
      return { items: items.map((item: any) => ({ ...item, role: item.roles })), total, page: pagination.page, limit: pagination.limit };
    }

    // Non-platform admins: only see users in their workshop(s)
    const workshopId = requestingUser?.workshopId;
    let userIds: string[] = [];

    if (workshopId) {
      const accesses = await this.prisma.raw.user_workshop_access.findMany({
        where: { workshop_id: workshopId },
        select: { user_id: true },
      });
      userIds = accesses.map((a: any) => a.user_id);
    }

    if (userIds.length === 0) {
      return { items: [], total: 0, page: pagination.page, limit: pagination.limit };
    }

    const [items, total] = await Promise.all([
      this.prisma.raw.users.findMany({
        where: { id: { in: userIds } },
        skip,
        take: pagination.limit,
        select: {
          id: true, name: true, email: true, role_id: true, employee_code: true,
          is_active: true, last_login_at: true, created_at: true, updated_at: true,
          roles: { select: { id: true, name: true, permissions: true, description: true } },
        },
      }),
      this.prisma.raw.users.count({ where: { id: { in: userIds } } }),
    ]);
    return { items: items.map((item: any) => ({ ...item, role: item.roles })), total, page: pagination.page, limit: pagination.limit };
  }

  async findAssignable(requestingUser?: any) {
    // Return active technicians and advisors in the same workshop, minimal fields
    const workshopId = requestingUser?.workshopId;

    // Find the role IDs for technician, service_advisor, admin, and manager
    const targetRoleNames = ['technician', 'service_advisor', 'admin', 'manager', 'workshop_teamleader'];
    const roles = await this.prisma.raw.roles.findMany({
      where: { name: { in: targetRoleNames } },
      select: { id: true, name: true },
    });
    const roleIds = roles.map((r: any) => r.id);
    const roleNameMap = new Map(roles.map((r: any) => [r.id, r.name]));

    let userIds: string[] = [];

    if (workshopId) {
      const accesses = await this.prisma.raw.user_workshop_access.findMany({
        where: { workshop_id: workshopId },
        select: { user_id: true },
      });
      userIds = accesses.map((a: any) => a.user_id);
    }

    if (userIds.length === 0) return [];

    const users = await this.prisma.raw.users.findMany({
      where: { id: { in: userIds }, is_active: true, role_id: { in: roleIds } },
      select: {
        id: true, name: true, role_id: true,
        roles: { select: { name: true } },
      },
    });

    return users.map((u: any) => ({ id: u.id, name: u.name, role: u.roles?.name ?? u.role_id }));
  }

  async findOne(id: string) {
    const user = await this.prisma.raw.users.findUnique({
      where: { id },
      select: {
        id: true, name: true, email: true, role_id: true, employee_code: true,
        is_active: true, avatar_url: true, last_login_at: true, created_at: true, updated_at: true,
        roles: { select: { id: true, name: true, permissions: true, description: true } },
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return { ...user, role: user.roles };
  }

  async update(id: string, dto: UpdateUserDto, requestingUser?: any) {
    await this.findOne(id);

    // Non-platform-admins cannot change someone to/from platform_admin role
    if (dto.role_id) {
      const platformRoleId = await this.getPlatformAdminRoleId();
      if (dto.role_id === platformRoleId && requestingUser?.role !== 'platform_admin') {
        throw new ForbiddenException('Only platform administrators can assign the platform_admin role');
      }
    }

    const data: any = { ...dto };
    if (dto.password) {
      data.password_hash = await bcrypt.hash(dto.password, 10);
      delete data.password;
    }
    const { password_hash, ...result } = await this.prisma.raw.users.update({ where: { id }, data });
    return result;
  }

  async remove(id: string) {
    await this.findOne(id);
    const { password_hash, ...result } = await this.prisma.raw.users.update({ where: { id }, data: { is_active: false } });
    return result;
  }

  async resetPassword(id: string, newPassword: string) {
    const user = await this.prisma.raw.users.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    const hash = await bcrypt.hash(newPassword, 10);
    await this.prisma.raw.users.update({ where: { id }, data: { password_hash: hash } });
    return { id: user.id, name: user.name, email: user.email, message: 'Password reset successfully' };
  }
}
