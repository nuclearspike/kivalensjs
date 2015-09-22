'use strict';

class LoanAPI {
    static get(url){
        return $.getJSON(`http://api.kivaws.org/v1/${url}`)
            .done((result) => {
                console.log(result);
            })
            .fail((xhr, status, err) => {
                console.error(status, err.toString());
            })
    }

    static getLoan(id){
        return this.get(`loans/${id}.json`)
    }

    static getLoanBatch(id_arr){
        return this.get(`loans/${id_arr.join(',')}.json`)
    }

    static getLoans(options){
        return this.get(`loans/search.json`)
    }
}

export {LoanAPI}