const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});

async function connectDB() {
  try {
    await prisma.$connect();
    console.log('✅ Database connected successfully');
    await bootstrapAdminUser();
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    throw error;
  }
}

async function bootstrapAdminUser() {
  try {
    const adminExists = await prisma.user.findUnique({
      where: { username: 'admin' }
    });

    if (!adminExists) {
      const hashedPassword = await bcrypt.hash('admin123', 12);
      await prisma.user.create({
        data: {
          username: 'admin',
          password: hashedPassword,
          fullName: 'System Administrator',
          email: 'admin@securedoc.local',
          role: 'ADMIN'
        }
      });
      console.log('✅ Default admin user created (username: admin, password: admin123)');
    } else {
      console.log('ℹ️  Admin user already exists');
    }
  } catch (error) {
    console.error('⚠️  Could not bootstrap admin user:', error.message);
  }
}

module.exports = { prisma, connectDB };
