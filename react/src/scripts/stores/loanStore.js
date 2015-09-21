'use strict';

import {LoanAPI} from '../api/loans'
import {loanActions} from '../actions'

var loanStore = Reflux.createStore({
    listenables: [loanActions],
    init:()=>{
        console.log("loanStore:init")
    },
    onSingle: (id)=>{
        LoanAPI.getLoan(id)
            .done((result)=>{
                this.trigger(result);
            })
    },
    onSearch: (options)=>{
        LoanAPI.getLoans(options)
            .done((result)=>{
                this.trigger(result)
            })
    },
    onBatch: (id_arr)=>{
        LoanAPI.getLoanBatch(id_arr)
            .done((result)=>{
                this.trigger(result);
            })
    }
});

export {loanStore}