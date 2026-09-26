const app = require('./app');
const config = require('./config/env');
const { closePool } = require('./config/database');

const { seedData } = require('./db/seed');
const patientRepository = require('./repositories/patientRepository');

const server = app.listen(config.port, async () => {
  console.log(`[AyurDiet Backend] Running in ${config.env} mode on port ${config.port}`);
  console.log(`[AyurDiet Backend] Health endpoint: http://localhost:${config.port}/health`);
  console.log(`[AyurDiet Backend] Patients API: http://localhost:${config.port}/api/patients`);

  if (config.env === 'development') {
    try {
      const existing = await patientRepository.findAll({ limit: 1 });
      if (existing.length === 0) {
        await seedData();
      }
    } catch (e) {
      console.warn('[AyurDiet Backend] Seed initialization note:', e.message);
    }
  }
});

// Graceful shutdown
const shutdown = async (signal) => {
  console.log(`\n[AyurDiet Backend] Received ${signal}. Shutting down gracefully...`);
  server.close(async () => {
    try {
      await closePool();
      console.log('[AyurDiet Backend] Database pool closed.');
      process.exit(0);
    } catch (err) {
      console.error('[AyurDiet Backend] Error during shutdown:', err);
      process.exit(1);
    }
  });
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

module.exports = server;
