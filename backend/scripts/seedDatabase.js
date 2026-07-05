require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const seedUsers = [
  {
    username: 'test_patient',
    email: 'patient@calmify.com',
    password: 'password123',
    role: 'patient',
    profile: {
      firstName: 'Jane',
      lastName: 'Doe',
      age: 24,
      bio: 'Just seeking a safe space to discuss mindfulness and anxiety management.'
    }
  },
  {
    username: 'test_peer',
    email: 'peer@calmify.com',
    password: 'password123',
    role: 'peer',
    profile: {
      firstName: 'John',
      lastName: 'Smith',
      age: 28,
      bio: 'Trained volunteer peer supporter. Happy to listen and chat.'
    }
  },
  {
    username: 'test_counselor',
    email: 'counselor@calmify.com',
    password: 'password123',
    role: 'counselor',
    profile: {
      firstName: 'Sarah',
      lastName: 'Jenkins',
      age: 35,
      bio: 'Licensed mental health professional specializing in cognitive behavioral therapy.'
    }
  },
  {
    username: 'test_admin',
    email: 'admin@calmify.com',
    password: 'password123',
    role: 'admin',
    profile: {
      firstName: 'Alex',
      lastName: 'Admin',
      age: 30,
      bio: 'System administrator for the Calmify platform.'
    }
  }
];

async function seed() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI is not set in backend .env file');
    }

    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB.');

    console.log('Clearing existing users...');
    await User.deleteMany({});
    console.log('Users collection cleared.');

    console.log('Seeding new test users...');
    for (const u of seedUsers) {
      const user = new User(u);
      await user.save();
      console.log(`Created ${u.role} user: ${u.username} (${u.email})`);
    }

    console.log('Seeding completed successfully!');
  } catch (error) {
    console.error('Seeding failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
}

seed();
