import { Router } from 'express';
import { authMiddleware } from '../../middlewares/authMiddleware';
import { hotelAccessMiddleware } from '../../middlewares/hotelAccessMiddleware';
import { validate } from '../../validations/validate';
import { createSchema, idParamSchema, listQuerySchema, updateSchema } from './enquiries.validation';
import * as controller from './enquiries.controller';

const router = Router();
router.use(authMiddleware, hotelAccessMiddleware);
router.get('/', validate(listQuerySchema, 'query'), controller.list);
router.get('/:id', validate(idParamSchema, 'params'), controller.getById);
router.post('/', validate(createSchema), controller.create);
router.patch('/:id', validate(idParamSchema, 'params'), validate(updateSchema), controller.update);
router.put('/:id', validate(idParamSchema, 'params'), validate(updateSchema), controller.update);
router.delete('/:id', validate(idParamSchema, 'params'), controller.remove);
export default router;
