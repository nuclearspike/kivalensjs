'use strict';

import kiva from './kiva'

class LoanAPI extends kiva {
    static getLoan(id){
        return this.get(`loans/${id}.json`)
    }

    static getLoanBatch(id_arr){///needs to handle more loans passed in than allowed to break it into multiple reqs.
        //this can call get_paged... or does Kiva API not allow more than n ids listed?
        return this.get(`loans/${id_arr.join(',')}.json`)
    }

    static getLoans(query){
        return this.get('loans/search.json', query)
    }

    static getAllLoans(options){
        options = options || {}
        options.status = options.status || 'fundraising'
        return this.get_paged('loans/search.json', 'loans', options)
    }
}

export default LoanAPI