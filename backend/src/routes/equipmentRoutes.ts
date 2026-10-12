import { Router } from 'express';
import { EquipmentController } from '../controllers/equipmentController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.get('/', EquipmentController.getAllEquipment);
router.get('/:id', EquipmentController.getEquipmentById);
router.post('/', authenticate, EquipmentController.createEquipment);

export default router;
