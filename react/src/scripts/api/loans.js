'use strict';

import kiva from './kiva'
import {ResultProcessors} from './kiva'

//on it's way out... killing this class slowly
var common_descr =  ["THIS", "ARE", "SHE", "THAT", "HAS", "LOAN", "BE", "OLD", "BEEN", "YEARS", "FROM", "WITH", "INCOME", "WILL", "HAVE"]
var common_use = ["PURCHASE", "FOR", "AND", "BUY", "OTHER", "HER", "BUSINESS", "SELL", "MORE", "HIS", "THE", "PAY"]

class LoanAPI extends kiva {
    static refreshLoan(loan){
        var $def = $.Deferred()
        this.getLoan(loan.id).done(k_loan => $def.resolve($.extend(loan, k_loan)) )
        return $def
    }

    static getLoan(id){
        return this.sem_get(`loans/${id}.json`, {}, 'loans', true).then(LoanAPI.processLoan)
    }

    static getLoanBatch(id_arr, with_progress){
        //kiva does not allow more than 100 loans in a batch. break the list into chunks of up to 100 and process them.
        // this will send progress messages with individual loan objects or just wait for the .done()
        var chunks = id_arr.chunk(100) //breaks into an array of arrays of 100.
        var $def = $.Deferred()
        var r_loans = []

        for (var i = 0; i < chunks.length; i++){
            $def.notify({percentage: 0, label: 'Preparing to download...'})
            this.sem_get(`loans/${chunks[i].join(',')}.json`, {}, 'loans', false)
                .done(loans => {
                    $def.notify({percentage: r_loans.length * 100 / id_arr.length, label: `${r_loans.length}/${id_arr.length} downloaded`})
                    ResultProcessors.processLoans(loans)
                    //if (with_progress) loans.forEach(loan => $def.notify({index: id_arr.indexOf(loan.id), total: id_arr.length, loan: loan}) )
                    r_loans = r_loans.concat(loans)
                    if (r_loans.length >= id_arr.length) {
                        $def.notify({done: true})
                        $def.resolve(r_loans)
                    }
                })
        }
        return $def
    }
}

export default LoanAPI