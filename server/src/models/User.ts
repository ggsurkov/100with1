import mongoose, { Schema, Document } from 'mongoose';

export type UserRole = 'admin' | 'editor' | 'member';
export type Permission = 'CREATE' | 'EDIT' | 'VIEW';

export const DEFAULT_PERMISSIONS_BY_ROLE: Record<UserRole, Permission[]> = {
  admin: ['CREATE', 'EDIT', 'VIEW'],
  editor: ['EDIT', 'VIEW'],
  member: ['VIEW'],
};

export interface IUser extends Document {
  email: string;
  passwordHash: string;
  role: UserRole;
  permissions: Permission[];
  createdAt: Date;
}

const UserSchema: Schema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['admin', 'editor', 'member'], default: 'member' },
    permissions: { type: [String], enum: ['CREATE', 'EDIT', 'VIEW'] },
  },
  { timestamps: true }
);

UserSchema.pre('validate', function (next) {
  const user = this as unknown as IUser;
  if (!user.permissions || user.permissions.length === 0) {
    user.permissions = DEFAULT_PERMISSIONS_BY_ROLE[user.role] || DEFAULT_PERMISSIONS_BY_ROLE.member;
  }
  next();
});

export default mongoose.model<IUser>('User', UserSchema);
