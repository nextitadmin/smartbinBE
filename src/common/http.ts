import { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import { map, Observable } from 'rxjs';

interface Meta {
  paging?: Paging | null;
}

export interface Paging {
  page: number;
  pages: number;
  size: number;
  total: number;
}

interface Error {
  message: string;
  field?: string;
}

interface ResponseObject<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  meta?: Meta;
  errors?: Error[];
}

abstract class BaseResponse implements ResponseObject {
  constructor(
    public success: boolean,
    public message: string,
  ) {}
}

export class SuccessResponse<T = unknown> extends BaseResponse {
  constructor(
    message: string,
    public data: T,
  ) {
    super(true, message);
  }
}

export class PaginatedSuccessResponse<T = unknown> extends SuccessResponse<T> {
  public meta: Meta;

  constructor(message: string, data: T, paging: Paging) {
    super(message, data);
    this.meta = { paging };
  }
}

export class ErrorResponseObject extends BaseResponse {
  constructor(
    public message: string,
    public errors: Error[] = [],
  ) {
    super(false, message);
  }
}

export class AppResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => {
        if (data instanceof ErrorResponseObject || data instanceof Error) {
          return data;
        }
        return new SuccessResponse(
          data?.message || 'operation successful',
          data.data,
        );
      }),
    );
  }
}
