'use strict';

import kiva from './kiva'

class LoanAPI extends kiva {
    static getLoan(id){
        return this.sem_get(`loans/${id}.json`, 'loans', true)
    }

    static getLoanBatch(id_arr, with_progress){
        //kiva does not allow more than 100 loans in a batch. break the list into chunks of up to 100 and process them.
        // this will send progress messages with individual loan objects or just wait for the .done()
        var chunks = id_arr.chunk(100)
        var $def = $.Deferred()
        var r_loans = []
        //var sem = require('semaphore')(4);

        for (var i = 0; i < chunks.length; i++){
            $def.notify({percentage: 0, label: 'Preparing to download...'})
            this.sem_get(`loans/${chunks[i].join(',')}.json`, {}, 'loans', false)
                .done(loans => {
                    if (with_progress)
                        loans.forEach(loan => { $def.notify({loan: loan}) })
                    r_loans = r_loans.concat(loans)
                    $def.notify({percentage: r_loans.length * 100 / id_arr.length, label: `${r_loans.length}/${id_arr.length} downloaded`})
                    if (r_loans.length == id_arr.length) {
                        $def.resolve(r_loans)
                        $def.notify({done: true})
                    }
                })
        }
        return $def
    }

    //static getLoans(query){
    //    return this.sem_get('loans/search.json', query)
    //}

    static getAllLoans(options){
        return this.getPaged('loans/search.json', 'loans', $.extend({}, options, {status: 'fundraising'}))
    }
}

export default LoanAPI