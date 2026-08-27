const express = require('express');
const MasterDataController = require('../controllers/MasterDataController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/company-config', MasterDataController.getCompanyConfig);
router.put('/company-config', MasterDataController.updateCompanyConfig);
router.post('/company-config/logo', MasterDataController.uploadCompanyLogo);
router.get('/:type', MasterDataController.list);
router.post('/:type', MasterDataController.create);

module.exports = router;
