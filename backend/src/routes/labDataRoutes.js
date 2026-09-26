const express = require('express');
const {
  updateLabData,
  deleteLabData,
} = require('../controllers/labDataController');
const { validateLabDataInput } = require('../middleware/validation');

const router = express.Router();

router.put('/:id', validateLabDataInput, updateLabData);
router.delete('/:id', deleteLabData);

module.exports = router;
