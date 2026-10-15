import { IsOptional, IsString } from 'class-validator';

export class RejectLeaveRequestDto {
  @IsOptional()
  @IsString({ message: 'admin_comment must be a string' })
  admin_comment?: string;
}
