import Admin from './models/Admin';

export const seedAdmin = async () => {
  try {
    const adminCount = await Admin.countDocuments();
    if (adminCount === 0) {
      await Admin.create({
        username: 'admin',
        passwordHash: 'admin' // In a real app this should be hashed, keeping simple as requested
      });
      console.log('Admin seeded: admin / admin');
    }
  } catch (error) {
    console.error('Seeding error:', error);
  }
};
