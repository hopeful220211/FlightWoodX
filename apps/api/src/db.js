const mongoose = require('mongoose')

async function connectDatabase(config) {
  if (!config.mongoUri) {
    throw new Error('MONGODB_URI is required to start the API server')
  }
  await mongoose.connect(config.mongoUri, {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  })
  console.log('Connected to MongoDB')

  mongoose.connection.on('error', (error) => {
    console.error('MongoDB runtime error:', error.message)
  })
  mongoose.connection.on('disconnected', () => {
    console.warn('MongoDB disconnected — mongoose will attempt to reconnect')
  })
}

async function disconnectDatabase() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close(false)
  }
}

module.exports = { connectDatabase, disconnectDatabase }
