import bcrypt from 'bcrypt';
import User, { DEFAULT_PERMISSIONS_BY_ROLE } from './models/User';
import Team, { generateTeamPin } from './models/Team';
import Game, { RoundTypes } from './models/Game';

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

// Backfills round types for rounds created before `type` became an enum — they
// hold the old numeric `1`, which fails enum validation on the next save.
export const seedRoundTypes = async () => {
  try {
    const validTypes = Object.values(RoundTypes);
    const result = await Game.updateMany(
      { 'rounds.type': { $nin: validTypes } },
      { $set: { 'rounds.$[round].type': RoundTypes.AnswersHide } },
      { arrayFilters: [{ 'round.type': { $nin: validTypes } }] }
    );
    if (result.modifiedCount > 0) {
      console.log(`Backfilled round types in ${result.modifiedCount} game(s)`);
    }
  } catch (error) {
    console.error('Round type seeding error:', error);
  }
};
