import type { Request, RequestHandler } from 'express';
import { canAccessArea } from '../modules/authorization/area-access';
import { HttpError } from '../utils/http-error';

export type AreaResolver = (
  req: Request,
) => Promise<string | null | undefined> | string | null | undefined;

export function requireAreaOwnership(resolveAreaId: AreaResolver): RequestHandler {
  return async (req, _res, next) => {
    try {
      const user = req.authUser;

      if (!user) {
        throw new HttpError(401, 'Authentication required');
      }

      const areaId = await resolveAreaId(req);

      if (!areaId || !(await canAccessArea(user, areaId))) {
        throw new HttpError(403, 'Access denied for this area');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}
