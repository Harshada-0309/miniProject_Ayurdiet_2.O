const express = require('express');
const cors = require('cors');
const healthRoutes = require('./routes/healthRoutes');
const patientRoutes = require('./routes/patientRoutes');
const assessmentRoutes = require('./routes/assessmentRoutes');
const labDataRoutes = require('./routes/labDataRoutes');
const nutritionRoutes = require('./routes/nutritionRoutes');
const ragRoutes = require('./routes/ragRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check Routes
app.use('/', healthRoutes);

// Phase 2: Dietitian Patient Assessment REST APIs
app.use('/api/patients', patientRoutes);
app.use('/api/assessments', assessmentRoutes);
app.use('/api/lab-data', labDataRoutes);

// Phase 3: Deterministic Nutrition Calculation Engine APIs
app.use('/api/nutrition', nutritionRoutes);

// Phase 4: Hybrid RAG Knowledge Retrieval Layer APIs
app.use('/api/rag', ragRoutes);

// Phase 5: Food & Meal Planning Engine APIs
const mealPlanRoutes = require('./routes/mealPlanRoutes');
app.use('/api/meal-plan', mealPlanRoutes);

// Phase 6: Gemini-Powered 7-Day Diet Plan APIs
const dietPlanRoutes = require('./routes/dietPlanRoutes');
app.use('/api/diet-plan', dietPlanRoutes);



// 404 Route Handler
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: `Cannot ${req.method} ${req.originalUrl}`,
  });
});

// Global Error Handler
app.use(errorHandler);

module.exports = app;
