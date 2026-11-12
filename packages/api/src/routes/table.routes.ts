import { Router } from 'express'
import { TableController } from '@controllers/table.controller.js'
import { dbConfig } from '@config/database.js'
import { SqliteTableRepository } from '@repositories/table.repository.js'
import { SqliteRestaurantRepository } from '@repositories/restaurant.repository.js'
import { TableService } from '@services/table.service.js'
import { authenticate, authorize, authorizeRestaurant } from '@shared/infrastructure/http/middlewares.js'

const tableRepository = new SqliteTableRepository(dbConfig)
const restaurantRepository = new SqliteRestaurantRepository(dbConfig)
const tableService = new TableService(tableRepository, restaurantRepository)
const tableController = new TableController(tableService)

const readers = authorize(['admin', 'manager', 'camarero', 'cocinero'])
const statusEditors = authorize(['admin', 'manager', 'camarero'])
const adminOnly = authorize(['admin'])

const router = Router({ mergeParams: true })

router.get('/', authenticate, readers, authorizeRestaurant, tableController.getAll)
router.post('/', authenticate, adminOnly, tableController.create)
router.get('/:tableId', authenticate, readers, authorizeRestaurant, tableController.getById)
router.put('/:tableId', authenticate, adminOnly, tableController.update)
router.patch('/:tableId/status', authenticate, statusEditors, authorizeRestaurant, tableController.updateStatus)
router.delete('/:tableId', authenticate, adminOnly, tableController.delete)

export default router
