const express = require('express')
const { authenticate } = require('../middleware/auth')
const customPartController = require('../controllers/customPartController')

// 自制零件工坊（DIY Part Studio）路由。全部需 JWT；ownerId 隔离在 controller 内强制。
const router = express.Router()
router.use(authenticate)

router.get('/', customPartController.list)
router.get('/:id', customPartController.get)
router.post('/', customPartController.create)
router.put('/:id', customPartController.update)
router.delete('/:id', customPartController.remove)

module.exports = router
