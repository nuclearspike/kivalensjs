'use strict';
import Reflux from 'reflux'
import {LoanAPI} from '../api/loans'
import {loanActions} from '../actions'

var all_loans = [];
var loanStore = Reflux.createStore({
    listenables: [loanActions],
    init:function(){
        console.log("loanStore:init")
        loanActions.load();
    },
    onLoad:(options)=>{
        console.log("LoanAPI:onLoad")
        //var local_this = this;

        /*if (local_this.loans.length > 0){
            loanActions.load.completed(local_this.loans)
            return
        }*/

        if (all_loans.length > 0){
            loanActions.load.completed(all_loans);
            return;
        }

        if (!options)
            options = {}
        //options.region = 'af'
        LoanAPI.getAllLoans(options)
            .done(loans => {
                //local_this.loans = loans;
                all_loans = loans;
                loanActions.load.completed(loans)
            })
            .progress(progress => {
                console.log("progress:", progress)
                loanActions.load.progressed(progress)
            })
            .fail((result) =>{
                loanActions.load.failed()
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