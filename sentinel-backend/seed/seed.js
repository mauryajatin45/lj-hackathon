const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { MONGODB_URI } = require('../src/config/env');
const User = require('../src/models/User');
const Submission = require('../src/models/Submission');
const Report = require('../src/models/Report');

const seedData = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Submission.deleteMany({});
    await Report.deleteMany({});

    // Create demo user
    const demoUser = new User({
      email: 'demo@sentinel.com',
      password: 'password123'
    });
    await demoUser.save();

    console.log('Created demo user:', demoUser.email);

    // Create sample submissions and reports
    const sampleSubmissions = [
      {
        userId: demoUser._id,
        channel: 'sms',
        contentText: 'Your account has been compromised. Click here to secure: bit.ly/secure-now',
        status: 'REPORT_READY'
      },
      {
        userId: demoUser._id,
        channel: 'email',
        contentText: 'URGENT: Your bank account needs verification. Reply with your credentials immediately.',
        status: 'REPORT_READY'
      },
      {
        userId: demoUser._id,
        channel: 'chat',
        contentText: 'Hey, I need you to send me $500 for an emergency. I\'ll pay you back tomorrow.',
        status: 'ANALYSIS_STARTED'
      },
      {
        userId: demoUser._id,
        channel: 'image',
        attachments: [{
          type: 'image',
          bucket: 'sentinel-assets',
          key: 'demo/2024/01/15/sample-image.jpg',
          mimeType: 'image/jpeg',
          size: 1024000
        }],
        status: 'UPLOADED'
      }
    ];

    const savedSubmissions = await Submission.insertMany(sampleSubmissions);
    console.log(`Created ${savedSubmissions.length} sample submissions`);

    // Create sample reports
    const sampleReports = [
      {
        submissionId: savedSubmissions[0]._id,
        suspicious: true,
        riskScore: 0.92,
        reasons: ['Suspicious URL (bit.ly)', 'Urgency language', 'Account compromise claim'],
        raw: { confidence: 0.95, detectedPatterns: ['phishing', 'urgency'] }
      },
      {
        submissionId: savedSubmissions[1]._id,
        suspicious: true,
        riskScore: 0.87,
        reasons: ['Credentials request', 'Urgency language', 'Banking context'],
        raw: { confidence: 0.88, detectedPatterns: ['credential_harvesting'] }
      }
    ];

    const savedReports = await Report.insertMany(sampleReports);
    console.log(`Created ${savedReports.length} sample reports`);

    console.log('Seed data created successfully!');
    process.exit(0);

  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
};

seedData();