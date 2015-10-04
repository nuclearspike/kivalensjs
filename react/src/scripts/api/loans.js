'use strict';

import kiva from './kiva'

class LoanAPI extends kiva {
    static getLoan(id){
        return this.sem_get(`loans/${id}.json`, 'loans', true)
    }

    static getLoanBatch(id_arr, with_progress){
        //kiva does not allow more than 100 loans in a batch. break the list into chunks of up to 100 and process them.
        // this will send progress messages with individual loan objects or just wait for the .done()
        var chunks = id_arr.chunk(100)
        var $def = $.Deferred()
        var r_loans = []

        for (var i = 0; i < chunks.length; i++){
            $def.notify({percentage: 0, label: 'Preparing to download...'})
            this.sem_get(`loans/${chunks[i].join(',')}.json`, {}, 'loans', false)
                .done(loans => {
                    if (with_progress)
                        loans.forEach(loan => { $def.notify({loan: loan}) })
                    r_loans = r_loans.concat(loans)
                    $def.notify({percentage: r_loans.length * 100 / id_arr.length, label: `${r_loans.length}/${id_arr.length} downloaded`})
                    if (r_loans.length == id_arr.length) {
                        $def.resolve(r_loans)
                        $def.notify({done: true})
                    }
                })
        }
        return $def
    }

    //static getLoans(query){
    //    return this.sem_get('loans/search.json', query)
    //}

    static getAllLoans(options){
        //using the ids_only option is not entirely clear that the function still returns all details. add options that
        // don't get passed to kiva if it's ever valuable to only get the ids (to look for ones that are new since the
        // page opened, for example)...
        var common_descr =  ["THIS", "ARE", "SHE", "THAT", "HAS", "LOAN", "BE", "OLD", "BEEN", "YEARS", "FROM", "WITH", "INCOME", "WILL", "HAVE"]
        var common_use = ["PURCHASE", "FOR", "AND", "BUY", "OTHER", "HER", "BUSINESS", "SELL", "MORE", "HIS", "THE", "PAY"]

        //descrWords.where(word => {return word != undefined})
        var processText = function(text, ignore_words){
            if (text && text.length > 0){
                //remove common words.
                return text.match(/(\w+)/g).distinct()
                    .where(word => {return word != undefined && word.length > 2})
                    .select(word => {return word.toUpperCase()})
                    .where(word=>{ return !ignore_words.contains(word) })
            } else {
                return [] //no indexable words.
            }
        }

        var loanVisitor = function(loan){
            var descr_arr
            var use_arr

            descr_arr = processText(loan.description.texts.en, common_descr)
            use_arr = processText(loan.use, common_use)

            var last_repay = (loan.terms.scheduled_payments && loan.terms.scheduled_payments.length > 0) ? new Date(Date.parse(loan.terms.scheduled_payments.last().due_date)): null

            var addIt = {
                kl_downloaded: new Date(),
                kl_descr_search_arr: descr_arr,
                kl_use_search_arr: use_arr,
                kl_use_or_descr_arr: use_arr.concat(descr_arr).distinct(),
                kl_last_repayment: last_repay  //on non-fundraising this won't work.
            }
            $.extend(loan, addIt)
        }

        return this.getPaged('loans/search.json', 'loans', $.extend({}, options, {status: 'fundraising', ids_only: 'true'}), loanVisitor)
    }
}

export default LoanAPI