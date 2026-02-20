import { ApiProperty } from '@nestjs/swagger';

export class StaffUserResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'org-1' })
  organizationId!: string;

  @ApiProperty({ example: 'staff@example.com' })
  email!: string;

  @ApiProperty({ example: '支援スタッフA' })
  name!: string;

  @ApiProperty({ example: 'staff' })
  role!: string;

  @ApiProperty({ example: true })
  mfaEnabled!: boolean;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;
}
