//this unit being required/imported anywhere will instantiate all stores listed below.
//import s from '../stores
//s.loans

import criteria from './criteriaStore'
import partners from './partnerStore'
import loans from './loanStore'

export default {criteria: criteria, loans: loans, partners: partners}