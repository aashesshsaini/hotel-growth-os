import { connectDatabase, disconnectDatabase } from '../config/database';
import { config } from '../config';
import { User, Hotel } from '../models';
import { hashPassword } from '../utils/password';
import { logger } from '../utils/logger';

const seed = async (): Promise<void> => {
  await connectDatabase();

  const hotel = await Hotel.findOneAndUpdate(
    { slug: 'demo-hotel' },
    {
      name: 'Demo Hotel',
      slug: 'demo-hotel',
      email: 'demo@hotelgrowthos.com',
      phone: '9876543210',
      isActive: true,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const password = await hashPassword(config.seed.superAdminPassword);
  await User.findOneAndUpdate(
    { email: config.seed.superAdminEmail },
    {
      name: config.seed.superAdminName,
      email: config.seed.superAdminEmail,
      password,
      role: 'super_admin',
      hotelId: hotel._id,
      isActive: true,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  logger.info('Seed completed', { email: config.seed.superAdminEmail });
  await disconnectDatabase();
};

seed().catch(async (error) => {
  logger.error('Seed failed', error);
  await disconnectDatabase();
  process.exit(1);
});
