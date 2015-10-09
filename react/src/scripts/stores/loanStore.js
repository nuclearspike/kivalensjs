'use strict';

import Reflux from 'reflux'
import LoanAPI from '../api/loans'
import a from '../actions'
import criteriaStore from './criteriaStore'

//array of api loan objects that are sorted in the order they were returned.
var loans_from_kiva = [];
var indexed_loans = {}
var basket_loans = [];

var loanStore = Reflux.createStore({
    listenables: [a.loans],
    init:function(){
        console.log("loanStore:init")
        a.loans.load(); //start loading loans from Kiva.
        if (typeof localStorage === 'object')
            basket_loans = JSON.parse(localStorage.getItem('basket'))
        if (!Array.isArray(basket_loans)) basket_loans = []
        a.loans.basket.changed();
    },
    _basketSave: function(){
        if (typeof localStorage === 'object')
            localStorage.setItem('basket', JSON.stringify(basket_loans))
        a.loans.basket.changed()
    },
    syncInBasket: function(id){
        return basket_loans.contains(id)
    },
    syncBasketCount: function(){
        return basket_loans.length
    },
    syncGetBasket: function(){
        return basket_loans.map(id => indexed_loans[id])
    },
    onBasketClear: function(){
        basket_loans = []
        this._basketSave()
    },
    onBasketBatchAdd: function(loan_ids){
        basket_loans = basket_loans.concat(loan_ids).distinct()
        this._basketSave()

    },
    onBasketAdd: function(loan_id){
        if (!basket_loans.contains(loan_id)) {
            basket_loans.push(loan_id)
            this._basketSave()
        }
    },
    onBasketRemove: function(loan_id){
        basket_loans.remove(loan_id)
        this._basketSave()
    },
    onLoad: function(options) {
        console.log("loanStore:onLoad")

        //we already have the loans, just spit them back.
        if (loans_from_kiva.length > 0){
            a.loans.load.completed(loans_from_kiva);
            return
        }

        options = $.extend({}, options)
        //, {region: 'af'}

        LoanAPI.getAllLoans(options)
            .done(loans => {
                //a.loans.load.progressed({label: 'Indexing loans...'})
                loans.forEach(loan => indexed_loans[loan.id] = loan)
                loans_from_kiva = loans;
                a.loans.load.completed(loans)
            })
            .progress(progress => {
                console.log("progress:", progress)
                a.loans.load.progressed(progress)
            })
            .fail(() => {
                a.loans.load.failed()
            })
    },

    onDetail: function(id){
        //this is weird. treating a sync function as sync
        var loan = this.syncGet(id)
        a.loans.detail.completed(loan) //return immediately with the one we got at start up.
        LoanAPI.refreshLoan(loan).done(l => a.loans.detail.completed(l)) //kick off a process to get an updated version
    },

    onFilter: function(c){ //why would I ever call this async??
        a.loans.filter.completed(this.syncFilterLoans(c))
    },

    syncHasLoadedLoans: function(){
        return loans_from_kiva.length > 0
    },

    mergeLoan: function(d_loan){ //used?
        var loan = loans_from_kiva.first(loan => loan.id == d_loan.id )
        if (loan) $.extend(loan, d_loan)
    },

    syncGet: function(id){
        return loans_from_kiva.first(loan => loan.id == id)
    },

    syncFilterLoans: function(c){
        if (!c){ c = criteriaStore.syncGetLast() }
        //break this into another unit --store? LoansAPI.filter(loans, criteria)

        //for each search term for sector, break it into an array, ignoring spaces and commas
        //for each loan, test the sector against each search term.

        var makeSearchTester = function(text){
            var result =  (text && text.length > 0) ? text.match(/(\w+)/g).distinct().select(word => word.toUpperCase() ) : []
            console.log('makeSearchTester',result)
            return {
                startsWith: function(loan_attr){
                    return result.length == 0 ? true : result.any( search_text => sStartsWith(loan_attr, search_text)  )
                },
                contains: function(loan_attr){
                    return result.length == 0 ? true : result.any( search_text => loan_attr.toUpperCase().indexOf(search_text) > -1  )
                },
                terms_arr: result}
        }

        var sStartsWith = function(loan_attr, test){ return (test) ? loan_attr.toUpperCase().startsWith(test) : true }

        var stSector = makeSearchTester(c.sector)
        var stActivity = makeSearchTester(c.activity)
        var stName = makeSearchTester(c.name)
        var stCountry = makeSearchTester(c.country)
        var stUse = makeSearchTester(c.use)

        console.log('criteria', c)

        return loans_from_kiva.where(loan => {
            return stSector.startsWith(loan.sector) &&
                stActivity.startsWith(loan.activity) &&
                stName.contains(loan.name) &&
                stCountry.startsWith(loan.location.country) &&
                stUse.terms_arr.all(search_term => loan.kl_use_or_descr_arr.any(w => w.startsWith(search_term) ) )
        })

    }
});

window.perf = function(func){
    var t0 = performance.now();
    func();
    var t1 = performance.now();
    console.log("Call to doSomething took " + (t1 - t0) + " milliseconds.")
}

export default loanStore