import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(input: {
    actorId: string;
    organizationId: string;
    action: string;
    entity: string;
    entityId: string;
    detail: unknown;
  }) {
    await this.prisma.auditLog.create({
      data: {
        actorId: input.actorId,
        organizationId: input.organizationId,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId,
        detail: input.detail as any,
      },
    });
  }
}
