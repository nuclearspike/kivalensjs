'use strict';
import Reflux from 'reflux'
import LoanAPI from '../api/loans'
import a from '../actions'
import criteriaStore from './criteriaStore'

//array of api loan objects that are sorted in the order they were returned.
var loans_from_kiva = [];
var loanStore = Reflux.createStore({
    listenables: [a.loans],
    init:function(){
        this.hasAllDetails = false
        console.log("loanStore:init")
        a.loans.load();
    },
    onLoad: function(options) {
        console.log("loanStore:onLoad")

        //we already have the loans, just spit them back.
        if (loans_from_kiva.length > 0){
            a.loans.load.completed(loans_from_kiva);
            return;
        }

        options = options || {}

        //options.region = 'af'
        LoanAPI.getAllLoans(options)
            .done(loans => {
                //local_this.loans = loans;
                loans_from_kiva = loans;
                a.loans.load.completed(loans)
                this.onDetails()
            })
            .progress(progress => {
                console.log("progress:", progress)
                a.loans.load.progressed(progress)
            })
            .fail((result) =>{
                a.loans.load.failed()
            })
    },

    onFilter: function(c){
        //console.log("loanStore:onFilter:",c)
        a.loans.filter.completed(this.syncFilterLoans(c))
    },

    syncHasLoadedLoans: function(){
        return loans_from_kiva.length > 0
    },

    syncHasAllDetails: function(){
        return this.hasAllDetails
    },

    mergeLoan: function(d_loan){
        var loan = loans_from_kiva.first(loan => { return loan.id == d_loan.id })
        if (loan)
            $.extend(loan, d_loan)
    },

    onSingle: function(){
        ///
    },

    //kicks off the whole fetch.
    onDetails: function(){
        LoanAPI.getLoanBatch(loans_from_kiva.select(loan=>{return loan.id}), true)
            .progress(progress => {
                if (progress.loan) {
                    this.mergeLoan(progress.loan)
                }
                if (progress.label) {
                    a.loans.details.progressed(progress)
                }
            })
            .done(results => {
                this.hasAllDetails = true
                a.loans.details.completed()
            })
    },

    syncFilterLoans: function(c){
        if (!c){
            c = criteriaStore.syncGetLast()
        }
        //break this into another unit --store? LoansAPI.filter(loans, criteria)
        var search_text = c.search_text;
        if (search_text) search_text = search_text.toUpperCase();
        var loans = loans_from_kiva

        /**var makeTestArray = function(search){
            if (!search) return []
            var words = search.match(/(\w+)|-(\w+)|~(\w+)/g)
            if (!words) return []
            //words [agri, retail]
            return words.map(word => {
                //word: agri
                //if -, ~, %
                return {regexp: new RegExp(), func: function(to_test, regexp){

                }};
            })
        }

        var _c = {}
        _c.sector = {raw: c.sector, tests: makeTestArray(c.sector)}

        var funcs = {
            //'%': (word)=>{return new RegEx()}, //word like
            '-': (word)=>{return new RegExp()}, //does not have word
            '~': (word)=>{return new RegExp()}, //word contains
            '=' : (word)=>{return new RegExp()} //exact "rose" wouldn't return rosenda
            //word starts with
        }

        var testForText = function(field, search){
            var type = ''
            if (search){

            }
        }

        var tests = {
            sector: {raw: '-retail', tests: ['-retail']},
            country: {raw: 'peru philip', tests: ['peru','philip']}
        }**/

        //for each search term for sector, break it into an array, ignoring spaces and commas
        //for each loan, test the sector against each search term.

        if (search_text) {
            loans = loans.where(l => {
                return (l.name.toUpperCase().indexOf(search_text) >= 0)
                    || (l.location.country.toUpperCase().indexOf(search_text) >= 0)
                    || (l.sector.toUpperCase().indexOf(search_text) >= 0)
                    || (l.activity.toUpperCase().indexOf(search_text) >= 0)
            })
        }
        if (c.use)
            loans = loans.where(l => l.use.toUpperCase().indexOf(c.use.toUpperCase()) >= 0)
        if (c.country)
            loans = loans.where(l => l.location.country.toUpperCase().indexOf(c.country.toUpperCase()) >= 0)
        if (c.sector)
            loans = loans.where(l => l.sector.toUpperCase().indexOf(c.sector.toUpperCase()) >= 0)
        if (c.activity)
            loans = loans.where(l => l.activity.toUpperCase().indexOf(c.activity.toUpperCase()) >= 0)
        if (c.name)
            loans = loans.where(l => l.name.toUpperCase().indexOf(c.name.toUpperCase()) >= 0)
        //console.log("syncFilterLoans:result",loans)
        return loans
    }

    /**onSingle: (id)=>{
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
    }**/
});

export default loanStore