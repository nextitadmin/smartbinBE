import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  Logger,
  HttpStatus,
} from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import { Response } from 'express';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { ErrorResponseObject } from '../http';
import { RequestValidationException } from '../errors';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  private handleHttp(exception: HttpException, res: Response) {
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse() as
      | string
      | Record<string, any>;

    const message =
      typeof exceptionResponse === 'string'
        ? exceptionResponse
        : exceptionResponse.message;

    res.status(status).json(new ErrorResponseObject(message));
  }

  private handleThrottled(res: Response) {
    const nextRetry = res.getHeader('retry-after');
    res
      .status(HttpStatus.TOO_MANY_REQUESTS)
      .json(
        new ErrorResponseObject(
          `Too many requests, retry after ${nextRetry} seconds.`,
        ),
      );
  }

  private handleFormedError(exception: ErrorResponseObject, res: Response) {
    res.status(400).json(exception);
  }

  private handleUnknownError(exception: unknown, res: Response) {
    this.logger.error(exception);
    res.status(500).json(new ErrorResponseObject('An unknown error occurred'));
  }

  private handleTokenExpired(res: Response) {
    res
      .status(HttpStatus.UNAUTHORIZED)
      .json(new ErrorResponseObject('Authentication token expired'));
  }

  private handleInvalidToken(res: Response) {
    res
      .status(HttpStatus.UNAUTHORIZED)
      .json(new ErrorResponseObject('Invalid authentication token'));
  }

  private handleRequestValidationError(
    exception: RequestValidationException,
    res: Response,
  ) {
    res.status(422).json(exception.errorObject);
  }

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof ThrottlerException) {
      return this.handleThrottled(response);
    }

    if (exception instanceof TokenExpiredError) {
      return this.handleTokenExpired(response);
    }

    if (exception instanceof JsonWebTokenError) {
      return this.handleInvalidToken(response);
    }

    if (exception instanceof RequestValidationException) {
      return this.handleRequestValidationError(exception, response);
    }

    if (exception instanceof HttpException) {
      return this.handleHttp(exception, response);
    }

    if (exception instanceof ErrorResponseObject) {
      return this.handleFormedError(exception, response);
    }

    return this.handleUnknownError(exception, response);
  }
}
