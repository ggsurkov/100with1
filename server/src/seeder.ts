import bcrypt from 'bcrypt';
import User, { DEFAULT_PERMISSIONS_BY_ROLE } from './models/User';
import Team, { generateTeamPin } from './models/Team';

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

// Backfills PINs for teams created before the captain PIN feature existed.
export const seedTeamPins = async () => {
  try {
    const teamsWithoutPin = await Team.find({ pin: { $exists: false } });
    for (const team of teamsWithoutPin) {
      team.pin = generateTeamPin();
      await team.save();
    }
    if (teamsWithoutPin.length > 0) {
      console.log(`Assigned PIN codes to ${teamsWithoutPin.length} existing team(s)`);
    }
  } catch (error) {
    console.error('Team PIN seeding error:', error);
  }
};
