'use strict';

import kiva from './kiva'

var common_descr =  ["THIS", "ARE", "SHE", "THAT", "HAS", "LOAN", "BE", "OLD", "BEEN", "YEARS", "FROM", "WITH", "INCOME", "WILL", "HAVE"]
var common_use = ["PURCHASE", "FOR", "AND", "BUY", "OTHER", "HER", "BUSINESS", "SELL", "MORE", "HIS", "THE", "PAY"]

class LoanAPI extends kiva {
    static processLoan(loan){
        var processText = function(text, ignore_words){
            if (text && text.length > 0){
                //remove common words.
                var matches = text.match(/(\w+)/g) //splits on word boundaries
                if (!Array.isArray(matches)) return []
                return matches.distinct() //ignores repeats
                    .where(word => word != undefined && word.length > 2) //ignores words 2 characters or less
                    .select(word => word.toUpperCase()) //UPPERCASE
                    .where(word => !ignore_words.contains(word) ) //ignores common words
            } else {
                return [] //no indexable words.
            }
        }

        var descr_arr
        var use_arr

        descr_arr = processText(loan.description.texts.en, common_descr)
        if (!loan.description.texts.en){
            loan.description.texts.en = "No English description available."
        }
        use_arr = processText(loan.use, common_use)

        var last_repay = (loan.terms.scheduled_payments && loan.terms.scheduled_payments.length > 0) ? new Date(Date.parse(loan.terms.scheduled_payments.last().due_date)): null

        var addIt = {
            kl_downloaded: new Date(),
            //kl_descr_search_arr: descr_arr,
            //kl_use_search_arr: use_arr,
            kl_use_or_descr_arr: use_arr.concat(descr_arr).distinct(),
            kl_last_repayment: last_repay  //on non-fundraising this won't work.
        }
        $.extend(loan, addIt)
        return loan
    }

    static processLoans(loans){
        //this alters the loans in the array. no real need to return the array
        loans.where(loan => loan.kl_downloaded == undefined).forEach(LoanAPI.processLoan)
        return loans
    }

    static refreshLoan(loan){
        var $def = $.Deferred()
        this.getLoan(loan.id).done(k_loan => $def.resolve($.extend(loan, k_loan)) )
        return $def
    }

    static getLoan(id){
        return this.sem_get(`loans/${id}.json`, {}, 'loans', true).then(LoanAPI.processLoan)
    }

    static getLoanBatch(id_arr, with_progress){
        //kiva does not allow more than 100 loans in a batch. break the list into chunks of up to 100 and process them.
        // this will send progress messages with individual loan objects or just wait for the .done()
        var chunks = id_arr.chunk(100) //breaks into an array of arrays of 100.
        var $def = $.Deferred()
        var r_loans = []

        for (var i = 0; i < chunks.length; i++){
            $def.notify({percentage: 0, label: 'Preparing to download...'})
            this.sem_get(`loans/${chunks[i].join(',')}.json`, {}, 'loans', false)
                .done(loans => {
                    $def.notify({percentage: r_loans.length * 100 / id_arr.length, label: `${r_loans.length}/${id_arr.length} downloaded`})
                    processLoans(loans)
                    //if (with_progress) loans.forEach(loan => $def.notify({index: id_arr.indexOf(loan.id), total: id_arr.length, loan: loan}) )
                    r_loans = r_loans.concat(loans)
                    if (r_loans.length >= id_arr.length) {
                        $def.notify({done: true})
                        $def.resolve(r_loans)
                    }
                })
        }
        return $def
    }

    static getLenderLoans(lender_id){
        var shouldStop = function(results){
            //if page of loan results contains a loan that was already cached as being in their loan list.
            return false
        }
        this.getPaged(`/lenders/${lender_id}/loans`, 'loans', {}, {stopPagingFunc: shouldStop})
    }

    static getAllLoans(options){
        //using the ids_only option is not entirely clear that the function still returns all details. add options that
        // don't get passed to kiva if it's ever valuable to only get the ids (to look for ones that are new since the
        // page opened, for example)...
        //options.country_code = 'pe,ke'
        return this.getPaged('loans/search.json', 'loans', $.extend({}, options, {status: 'fundraising', ids_only: 'true'}), {visitorFunc: LoanAPI.processLoan})
    }
}

export default LoanAPI