const express = require('express');
const SaleController = require('../controllers/SaleController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/', SaleController.getAll);
router.get('/:id', SaleController.getById);
router.post('/operations/:operationId/issue', SaleController.issue);

module.exports = router;
