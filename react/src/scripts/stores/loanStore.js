'use strict';
import Reflux from 'reflux'
import {LoanAPI} from '../api/loans'
import {loanActions} from '../actions'

var loanStore = Reflux.createStore({
    listenables: [loanActions],
    init:function(){
        console.log("loanStore:init")
    },
    onLoad:(options)=>{
        console.log("LoanAPI:onLoad")
        LoanAPI.getLoans(options)
            .done((result)=>{
                loanActions.load.completed(result)
            })
            .fail((result)=>{
                loanActions.load.failed(result)
            })
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