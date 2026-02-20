import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { LoginDto, LogoutDto, RefreshDto, VerifyMfaDto } from './auth.dto';
import { AuthService } from './auth.service';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'ログイン（MFAチャレンジ発行）' })
  login(@Body() body: LoginDto) {
    return this.authService.login(body.email, body.password);
  }

  @Post('mfa/verify')
  @ApiOperation({ summary: 'MFA検証（Access/Refresh発行）' })
  verifyMfa(@Body() body: VerifyMfaDto) {
    return this.authService.verifyMfa(body.challengeToken, body.otp);
  }

  @Post('refresh')
  @ApiOperation({ summary: 'リフレッシュトークンで再発行' })
  refresh(@Body() body: RefreshDto) {
    return this.authService.refresh(body.refreshToken);
  }

  @Post('logout')
  @ApiOperation({ summary: 'リフレッシュトークン無効化' })
  logout(@Body() body: LogoutDto) {
    return this.authService.logout(body.refreshToken);
  }
}
