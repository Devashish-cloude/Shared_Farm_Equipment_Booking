import { Router } from 'express';
import { EquipmentController } from '../controllers/equipmentController.js';
import { AvailabilityController } from '../controllers/availabilityController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.get('/', EquipmentController.getAllEquipment);
router.get('/categories', EquipmentController.getCategories);
router.get('/my-listings', authenticate, EquipmentController.getMyListings);
router.get('/:id/availability', AvailabilityController.list);
router.post('/:id/availability', authenticate, AvailabilityController.createAvailability);
router.delete('/:id/availability/:windowId', authenticate, AvailabilityController.deleteAvailability);
router.post('/:id/blocked-periods', authenticate, AvailabilityController.createBlockedPeriod);
router.delete('/:id/blocked-periods/:periodId', authenticate, AvailabilityController.deleteBlockedPeriod);
router.get('/:id', EquipmentController.getEquipmentById);
router.post('/', authenticate, EquipmentController.createEquipment);
router.patch('/:id', authenticate, EquipmentController.updateEquipment);
router.put('/:id', authenticate, EquipmentController.updateEquipment);
router.post('/:id/deactivate', authenticate, EquipmentController.deactivateEquipment);
router.delete('/:id', authenticate, EquipmentController.deactivateEquipment);

export default router;
