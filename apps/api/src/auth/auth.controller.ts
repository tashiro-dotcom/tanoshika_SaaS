import { Body, Controller, Post } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiAuthErrorResponses } from '../common/swagger-error.decorators';
import {
  LoginDto,
  LoginResponseDto,
  LogoutDto,
  LogoutResponseDto,
  RefreshDto,
  TokenPairResponseDto,
  VerifyMfaDto,
} from './auth.dto';
import { AuthService } from './auth.service';

@ApiTags('Auth')
@ApiAuthErrorResponses()
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'ログイン（MFAチャレンジ発行）' })
  @ApiOkResponse({ type: LoginResponseDto })
  login(@Body() body: LoginDto) {
    return this.authService.login(body.email, body.password);
  }

  @Post('mfa/verify')
  @ApiOperation({ summary: 'MFA検証（Access/Refresh発行）' })
  @ApiOkResponse({ type: TokenPairResponseDto })
  verifyMfa(@Body() body: VerifyMfaDto) {
    return this.authService.verifyMfa(body.challengeToken, body.otp);
  }

  @Post('refresh')
  @ApiOperation({ summary: 'リフレッシュトークンで再発行' })
  @ApiOkResponse({ type: TokenPairResponseDto })
  refresh(@Body() body: RefreshDto) {
    return this.authService.refresh(body.refreshToken);
  }

  @Post('logout')
  @ApiOperation({ summary: 'リフレッシュトークン無効化' })
  @ApiOkResponse({ type: LogoutResponseDto })
  logout(@Body() body: LogoutDto) {
    return this.authService.logout(body.refreshToken);
  }
}
