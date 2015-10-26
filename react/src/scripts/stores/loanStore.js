'use strict';

import Reflux from 'reflux'
import {LenderLoans, LoansSearch, LoanBatch, Loans} from '../api/kiva'
import a from '../actions'
import criteriaStore from './criteriaStore'

//array of api loan objects that are sorted in the order they were returned.
var basket_loans = []
var last_filtered = []
var last_partner_search = {}
var last_partner_search_count = 0
var kivaloans = new Loans(15*60*1000)

//bridge the downloading/processing generic API class with the React app.
kivaloans.init().progress(progress => {
    if (progress.background_added)
        a.loans.backgroundResync.added(progress.background_added)
    if (progress.background_updated)
        a.loans.backgroundResync.updated(progress.background_updated)
    if (progress.loans_loaded)
        a.loans.load.completed(kivaloans.loans_from_kiva)
    if (progress.loan_load_progress)
        a.loans.load.progressed(progress.loan_load_progress)
    if (progress.failed)
        a.loans.load.failed(progress.failed)
})

//a.loans.load.failed
window.kivaloans = kivaloans //todo: not just for debugging. ?


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

var makeRangeTester = function(crit_group, value_name){
    var min = crit_group[`${value_name}_min`]
    var max = crit_group[`${value_name}_max`]
    return {
        range: function(attr){ return min <= attr && attr <= max }
    }
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


var loanStore = Reflux.createStore({
    listenables: [a.loans],
    init:function(){
        console.log("loanStore:init")
        if (typeof localStorage === 'object') basket_loans = JSON.parse(localStorage.getItem('basket'))
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
        window.rga.event({category: 'basket', action: 'basket:clear'})
        this._basketSave()
    },
    onBasketBatchAdd: function(loans_to_add){
        basket_loans = basket_loans.concat(loans_to_add) //.distinct((a,b)=> a.loan_id == b.loan_id)
        window.rga.event({category: 'basket', action: 'basket:batchAdd', value: loans_to_add.length})
        this._basketSave()
    },
    onBasketAdd: function(loan_id, amount = 25){
        if (!this.syncInBasket(loan_id)) {
            window.rga.event({category: 'basket', action: 'basket:add'})
            basket_loans.push({amount: amount, loan_id: loan_id})
            this._basketSave()
        }
    },
    onBasketRemove: function(loan_id){
        basket_loans.removeAll(bi => bi.loan_id == loan_id)
        window.rga.event({category: 'basket', action: 'basket:remove'})
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
    onDetail: function(id){
        var loan = kivaloans.getById(id)
        a.loans.detail.completed(loan) //return immediately with the last one we got (typically at start up)
        kivaloans.refreshLoan(loan).done(loan => a.loans.detail.completed(loan)) //kick off a process to get an updated version
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
        if (last_filtered.length == 0)
            a.loans.filter()
        return last_filtered
    },
    syncFilterPartners: function(c){
        if (last_partner_search_count > 10) {
            last_partner_search = {}
            last_partner_search_count = 0
        }

        var partner_criteria_json = JSON.stringify(c.partner)
        var partner_ids
        if (last_partner_search[partner_criteria_json]){
            partner_ids = last_partner_search[partner_criteria_json]
        } else {
            last_partner_search_count++
            var stSocialPerf = makeExactTester(c.partner.social_performance)
            var stRegion     = makeExactTester(c.partner.region)
            var rgRisk       = makeRangeTester(c.partner, 'partner_risk_rating')
            var rgDefault    = makeRangeTester(c.partner, 'partner_default')
            var rgDelinq     = makeRangeTester(c.partner, 'partner_arrears')
            var rgPY         = makeRangeTester(c.partner, 'portfolio_yield')
            var rgProfit     = makeRangeTester(c.partner, 'profit')
            var rgAtRisk     = makeRangeTester(c.partner, 'loans_at_risk_rate')
            var rgCEX        = makeRangeTester(c.partner, 'currency_exchange_loss_rate')

            //filter the partners
            partner_ids = kivaloans.partners_from_kiva.where(p => {
                return stSocialPerf.arr_all(p.kl_sp)
                    && stRegion.arr_any(p.kl_regions)
                    && rgDefault.range(p.default_rate)
                    && rgDelinq.range(p.delinquency_rate)
                    && rgProfit.range(p.profitability)
                    && rgPY.range(p.portfolio_yield)
                    && rgAtRisk.range(p.loans_at_risk_rate)
                    && rgCEX.range(p.currency_exchange_loss_rate)
                    && (isNaN(parseFloat(p.rating)) ? c.partner.rating_min == 0 : rgRisk.range(parseFloat(p.rating)))
            }).select(p => p.id)

            last_partner_search[partner_criteria_json] = partner_ids
            console.log("partner_ids, length: ", partner_ids, partner_ids.length)
        }
        return partner_ids
    },
    syncFilterLoans: function(c){
        if (!kivaloans.hasLoans()) return []
        if (!c){ c = criteriaStore.syncGetLast() }
        $.extend(true, c, {loan: {}, partner: {}, portfolio: {}}) //modifies the criteria object. must be after get last
        console.log("$$$$$$$ syncFilterLoans",c)

        //break this into another unit --store? LoansAPI.filter(loans, criteria)

        //for each search term for sector, break it into an array, ignoring spaces and commas
        //for each loan, test the sector against each search term.

        var stSector = makeExactTester(c.loan.sector)
        var stActivity = makeExactTester(c.loan.activity)
        var stName = makeSearchTester(c.loan.name)
        var stCountry = makeExactTester(c.loan.country_code)
        var stUse = makeSearchTester(c.loan.use)
        var stTags = makeExactTester(c.loan.tags)
        var stThemes = makeExactTester(c.loan.themes)
        var rgRepaid = makeRangeTester(c.loan, 'repaid_in')
        var rgBorrowerCount = makeRangeTester(c.loan, 'borrower_count')
        var rgPercentFemale = makeRangeTester(c.loan, 'percent_female')
        var rgStillNeeded = makeRangeTester(c.loan, 'still_needed')
        var rgExpiringInDays = makeRangeTester(c.loan, 'expiring_in_days')

        var partner_ids = this.syncFilterPartners(c)

        console.log('criteria', c)

        last_filtered = kivaloans.loans_from_kiva.where(loan => {
            return loan.status == 'fundraising' &&
                partner_ids.contains(loan.partner_id) && //ids must always be populated. there isn't the normal "if empty, skip"
                stSector.exact(loan.sector) &&
                stActivity.exact(loan.activity) &&
                stCountry.exact(loan.location.country_code) &&
                stTags.arr_all(loan.kl_tags) &&
                stThemes.arr_all(loan.themes) &&
                rgRepaid.range(loan.kl_repaid_in) &&
                rgBorrowerCount.range(loan.borrowers.length) &&
                rgPercentFemale.range(loan.kl_percent_women) &&
                rgStillNeeded.range(loan.loan_amount - loan.basket_amount - loan.funded_amount) &&
                rgExpiringInDays.range(loan.kl_expiring_in_days) &&
                stName.contains(loan.name) &&
                stUse.terms_arr.all(search_term => loan.kl_use_or_descr_arr.any(w => w.startsWith(search_term) ) )
        })

        var basicReverseOrder = (a,b) => { //this is a hack. OrderBy has issues! Not sure what the conditions are.
            if (a > b) return -1
            if (a < b) return 1
            return 0
        }

        //loans are default ordered by half_back, 75 back, last repayment
        switch (c.loan.sort) {
            case 'final_repayment':
                last_filtered = last_filtered.orderBy(loan => loan.kl_final_repayment)
                break
            case 'popularity':
                last_filtered = last_filtered.orderBy(loan => loan.kl_dollars_per_hour, basicReverseOrder)
                break
            case 'newest':
                last_filtered = last_filtered.orderBy(loan => loan.kl_posted_hours_ago)
                break
            case 'expiring':
                last_filtered = last_filtered.orderBy(loan => loan.kl_expiring_in_days)
                break
            default:
                last_filtered = last_filtered.orderBy(loan => loan.kl_half_back).thenBy(loan => loan.kl_75_back).thenBy(loan => loan.kl_final_repayment)
        }
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