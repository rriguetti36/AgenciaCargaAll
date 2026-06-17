const express = require('express');
const CustomerController = require('../controllers/CustomerController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/', CustomerController.getAll);
router.get('/:id', CustomerController.getById);
router.post('/', CustomerController.create);
router.put('/:id', CustomerController.update);
router.post('/:id/contacts', CustomerController.createContact);

module.exports = router;
