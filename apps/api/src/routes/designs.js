const express = require('express')
const { authenticate } = require('../middleware/auth')
const { exportCad } = require('../controllers/designExportController')

const router = express.Router()

router.use(authenticate)
router.post('/:designId/export-cad', exportCad)

module.exports = router
