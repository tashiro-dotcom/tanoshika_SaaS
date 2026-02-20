import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiServiceUnavailableResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ApiErrorResponseDto } from './swagger-error.dto';

export function ApiCommonErrorResponses() {
  return applyDecorators(
    ApiBadRequestResponse({ description: '入力値エラー', type: ApiErrorResponseDto }),
    ApiUnauthorizedResponse({ description: '認証エラー', type: ApiErrorResponseDto }),
    ApiForbiddenResponse({ description: '権限エラー', type: ApiErrorResponseDto }),
    ApiNotFoundResponse({ description: '対象データなし', type: ApiErrorResponseDto }),
    ApiConflictResponse({ description: '一意制約エラー', type: ApiErrorResponseDto }),
    ApiServiceUnavailableResponse({ description: 'DB接続不可', type: ApiErrorResponseDto }),
    ApiInternalServerErrorResponse({ description: 'サーバ内部エラー', type: ApiErrorResponseDto }),
  );
}

export function ApiAuthErrorResponses() {
  return applyDecorators(
    ApiBadRequestResponse({ description: '入力値エラー', type: ApiErrorResponseDto }),
    ApiUnauthorizedResponse({ description: '認証エラー', type: ApiErrorResponseDto }),
    ApiConflictResponse({ description: '一意制約エラー', type: ApiErrorResponseDto }),
    ApiServiceUnavailableResponse({ description: 'DB接続不可', type: ApiErrorResponseDto }),
    ApiInternalServerErrorResponse({ description: 'サーバ内部エラー', type: ApiErrorResponseDto }),
  );
}
