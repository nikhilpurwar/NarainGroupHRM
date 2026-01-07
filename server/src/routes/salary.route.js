import express from 'express'
import { authenticate } from '../middleware/auth.middleware.js'
import { checkPermission } from '../middleware/permission.middleware.js'

const router = express.Router()

import dailyController from '../controllers/salary.controller/dailySalary.controller.js'
import monthlyController from '../controllers/salary.controller/monthlySalary.controller.js'
import salaryRuleCtrl from '../controllers/setting.controller/salaryRule.controller.js'

// reports
router.get('/daily', authenticate, checkPermission, dailyController.dailySalaryReport)
router.get('/monthly', authenticate, checkPermission, monthlyController.monthlySalaryReport)
router.get('/monthly/exists', authenticate, monthlyController.checkMonthlySalaryExists)
router.post('/monthly/calculate', authenticate, checkPermission, monthlyController.calculateAndStoreMonthlySalary)
router.patch('/monthly/:empId/recalculate', authenticate, checkPermission, monthlyController.recalculateSalaryForEmployee)
router.patch('/monthly/:empId/pay', authenticate, checkPermission, monthlyController.markSalaryAsPaid)

// salary rules CRUD
router.get('/rules', authenticate, checkPermission, salaryRuleCtrl.listSalaryRules)
router.get('/rules/:id', authenticate, checkPermission, salaryRuleCtrl.getSalaryRule)
router.post('/rules', authenticate, checkPermission, salaryRuleCtrl.createSalaryRule)
router.put('/rules/:id', authenticate, checkPermission, salaryRuleCtrl.updateSalaryRule)
router.delete('/rules/:id', authenticate, checkPermission, salaryRuleCtrl.deleteSalaryRule)

export default router

