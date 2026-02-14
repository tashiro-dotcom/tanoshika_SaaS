import { Body, Controller, Post } from '@nestjs/common';
import { LoginDto, LogoutDto, RefreshDto, VerifyMfaDto } from './auth.dto';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(@Body() body: LoginDto) {
    return this.authService.login(body.email, body.password);
  }

  @Post('mfa/verify')
  verifyMfa(@Body() body: VerifyMfaDto) {
    return this.authService.verifyMfa(body.challengeToken, body.otp);
  }

  @Post('refresh')
  refresh(@Body() body: RefreshDto) {
    return this.authService.refresh(body.refreshToken);
  }

  @Post('logout')
  logout(@Body() body: LogoutDto) {
    return this.authService.logout(body.refreshToken);
  }
}
