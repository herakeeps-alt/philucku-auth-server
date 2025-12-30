const mongoose = require('mongoose');
require('dotenv').config();
const Admin = require('./models/Admin');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI) // Changed from MONGO_URI to MONGODB_URI
  .then(() => console.log('MongoDB Connected'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

async function createFirstAdmin() {
  try {
    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ username: 'admin' });
    
    if (existingAdmin) {
      console.log('Admin user already exists!');
      console.log('Username:', existingAdmin.username);
      console.log('Email:', existingAdmin.email);
      process.exit(0);
    }

    // Create first admin
    const admin = await Admin.create({
      username: 'admin',
      email: 'admin@philucky.com',
      password: 'Admin@123', // Change this password after first login!
      role: 'super_admin',
    });

    console.log('✅ Admin user created successfully!');
    console.log('');
    console.log('=================================');
    console.log('Admin Credentials:');
    console.log('=================================');
    console.log('Username:', admin.username);
    console.log('Email:', admin.email);
    console.log('Password: Admin@123');
    console.log('Role:', admin.role);
    console.log('=================================');
    console.log('');
    console.log('⚠️  IMPORTANT: Please change the default password after first login!');
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('Error creating admin:', error);
    process.exit(1);
  }
}

createFirstAdmin();