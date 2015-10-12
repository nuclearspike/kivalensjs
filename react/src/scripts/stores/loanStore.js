'use strict';

import Reflux from 'reflux'
import LoanAPI from '../api/loans'
import {LenderLoans, LoansSearch} from '../api/kiva'
import a from '../actions'
import criteriaStore from './criteriaStore'

//array of api loan objects that are sorted in the order they were returned.
var loans_from_kiva = []
var indexed_loans = {}
var basket_loans = []
var background_resync = 0

var loanStore = Reflux.createStore({
    listenables: [a.loans],
    init:function(){
        console.log("loanStore:init")
        a.loans.load(); //start loading loans from Kiva.
        if (typeof localStorage === 'object') {
            basket_loans = JSON.parse(localStorage.getItem('basket'))
        }
        if (!Array.isArray(basket_loans)) basket_loans = []
        if (basket_loans.length > 0 && !basket_loans[0].loan_id) basket_loans = []
        a.loans.basket.changed();
        //window.basket_loans = basket_loans
        setInterval(this.onBackgroundResync, 3*60*1000)
    },

    //BASKET
    _basketSave: function(){
        if (typeof localStorage === 'object')
            localStorage.setItem('basket', JSON.stringify(basket_loans))
        a.loans.basket.changed()
    },
    syncInBasket: function(loan_id){ return basket_loans.first(bi => bi.loan_id == loan_id) != undefined },
    syncBasketCount: function(){ return basket_loans.length },
    syncGetBasket: function(){
        return basket_loans.map(bi => {return {amount: bi.amount, loan: indexed_loans[bi.loan_id]}}).where(bi => bi.loan != undefined)
    },
    onBasketClear: function(){
        basket_loans = []
        this._basketSave()
    },
    onBasketBatchAdd: function(loan_ids){ //todo: this has not been switched to arrays of basket item objects.
        basket_loans = basket_loans.concat(loan_ids).distinct()
        this._basketSave()
    },
    onBasketAdd: function(loan_id){
        if (!this.syncInBasket(loan_id)) {
            basket_loans.push({amount: 25, loan_id: loan_id})
            this._basketSave()
        }
    },
    onBasketRemove: function(loan_id){
        basket_loans.removeAll(bi => bi.loan_id == loan_id)
        this._basketSave()
    },

    //LENDER LOANS
    onLender: function(lender_id){
        console.log("onLENDER:", lender_id)
        //LoanAPI.getLenderLoans(lender_id)
        var ll = new LenderLoans(lender_id).start().done(ids => {
                ids.removeAll(id => indexed_loans[id] == undefined)
                console.log('LENDER LOAN IDS:', ids)
            })
    },

    //LOANS
    onBackgroundResync: function(){
        background_resync++
        new LoansSearch({},false).start().done(loans => {
            var loans_added = [], loans_updated = 0
            loans.forEach(loan => {
                var existing = indexed_loans[loan.id]
                if (existing) {
                    if (existing.status != loan.status
                        || existing.basket_amount != loan.basket_amount
                        || existing.funded_amount != loan.funded_amount)
                        loans_updated++

                    $.extend(true, existing, loan, {kl_background_resync: background_resync})
                } else {
                    //gather all ids for new loans.
                    loans_added.push(loan.id)
                }
            })
            console.log("############### LOANS UPDATED:", loans_updated)
            if (loans_updated > 0) a.loans.backgroundResync.updated(loans_updated)

            //find the loans that weren't just updated fetch them. Removed? They don't seem to be funded loans... ?
            var mia_loans = loans_from_kiva.where(loan => loan.kl_background_resync != background_resync).select(loan => loan.id)
            LoanAPI.getLoanBatch(mia_loans).done(loans => { //this is ok when there aren't any??
                console.log("############### MIA LOANS:", mia_loans.length, loans)
                a.loans.backgroundResync.removed(mia_loans.length)
                loans.forEach(loan => $.extend( true, indexed_loans[loan.id], loan) )
            })

            //get all loans that were added since the last update.
            LoanAPI.getLoanBatch(loans_added).done(loans => { //this is ok when there aren't any??
                console.log("############### NEW LOANS FOUND:", loans_added.length, loans)
                loans.forEach(loan => indexed_loans[loan.id] = loan)
                loans_from_kiva = loans_from_kiva.concat(loans)
                a.loans.backgroundResync.added(loans_added.length)

            })
        })
    },

    onLoad: function(options) {
        console.log("loanStore:onLoad")

        //we already have the loans, just spit them back.
        if (loans_from_kiva.length > 0){
            a.loans.load.completed(loans_from_kiva);
            return
        }

        options = $.extend({}, options)
        //options.country_code = 'pe,ke'
        //, {region: 'af'}

        new LoansSearch(options).start()
            .done(loans => {
                loans.forEach(loan => indexed_loans[loan.id] = loan)
                loans_from_kiva = loans;
                a.loans.load.completed(loans)
                //clean up loans
                basket_loans.removeAll(bi => indexed_loans[bi.loan_id] == undefined)
                this.onLender('nuclearspike') //zx81
            })
            .progress(progress => {
                console.log("progress:", progress)
                a.loans.load.progressed(progress)
            })
            .fail((xhr, status, err) => {
                a.loans.load.failed(status)
            })
    },

    onDetail: function(id){
        //this is weird. treating an async function as sync
        var loan = this.syncGet(id)
        a.loans.detail.completed(loan) //return immediately with the last one we got (typically at start up)
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
        if (loan) $.extend(true, loan, d_loan)
    },

    syncGet: function(id){
        return indexed_loans[id]
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