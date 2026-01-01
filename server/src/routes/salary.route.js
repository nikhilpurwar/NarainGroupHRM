import express from 'express'
const router = express.Router()

import dailyController from '../controllers/salary.controller/dailySalary.controller.js'
import monthlyController from '../controllers/salary.controller/monthlySalary.controller.js'
import salaryRuleCtrl from '../controllers/setting.controller/salaryRule.controller.js'

// reports
router.get('/daily', dailyController.dailySalaryReport)
router.get('/monthly', monthlyController.monthlySalaryReport)
router.get('/monthly/exists', monthlyController.checkMonthlySalaryExists)
router.post('/monthly/calculate', monthlyController.calculateAndStoreMonthlySalary)
router.patch('/monthly/:empId/recalculate', monthlyController.recalculateSalaryForEmployee)

// salary rules CRUD
router.get('/rules', salaryRuleCtrl.listSalaryRules)
router.get('/rules/:id', salaryRuleCtrl.getSalaryRule)
router.post('/rules', salaryRuleCtrl.createSalaryRule)
router.put('/rules/:id', salaryRuleCtrl.updateSalaryRule)
router.delete('/rules/:id', salaryRuleCtrl.deleteSalaryRule)

export default router

