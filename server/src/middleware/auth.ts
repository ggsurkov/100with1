import jwt from 'jsonwebtoken';
import { Permission, UserRole } from '../models/User';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

export const authMiddleware = (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

export const requireRole = (roles: UserRole[]) => (req: any, res: any, next: any) => {
  if (!roles.includes(req.user?.role)) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  next();
};

export const requirePermission = (permission: Permission) => (req: any, res: any, next: any) => {
  if (req.user?.role === 'admin' || req.user?.role === 'master' || req.user?.permissions?.includes(permission)) {
    return next();
  }
  res.status(403).json({ message: 'Forbidden' });
};

export { JWT_SECRET };
