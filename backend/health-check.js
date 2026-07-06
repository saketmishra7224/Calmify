#!/usr/bin/env node

/**
 * Calmify Health Check Script
 * Verifies that all components are properly configured and running
 */

const fs = require('fs');
const path = require('path');

console.log('🏥 Calmify Mental Health Platform - Health Check');
console.log('===============================================\n');

let healthStatus = {
    environment: false,
    dependencies: false,
    mongodb: false,
    redis: false,
    secrets: false,
    externalServices: false
};

let warnings = [];
let errors = [];

// Check environment file
console.log('🔍 Checking environment configuration...');
if (fs.existsSync('.env')) {
    console.log('✅ .env file exists');
    healthStatus.environment = true;
    
    // Load environment variables
    require('dotenv').config();
    
    // Check critical environment variables
    const criticalVars = [
        'MONGODB_URI',
        'JWT_SECRET',
        'JWT_REFRESH_SECRET',
        'SESSION_SECRET'
    ];
    
    let missingVars = [];
    criticalVars.forEach(varName => {
        if (!process.env[varName] || process.env[varName].includes('change-this') || process.env[varName].includes('your-')) {
            missingVars.push(varName);
        }
    });
    
    if (missingVars.length === 0) {
        console.log('✅ Critical environment variables are configured');
        healthStatus.secrets = true;
    } else {
        console.log('⚠️  Missing or default values for:', missingVars.join(', '));
        warnings.push('Some environment variables need configuration');
    }
} else {
    console.log('❌ .env file not found');
    errors.push('Environment file missing - run setup.sh first');
}

// Check dependencies
console.log('\n📦 Checking dependencies...');
try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    if (fs.existsSync('node_modules')) {
        console.log('✅ Dependencies are installed');
        healthStatus.dependencies = true;
    } else {
        console.log('❌ node_modules not found');
        errors.push('Dependencies not installed - run npm install');
    }
} catch (error) {
    console.log('❌ Cannot read package.json');
    errors.push('Invalid package.json file');
}

// Check MongoDB connection
console.log('\n🗄️  Checking MongoDB connection...');
if (process.env.MONGODB_URI) {
    try {
        const mongoose = require('mongoose');
        
        // Test MongoDB connection
        const connectPromise = mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 5000,
        });
        
        connectPromise.then(() => {
            console.log('✅ MongoDB connection successful');
            healthStatus.mongodb = true;
            mongoose.disconnect();
        }).catch((error) => {
            console.log('❌ MongoDB connection failed:', error.message);
            if (error.message.includes('ECONNREFUSED')) {
                errors.push('MongoDB server is not running');
            } else if (error.message.includes('authentication failed')) {
                errors.push('MongoDB authentication failed - check credentials');
            } else {
                errors.push('MongoDB connection error - check MONGODB_URI');
            }
        });
    } catch (error) {
        console.log('❌ Cannot test MongoDB connection:', error.message);
        errors.push('MongoDB connection module error');
    }
} else {
    console.log('⚠️  MONGODB_URI not configured');
    warnings.push('MongoDB URI needs configuration');
}

// Check Redis connection
console.log('\n🔄 Checking Redis connection...');
if (process.env.REDIS_URL) {
    try {
        const redis = require('redis');
        const client = redis.createClient({ url: process.env.REDIS_URL });
        
        client.on('error', (error) => {
            console.log('❌ Redis connection failed:', error.message);
            errors.push('Redis connection error - check REDIS_URL');
        });
        
        client.connect().then(() => {
            return client.ping();
        }).then((result) => {
            if (result === 'PONG') {
                console.log('✅ Redis connection successful');
                healthStatus.redis = true;
            }
            client.disconnect();
        }).catch((error) => {
            console.log('❌ Redis ping failed:', error.message);
            errors.push('Redis is not responding');
        });
    } catch (error) {
        console.log('⚠️  Redis client not available (installing redis package may be needed)');
        warnings.push('Redis package not installed - some features may not work');
    }
} else {
    console.log('⚠️  REDIS_URL not configured');
    warnings.push('Redis URL needs configuration for session management');
}

// Check external services
console.log('\n🌐 Checking external service configuration...');
const externalServices = {
    'Azure OpenAI API (AI Chatbot)': 'AZURE_OPENAI_API_KEY',
    'OpenAI API (Legacy)': 'OPENAI_API_KEY',
    'Twilio SMS': 'TWILIO_ACCOUNT_SID',
    'AWS SNS': 'AWS_ACCESS_KEY_ID',
    'SMTP Email': 'EMAIL_USER'
};

let configuredServices = 0;
Object.entries(externalServices).forEach(([service, envVar]) => {
    if (process.env[envVar] && !process.env[envVar].includes('your-')) {
        console.log(`✅ ${service} configured`);
        configuredServices++;
    } else {
        console.log(`⚠️  ${service} not configured`);
    }
});

if (configuredServices > 0) {
    healthStatus.externalServices = true;
    console.log(`✅ ${configuredServices} external service(s) configured`);
} else {
    console.log('⚠️  No external services configured (optional for development)');
    warnings.push('External services not configured - some features will be limited');
}

// Display summary
console.log('\n📊 Health Check Summary');
console.log('======================');

const overallHealth = Object.values(healthStatus).filter(Boolean).length;
const totalChecks = Object.keys(healthStatus).length;

console.log(`Overall Health: ${overallHealth}/${totalChecks} components healthy`);
console.log(`Environment: ${healthStatus.environment ? '✅' : '❌'}`);
console.log(`Dependencies: ${healthStatus.dependencies ? '✅' : '❌'}`);
console.log(`MongoDB: ${healthStatus.mongodb ? '✅' : '❌'}`);
console.log(`Redis: ${healthStatus.redis ? '✅' : '⚠️'}`);
console.log(`Secrets: ${healthStatus.secrets ? '✅' : '⚠️'}`);
console.log(`External Services: ${healthStatus.externalServices ? '✅' : '⚠️'}`);

if (errors.length > 0) {
    console.log('\n❌ Critical Issues:');
    errors.forEach(error => console.log(`   • ${error}`));
}

if (warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    warnings.forEach(warning => console.log(`   • ${warning}`));
}

console.log('\n🎯 Recommendations:');
if (!healthStatus.environment || !healthStatus.dependencies) {
    console.log('   • Run ./setup.sh to configure the environment');
}
if (!healthStatus.mongodb) {
    console.log('   • Ensure MongoDB is running or configure MongoDB Atlas');
}
if (!healthStatus.redis) {
    console.log('   • Install and start Redis, or use Redis Cloud');
}
if (!healthStatus.secrets) {
    console.log('   • Update environment variables in .env file');
}
if (warnings.length === 0 && errors.length === 0) {
    console.log('   • Your setup looks good! Run "npm run dev" to start the server');
}

console.log('\n📚 Resources:');
console.log('   • Setup Guide: README.md');
console.log('   • API Documentation: API_DOCUMENTATION.md');
console.log('   • MongoDB Atlas: https://www.mongodb.com/atlas');
console.log('   • Redis Cloud: https://redis.com/redis-enterprise-cloud/');

process.exit(errors.length > 0 ? 1 : 0);