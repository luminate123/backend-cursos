import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// Populates request.user when a valid token is present, but never rejects
// anonymous requests. Use on public-readable routes that redact their
// response based on who (if anyone) is asking.
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(_err: any, user: any) {
    return user || null;
  }
}
