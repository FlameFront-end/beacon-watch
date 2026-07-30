import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";

import { AuthService, type AuthSession } from "./auth.service.js";
import { PUBLIC_ROUTE_KEY } from "./public.decorator.js";

export type AuthenticatedRequest = {
  readonly headers: {
    readonly cookie?: string;
  };
  user?: AuthSession;
};

@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(
    @Inject(AuthService) private readonly authService: AuthService,
    private readonly reflector?: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector?.getAllAndOverride<boolean>(
      PUBLIC_ROUTE_KEY,
      [context.getHandler(), context.getClass()],
    ) ?? false;
    if (isPublic) {
      return true;
    }

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
