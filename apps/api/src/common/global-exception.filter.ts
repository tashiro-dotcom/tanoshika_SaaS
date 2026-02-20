import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Request, Response } from 'express';

type ErrorPayload = {
  statusCode: number;
  message: string | string[];
  error?: string;
  code?: string;
  timestamp: string;
  path: string;
};

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const timestamp = new Date().toISOString();
    const path = request?.url || 'unknown';

    const handled = this.handleHttpException(exception, timestamp, path)
      || this.handlePrismaKnownError(exception, timestamp, path)
      || this.handlePrismaRuntimeError(exception, timestamp, path)
      || this.handleUnknownError(timestamp, path);

    if (handled.statusCode >= 500) {
      this.logger.error(
        `Unhandled exception: ${handled.message}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    response.status(handled.statusCode).json(handled);
  }

  private handleHttpException(exception: unknown, timestamp: string, path: string): ErrorPayload | null {
    if (!(exception instanceof HttpException)) return null;

    const statusCode = exception.getStatus();
    const body = exception.getResponse();

    if (typeof body === 'string') {
      return {
        statusCode,
        message: body,
        error: exception.name,
        timestamp,
        path,
      };
    }

    if (typeof body === 'object' && body !== null) {
      const cast = body as Record<string, unknown>;
      return {
        statusCode: typeof cast.statusCode === 'number' ? cast.statusCode : statusCode,
        message: Array.isArray(cast.message) ? cast.message.map(String) : String(cast.message ?? exception.message),
        error: typeof cast.error === 'string' ? cast.error : exception.name,
        code: typeof cast.code === 'string' ? cast.code : undefined,
        timestamp,
        path,
      };
    }

    return {
      statusCode,
      message: exception.message || 'http_error',
      error: exception.name,
      timestamp,
      path,
    };
  }

  private handlePrismaKnownError(exception: unknown, timestamp: string, path: string): ErrorPayload | null {
    if (!(exception instanceof Prisma.PrismaClientKnownRequestError)) return null;

    const map: Record<string, { status: number; message: string }> = {
      P2002: { status: HttpStatus.CONFLICT, message: 'unique_constraint_violation' },
      P2003: { status: HttpStatus.BAD_REQUEST, message: 'foreign_key_violation' },
      P2025: { status: HttpStatus.NOT_FOUND, message: 'not_found' },
    };
    const resolved = map[exception.code] || {
      status: HttpStatus.BAD_REQUEST,
      message: 'database_error',
    };
    return {
      statusCode: resolved.status,
      message: resolved.message,
      error: 'PrismaKnownRequestError',
      code: exception.code,
      timestamp,
      path,
    };
  }

  private handlePrismaRuntimeError(exception: unknown, timestamp: string, path: string): ErrorPayload | null {
    if (exception instanceof Prisma.PrismaClientInitializationError) {
      return {
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        message: 'database_unavailable',
        error: 'PrismaInitializationError',
        timestamp,
        path,
      };
    }
    if (exception instanceof Prisma.PrismaClientValidationError) {
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'database_validation_error',
        error: 'PrismaValidationError',
        timestamp,
        path,
      };
    }
    return null;
  }

  private handleUnknownError(timestamp: string, path: string): ErrorPayload {
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'internal_server_error',
      error: 'InternalServerError',
      timestamp,
      path,
    };
  }
}
