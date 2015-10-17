'use strict';

import Reflux from 'reflux'
import LoanAPI from '../api/loans'
import {LenderLoans, LoansSearch, LoanBatch, Loans} from '../api/kiva'
import a from '../actions'
import criteriaStore from './criteriaStore'
import partnerStore from './partnerStore'

//array of api loan objects that are sorted in the order they were returned.
var basket_loans = []
var last_filtered = []
var kivaloans = new Loans(30*60*1000)
window.kivaloans = kivaloans

kivaloans.notify_promise.progress(progress => {
    if (progress.background_added)
        a.loans.backgroundResync.added(progress.background_added)
    if (progress.background_updated)
        a.loans.backgroundResync.updated(progress.background_updated)
})

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
        return basket_loans.map(bi => {return {amount: bi.amount, loan: kivaloans.getById(bi.loan_id)}}).where(bi => bi.loan != undefined)
    },
    onBasketClear: function(){
        basket_loans = []
        this._basketSave()
    },
    onBasketBatchAdd: function(loans_to_add){
        basket_loans = basket_loans.concat(loans_to_add) //.distinct((a,b)=> a.loan_id == b.loan_id)
        this._basketSave()
    },
    onBasketAdd: function(loan_id, amount = 25){
        if (!this.syncInBasket(loan_id)) {
            basket_loans.push({amount: amount, loan_id: loan_id})
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
        kivaloans.setLender(lender_id).done((loan_ids)=>{
            //remove from basket
        })
    },

    //LOANS
    onBackgroundResync: function(){

    },

    onLoad: function(options) {
        console.log("loanStore:onLoad")

        //we already have the loans, just spit them back.
        if (kivaloans.loans_from_kiva.length > 0){
            a.loans.load.completed(kivaloans.loans_from_kiva);
            return
        }

        options = $.extend({}, options)
        //options.country_code = 'pe,ke'
        //options.region = 'af'

        kivaloans.setBaseKivaParams(options)

        kivaloans.searchKiva(options)
            .done(loans => {
                a.loans.load.completed(loans)
                //clean up loans
                basket_loans.removeAll(bi => !kivaloans.hasLoan(bi.loan_id))
                a.loans.basket.changed();
                this.onLender('nuclearspike') //zx81
            })
            .progress(progress => {
                console.log("progress:", progress)
                a.loans.load.progressed(progress)
            })
            .fail((xhr, status, err) => { //not bubbling out
                console.log("$$$$$ failed:", err, xhr)
                a.loans.load.failed(xhr.responseJSON.message)
            })
    },

    onDetail: function(id){
        //this is weird. treating an async function as sync
        var loan = kivaloans.getById(id)
        a.loans.detail.completed(loan) //return immediately with the last one we got (typically at start up)
        LoanAPI.refreshLoan(loan).done(loan => a.loans.detail.completed(loan)) //kick off a process to get an updated version
    },

    onFilter: function(c){ //why would I ever call this async??
        a.loans.filter.completed(this.syncFilterLoans(c))
    },

    syncHasLoadedLoans: function(){
        return kivaloans.loans_from_kiva.length > 0
    },

    mergeLoan: function(d_loan){ //used?
        var loan = kivaloans.getById(d_loan.id)
        if (loan) $.extend(true, loan, d_loan)
    },

    syncGet: function(id){
        return kivaloans.getById(id)
    },

    syncFilterLoansLast(){
        return last_filtered
    },

    syncFilterLoans: function(c){
        if (!c){ c = criteriaStore.syncGetLast() }

        $.extend(true, c, {loan: {}, partner: {}, portfolio: {}})
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

        var makeExactTester = function(value){
            var terms_arr = []
            if (value && value.length > 0)
                terms_arr = (Array.isArray(value)) ? value : value.split(',')
            console.log('makeExactTester',terms_arr)
            return {
                exact: function(loan_attr){
                    return terms_arr.length == 0 ? true: terms_arr.contains(loan_attr)
                },
                arr_all: function(loan_attr){
                    return terms_arr.length == 0 ? true: loan_attr && terms_arr.all(term => loan_attr.contains(term))
                },
                arr_any: function(loan_attr){
                    return terms_arr.length == 0 ? true: loan_attr && terms_arr.any(term => loan_attr.contains(term))
                }
            }
        }

        var stSocialPerf = makeExactTester(c.partner.social_performance)
        var stRegion = makeExactTester(c.partner.region)
        var all_partners = partnerStore.syncGetPartners()

        //filter the partners then loans against the partner list
        var partner_ids = all_partners.where(p => {
            return stSocialPerf.arr_all(p.kl_sp) && stRegion.arr_any(p.kl_regions)
        }).select(p => p.id)

        //var sStartsWith = function(loan_attr, test){ return (test) ? loan_attr.toUpperCase().startsWith(test) : true }

        var stSector = makeExactTester(c.loan.sector)
        var stActivity = makeExactTester(c.loan.activity)
        var stName = makeSearchTester(c.loan.name)
        var stCountry = makeExactTester(c.loan.country_code)
        var stUse = makeSearchTester(c.loan.use)
        var stTags = makeExactTester(c.loan.tags)
        var stThemes = makeExactTester(c.loan.themes)
        var stPartner = makeExactTester(partner_ids)

        console.log('criteria', c)

        last_filtered = kivaloans.loans_from_kiva.where(loan => {
            return loan.status == 'fundraising' &&
                stPartner.exact(loan.partner_id) &&
                stSector.exact(loan.sector) &&
                stActivity.exact(loan.activity) &&
                stCountry.exact(loan.location.country_code) &&
                stTags.arr_all(loan.kl_tags) &&
                stThemes.arr_all(loan.themes) &&
                stName.contains(loan.name) &&
                stUse.terms_arr.all(search_term => loan.kl_use_or_descr_arr.any(w => w.startsWith(search_term) ) )
        })
        return last_filtered
    }
});

window.perf = function(func){ //need separate for async
    var t0 = performance.now();
    func();
    var t1 = performance.now();
    console.log("Call to doSomething took " + (t1 - t0) + " milliseconds.")
}

export default loanStore