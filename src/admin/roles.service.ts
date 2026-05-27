import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { v4 as uuid } from 'uuid';

@Injectable()
export class RolesService {
  constructor(private prisma: PrismaService) {}

  async getRoles(user?: any) {
    const roles = await this.prisma.raw.roles.findMany({ orderBy: { name: 'asc' } });
    if (user?.role !== 'platform_admin') {
      return roles.filter((r: typeof roles[number]) => r.name !== 'platform_admin').map((r: typeof roles[number]) => ({ ...r, permissions: r.permissions ? JSON.parse(r.permissions) : [] }));
    }
    return roles.map((r: typeof roles[number]) => ({
      ...r,
      permissions: r.permissions ? JSON.parse(r.permissions) : [],
    }));
  }

  async createRole(body: { name: string; permissions?: string[]; description?: string }) {
    if (!body?.name) throw new BadRequestException('name is required');
    const role = await this.prisma.raw.roles.create({
      data: {
        id: uuid(),
        name: body.name,
        permissions: body.permissions ? JSON.stringify(body.permissions) : null,
        description: body.description || null,
      },
    });
    return { ...role, permissions: role.permissions ? JSON.parse(role.permissions) : [] };
  }

  async updateRole(id: string, body: { name?: string; permissions?: string[]; description?: string }) {
    const role = await this.prisma.raw.roles.findUnique({ where: { id } });
    if (!role) throw new NotFoundException('Role not found');
    const updated = await this.prisma.raw.roles.update({
      where: { id },
      data: {
        ...(body.name && { name: body.name }),
        ...(body.permissions !== undefined && { permissions: JSON.stringify(body.permissions) }),
        ...(body.description !== undefined && { description: body.description }),
      },
    });
    return { ...updated, permissions: updated.permissions ? JSON.parse(updated.permissions) : [] };
  }

  async deleteRole(id: string) {
    const role = await this.prisma.raw.roles.findUnique({ where: { id } });
    if (!role) throw new NotFoundException('Role not found');
    const usersWithRole = await this.prisma.raw.users.count({ where: { role_id: id } });
    if (usersWithRole > 0) throw new BadRequestException(`Cannot delete: ${usersWithRole} user(s) assigned to this role`);
    return this.prisma.raw.roles.delete({ where: { id } });
  }
}