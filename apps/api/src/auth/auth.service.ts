import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare } from 'bcryptjs';
import { authenticator } from 'otplib';
import { PrismaService } from '../prisma.service';
import { ACCESS_TOKEN_TTL_SECONDS, REFRESH_TOKEN_TTL_DAYS } from '../common/constants';
import { getRequiredEnv } from '../common/env';

type AuthUser = {
  id: string;
  role: string;
  organizationId: string;
};

@Injectable()
export class AuthService {
  private readonly accessSecret = getRequiredEnv('JWT_ACCESS_SECRET');
  private readonly refreshSecret = getRequiredEnv('JWT_REFRESH_SECRET');

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.prisma.staffUser.findUnique({ where: { email } });
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('invalid_credentials');
    }

    const ok = await compare(password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('invalid_credentials');
    }

    if (!user.mfaEnabled || !user.mfaSecret) {
      throw new UnauthorizedException('mfa_not_configured');
    }

    const challengeToken = this.jwt.sign(
      { sub: user.id, type: 'mfa_challenge' },
      {
        secret: this.accessSecret,
        expiresIn: '5m',
      },
    );

    return {
      mfaRequired: true,
      challengeToken,
      email: user.email,
    };
  }

  async verifyMfa(challengeToken: string, otp: string) {
    let decoded: any;
    try {
      decoded = this.jwt.verify(challengeToken, {
        secret: this.accessSecret,
      });
    } catch {
      throw new UnauthorizedException('challenge_invalid_or_expired');
    }

    if (decoded.type !== 'mfa_challenge') {
      throw new UnauthorizedException('invalid_challenge_type');
    }

    const user = await this.prisma.staffUser.findUnique({ where: { id: decoded.sub } });
    if (!user || !user.mfaSecret) {
      throw new UnauthorizedException('user_not_found');
    }

    // Allow +-30 seconds to reduce false negatives caused by minor time drift.
    const previousOptions = { ...authenticator.options };
    let validOtp = false;
    try {
      authenticator.options = { ...authenticator.options, window: 1 };
      validOtp = authenticator.verify({ token: otp, secret: user.mfaSecret });
    } finally {
      authenticator.options = previousOptions;
    }
    if (!validOtp) {
      throw new UnauthorizedException('invalid_otp');
    }

    return this.issueTokenPair(user);
  }

  async refresh(refreshToken: string) {
    const tokenRecord = await this.prisma.refreshToken.findUnique({ where: { token: refreshToken } });
    if (!tokenRecord || tokenRecord.revokedAt || tokenRecord.expiresAt < new Date()) {
      throw new UnauthorizedException('invalid_refresh_token');
    }

    let decoded: { sub: string; type?: string };
    try {
      decoded = this.jwt.verify(refreshToken, {
        secret: this.refreshSecret,
      });
    } catch {
      throw new UnauthorizedException('invalid_refresh_token');
    }
    if (decoded.type !== 'refresh') {
      throw new UnauthorizedException('invalid_refresh_token_type');
    }

    const user = await this.prisma.staffUser.findUnique({ where: { id: decoded.sub } });
    if (!user) {
      throw new UnauthorizedException('user_not_found');
    }

    await this.prisma.refreshToken.update({
      where: { token: refreshToken },
      data: { revokedAt: new Date() },
    });

    return this.issueTokenPair(user);
  }

  async logout(refreshToken: string) {
    if (!refreshToken) return { success: true };

    await this.prisma.refreshToken.updateMany({
      where: { token: refreshToken, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    return { success: true };
  }

  private async issueTokenPair(user: AuthUser) {
    const accessToken = this.jwt.sign(
      {
        sub: user.id,
        role: user.role,
        organizationId: user.organizationId,
      },
      {
        secret: this.accessSecret,
        expiresIn: ACCESS_TOKEN_TTL_SECONDS,
      },
    );

    const refreshToken = this.jwt.sign(
      {
        sub: user.id,
        role: user.role,
        organizationId: user.organizationId,
        type: 'refresh',
        jti: crypto.randomUUID(),
      },
      {
        secret: this.refreshSecret,
        expiresIn: `${REFRESH_TOKEN_TTL_DAYS}d`,
      },
    );

    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

    await this.prisma.refreshToken.create({
      data: {
        token: refreshToken,
        staffUserId: user.id,
        organizationId: user.organizationId,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    };
  }
}
