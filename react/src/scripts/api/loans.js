'use strict';

import {ResultProcessors, Request} from './kiva'

//switch to different pattern.

class LoanAPI {
    static refreshLoan(loan){
        return this.getLoan(loan.id).then(k_loan => $.extend(loan, k_loan) )
    }

    static getLoan(id){
        return Request.sem_get(`loans/${id}.json`, {}, 'loans', true).then(ResultProcessors.processLoan)
    }
}

export default LoanAPI