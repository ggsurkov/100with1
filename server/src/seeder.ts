import bcrypt from 'bcrypt';
import User, { DEFAULT_PERMISSIONS_BY_ROLE } from './models/User';

export const seedAdmin = async () => {
  try {
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      const passwordHash = await bcrypt.hash('admin', 10);
      await User.create({
        email: 'admin@admin.com',
        passwordHash,
        role: 'admin',
        permissions: DEFAULT_PERMISSIONS_BY_ROLE.admin,
      });
      console.log('Super admin seeded: admin@admin.com / admin');
    }
  } catch (error) {
    console.error('Seeding error:', error);
  }
};
