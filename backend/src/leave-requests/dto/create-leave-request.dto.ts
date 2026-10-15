import { IsISO8601, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateLeaveRequestDto {
  @IsString({ message: 'leave_type_id must be a string' })
  @IsNotEmpty({ message: 'leave_type_id is required' })
  leave_type_id: string;

  @IsISO8601({}, { message: 'start_date must be a valid ISO8601 date string (e.g. YYYY-MM-DD)' })
  @IsNotEmpty({ message: 'start_date is required' })
  start_date: string;

  @IsISO8601({}, { message: 'end_date must be a valid ISO8601 date string (e.g. YYYY-MM-DD)' })
  @IsNotEmpty({ message: 'end_date is required' })
  end_date: string;

  @IsOptional()
  @IsString({ message: 'reason must be a string' })
  reason?: string;
}
