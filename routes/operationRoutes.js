const express = require('express');
const OperationController = require('../controllers/OperationController');
const ProfitabilityController = require('../controllers/ProfitabilityController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authMiddleware);

const pricingOnly = (req, res, next) => {
  if (!['pricing', 'admin'].includes(req.user?.role)) {
    return res.status(403).json({ error: 'Acceso permitido solo para Pricing' });
  }
  return next();
};

router.get('/profitability/dashboard', pricingOnly, ProfitabilityController.dashboard);
router.put('/costs/:costId', pricingOnly, ProfitabilityController.updateCost);
router.delete('/costs/:costId', pricingOnly, ProfitabilityController.cancelCost);
router.patch('/commissions/:commissionId/status', pricingOnly, ProfitabilityController.updateCommissionStatus);
router.get('/', OperationController.getAll);
router.get('/:id', OperationController.getById);
router.post('/', OperationController.create);
router.post('/from-quotation/:quotationId', OperationController.createFromQuotation);
router.patch('/:id/assign', OperationController.assign);
router.patch('/:id/dates', OperationController.updateDates);
router.put('/:id/booking', OperationController.saveBooking);
router.post('/:id/bookings', OperationController.saveBooking);
router.put('/:id/bookings/:bookingId', OperationController.saveBooking);
router.post('/:id/bookings/:bookingId/hbls', OperationController.saveBookingHbl);
router.put('/:id/bookings/:bookingId/hbls/:hblId', OperationController.saveBookingHbl);
router.post('/:id/tracking', OperationController.addTracking);
router.post('/:id/documents', OperationController.addDocument);
router.patch('/documents/:documentId/inactive', OperationController.deactivateDocument);
router.put('/:id/customs', OperationController.saveCustoms);
router.put('/:id/local-transport', OperationController.saveLocalTransport);
router.put('/:id/billing', OperationController.saveBilling);
router.patch('/:id/close', pricingOnly, OperationController.close);
router.post('/:id/finance-items', OperationController.addFinanceItem);
router.post('/:id/costs', pricingOnly, ProfitabilityController.createCost);
router.get('/:id/costs', pricingOnly, ProfitabilityController.getCosts);
router.get('/:id/profitability', pricingOnly, ProfitabilityController.getSummary);
router.get('/:id/commissions', pricingOnly, ProfitabilityController.getCommissions);

module.exports = router;

