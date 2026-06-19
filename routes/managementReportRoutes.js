const express = require('express');
const ManagementReportController = require('../controllers/ManagementReportController');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

const router = express.Router();

router.use(authMiddleware);
router.use(adminMiddleware);

router.get('/overview', ManagementReportController.overview);

module.exports = router;
