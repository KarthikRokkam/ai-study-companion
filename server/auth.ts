import { Request, Response, NextFunction } from 'express';
import { db } from './db.js';
import { User, Space, Project } from '../src/types.js';

export interface AuthenticatedRequest extends Request {
  user?: User;
  space?: Space;
  project?: Project;
}

export class AuthorizationError extends Error {
  public statusCode: number;
  constructor(message: string, statusCode = 403) {
    super(message);
    this.name = 'AuthorizationError';
    this.statusCode = statusCode;
  }
}

/**
 * Resolves and attaches authenticated user context.
 * In a real production environment this inspects session cookie / JWT token.
 * Defaults to primary verified user unless overridden by x-user-id header (for security test suites).
 */
export function authenticateUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const customUserId = req.headers['x-user-id'] as string | undefined;
  const targetUserId = customUserId || 'usr_default_learner';

  const user = db.users.get(targetUserId);
  if (!user) {
    return res.status(401).json({
      error: 'UNAUTHENTICATED',
      message: 'Failed to resolve valid authenticated user context.',
    });
  }

  req.user = user;
  next();
}

/**
 * Enforces the strict ownership validation chain:
 * Authenticated User -> Space Ownership -> Project Ownership
 *
 * Never trusts client project_id blindly!
 */
export function verifyProjectIsolation(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const user = req.user;
    if (!user) {
      throw new AuthorizationError('Authentication required prior to project isolation check.', 401);
    }

    const projectId =
      (req.params.projectId as string) ||
      (req.query.projectId as string) ||
      (req.body?.projectId as string);

    if (!projectId) {
      throw new AuthorizationError('Missing mandatory projectId parameter in request.', 400);
    }

    const project = db.projects.get(projectId);
    if (!project) {
      throw new AuthorizationError(`Project '${projectId}' was not found.`, 404);
    }

    // Check project ownership
    if (project.ownerUserId !== user.id) {
      throw new AuthorizationError(
        `Cross-project boundary violation: User '${user.id}' is not the authorized owner of Project '${projectId}'.`,
        403
      );
    }

    // Verify Space ownership hierarchy
    const space = db.spaces.get(project.spaceId);
    if (!space) {
      throw new AuthorizationError(
        `Orphaned project: Space '${project.spaceId}' does not exist for project '${projectId}'.`,
        404
      );
    }

    if (space.ownerUserId !== user.id) {
      throw new AuthorizationError(
        `Space boundary violation: User '${user.id}' does not own parent Space '${space.id}'.`,
        403
      );
    }

    // Context established and validated securely
    req.space = space;
    req.project = project;
    next();
  } catch (err: any) {
    const status = err instanceof AuthorizationError ? err.statusCode : 500;
    return res.status(status).json({
      error: err.name || 'AUTHORIZATION_DENIED',
      message: err.message || 'Access denied due to project isolation boundary violation.',
    });
  }
}

/**
 * Enforces Space ownership boundary:
 * Authenticated User -> Space Ownership
 */
export function verifySpaceIsolation(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const user = req.user;
    if (!user) {
      throw new AuthorizationError('Authentication required.', 401);
    }

    const spaceId =
      (req.params.spaceId as string) ||
      (req.query.spaceId as string) ||
      (req.body?.spaceId as string);

    if (!spaceId) {
      throw new AuthorizationError('Missing mandatory spaceId parameter.', 400);
    }

    const space = db.spaces.get(spaceId);
    if (!space) {
      throw new AuthorizationError(`Space '${spaceId}' not found.`, 404);
    }

    if (space.ownerUserId !== user.id) {
      throw new AuthorizationError(
        `Space isolation violation: User '${user.id}' is not the owner of Space '${spaceId}'.`,
        403
      );
    }

    req.space = space;
    next();
  } catch (err: any) {
    const status = err instanceof AuthorizationError ? err.statusCode : 500;
    return res.status(status).json({
      error: err.name || 'AUTHORIZATION_DENIED',
      message: err.message,
    });
  }
}

/**
 * Validates document resource ownership:
 * User -> Space -> Project -> Document
 */
export function verifyDocumentOwnership(userId: string, documentId: string): boolean {
  const doc = db.documents.get(documentId);
  if (!doc) return false;
  if (doc.ownerUserId !== userId) return false;

  const project = db.projects.get(doc.projectId);
  if (!project || project.ownerUserId !== userId) return false;

  const space = db.spaces.get(doc.spaceId);
  if (!space || space.ownerUserId !== userId) return false;

  return true;
}
