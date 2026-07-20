import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";

import { AuthService, type AuthSession } from "./auth.service.js";

export type AuthenticatedRequest = {
  readonly headers: {
    readonly cookie?: string;
  };
  user?: AuthSession;
};

@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.authService.extractSessionToken(request.headers.cookie);
    const session = token ? this.authService.validateSessionToken(token) : null;

    if (!session) {
      throw new UnauthorizedException("Authentication required");
    }

    request.user = session;
    return true;
  }
}
