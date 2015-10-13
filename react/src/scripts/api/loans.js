'use strict';

import {ResultProcessors, Request} from './kiva'


class LoanAPI {
    static refreshLoan(loan){
        var $def = $.Deferred()
        this.getLoan(loan.id).done(k_loan => $def.resolve($.extend(loan, k_loan)) )
        return $def
    }

    static getLoan(id){
        return Request.sem_get(`loans/${id}.json`, {}, 'loans', true).then(ResultProcessors.processLoan)
    }
}

export default LoanAPI