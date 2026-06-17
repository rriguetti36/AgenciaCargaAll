const express = require('express');
const QuotationController = require('../controllers/QuotationController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/', QuotationController.getAll);
router.get('/:id', QuotationController.getById);
router.post('/', QuotationController.create);
router.put('/:id', QuotationController.update);
router.patch('/:id/status', QuotationController.updateStatus);
router.post('/:id/convert', QuotationController.convertToOperation);

module.exports = router;
