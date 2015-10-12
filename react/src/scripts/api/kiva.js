var sem = require('semaphore')(7);

//turns {json: 'object', app_id: 'com.me'} into ?json=object&app_id=com.me
function serialize(obj, prefix) {
    var str = [];
    for (var p in obj) {
        if (obj.hasOwnProperty(p)) {
            var k = prefix ? prefix + "[" + p + "]" : p,
                v = obj[p];
            str.push(typeof v == "object" ? serialize(v, k) : encodeURIComponent(k) + "=" + encodeURIComponent(v));
        }
    }
    return str.join("&");
}

var api_options = {}

//looking to get rid of this in favor of individual call classes.
export default class K {
    static setAPIOptions(options){
        api_options = options
        if (options.max_concurrent)
            sem.capacity = options.max_concurrent
    }

    //when the results are not paged or when you know it's only one page, this is faster.
    static get(path, options){
        options = $.extend({}, options, {app_id: api_options.app_id})
        console.log('get():', path, options)
        return $.getJSON(`http://api.kivaws.org/v1/${path}?${serialize(options)}`)
            .done(result => console.log(result) )
            .fail((xhr, status, err) => console.error(status, err.toString()) )
    }

    //call this as much as you want, the requests queue up and will cap at the max concurrent connections and do them later,
    // it returns a promise and you'll get your .done() later on. "collection" param is optional. when specified,
    // instead of returning the full JSON object with paging data, it only returns the "loans" section or "partners"
    // section. "isSingle" indicates whether it should return only the first item or a whole collection
    static sem_get(url, options, collection, isSingle, shouldAbort){
        var $def = $.Deferred()
        if (!shouldAbort) shouldAbort = ()=> {return false}
        sem.take(function(){
            if (shouldAbort(options)) {
                sem.leave()
            } else {
                this.get(url, options).done(()=> sem.leave()).done($def.resolve).fail($def.reject).progress($def.notify)
            }
        }.bind(this))

        if (collection){ //'loans' 'partners' etc... then do another step of processing. will resolve as undefined if no result.
            return $def.then(result => isSingle ? result[collection][0] : result[collection] )
        } else {
            return $def
        }
    }
}

const sREADY = 1, sDOWNLOADING = 2, sDONE = 3, sFAILED = 4, sCANCELLED = 5
class Request {
    constructor(url, params, page = null, collection = null, isSingle = false) {
        this.url = url
        this.params = params
        this.page = page || 1
        this.state = sREADY
        this.collection = collection
        this.isSingle = isSingle
        this.ids = []
        this.results = []
        this.continuePaging = true
        this.raw_result = {}
    }

    fetch(){
        var $def = $.Deferred()

        sem.take(function(){
            if (this.state == sCANCELLED) {
                sem.leave()
                $def.reject()
                return $def
            } else {
                if (this.page)
                    $.extend(this.params, {page: this.page})
                $def.fail(()=> this.state = sFAILED)
                Request.get(this.url, this.params)
                    .done(result => {
                        sem.leave(1)
                        this.raw_result = result
                    }) //cannot pass the func itself since it takes params.
                    .done($def.resolve)
                    .fail($def.reject)
                    .progress($def.notify)
            }
        }.bind(this))

        if (this.collection){ //'loans' 'partners' etc... then do another step of processing. will resolve as undefined if no result.
            return $def.then(result => this.isSingle ? result[this.collection][0] : result[this.collection] )
        } else {
            return $def
        }
    }

    fetchFromIds(ids){
        this.state = sDOWNLOADING
        this.ids = ids
        return Request.sem_get(`${this.collection}/${ids.join(',')}.json`, {}, this.collection, false)
    }

    static get(path, params){
        params = $.extend({}, params, {app_id: api_options.app_id})
        console.log('get():', path, params)
        return $.getJSON(`http://api.kivaws.org/v1/${path}?${serialize(params)}`)
            .done(result => console.log(result) )
            .fail((xhr, status, err) => console.error(status, err.toString()) )
    }

    static sem_get(url, params, collection, isSingle){
        var $def = $.Deferred()
        sem.take(function(){
            this.get(url, params).done(()=> sem.leave()).done($def.resolve).fail($def.reject).progress($def.notify)
        }.bind(this))

        if (collection){ //'loans' 'partners' etc... then do another step of processing. will resolve as undefined if no result.
            return $def.then(result => isSingle ? result[collection][0] : result[collection] )
        } else {
            return $def
        }
    }
}

var common_descr =  ["THIS", "ARE", "SHE", "THAT", "HAS", "LOAN", "BE", "OLD", "BEEN", "YEARS", "FROM", "WITH", "INCOME", "WILL", "HAVE"]
var common_use = ["PURCHASE", "FOR", "AND", "BUY", "OTHER", "HER", "BUSINESS", "SELL", "MORE", "HIS", "THE", "PAY"]

class ResultProcessors {
    static processLoans(loans){
        //this alters the loans in the array. no need to return the array ?
        loans.where(loan => loan.kl_downloaded == undefined).forEach(ResultProcessors.processLoan)
        return loans
    }

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

        var addIt = {
            kl_downloaded: new Date()
        }

        if (loan.description) { //the presence implies this is a detail result
            var descr_arr
            var use_arr

            descr_arr = processText(loan.description.texts.en, common_descr)
            if (!loan.description.texts.en) loan.description.texts.en = "No English description available."
            use_arr = processText(loan.use, common_use)

            var last_repay = (loan.terms.scheduled_payments && loan.terms.scheduled_payments.length > 0) ? Date.from_iso(loan.terms.scheduled_payments.last().due_date) : null

            addIt.kl_use_or_descr_arr = use_arr.concat(descr_arr).distinct(),
            addIt.kl_last_repayment = last_repay  //on non-fundraising this won't work.
        }
        $.extend(loan, addIt)
        return loan
    }
}

class PagedKiva {
    constructor(url, params, collection){
        this.url = url
        this.params = $.extend({}, {per_page: 100, app_id: api_options.app_id}, params)
        this.collection = collection
        this.promise = $.Deferred()
        this.requests = []
        this.twoStage = false
        this.visitorFunct = null
        this.result_object_count = 0
    }

    processFirstResponse(request, response){
        this.total_object_count = request.raw_result.paging.total
        for (var page = 2; page <= request.raw_result.paging.pages; page++) { this.setupRequest(page) }
        this.processPage(request, response)
        if (request.continuePaging) {
            this.requests.skip(1).forEach(req => {
                //for every page of data from 2 to the max, queue up the requests.
                req.fetch().done(resp => this.processPage(req, resp))
            })
        }
    }

    processPage(request, response){
        return this.twoStage ? this.processPageOfIds(request, response) : this.processPageOfData(request, response)
    }

    processPageOfIds(request, response){
        this.promise.notify({percentage: (this.requests.where(req => req.ids.length > 0).length * 100 / this.requests.length),
            label: `Getting the basics... Step 1 of 2`})
        request.fetchFromIds(response)
            .done(detail_response => this.processPageOfData(request, detail_response) )
    }

    processPageOfData(request, response){
        request.state = sDONE
        request.results = response
        this.result_object_count += response.length;
        this.promise.notify({percentage: (this.result_object_count * 100)/this.total_object_count,
            label: `${this.result_object_count}/${this.total_object_count} downloaded`})

        //only care that we processed all pages. if the number of loans changes while paging, still continue.
        if (this.requests.all(req => req.state == sDONE)) {
            this.wrapUp();
            return
        }

        //this seems like it can miss stuff.
        if (!this.continuePaging(response)){
            request.continuePaging = false
        }

        var ignoreAfter = this.requests.first(req => !req.continuePaging)
        if (ignoreAfter) { //if one is calling cancel on the whole process,
            //cancel all remaining requests.
            this.requests.skipWhile(req => req.page <= ignoreAfter.page).where(req => req.state != sCANCELLED).forEach(req => req.state = sCANCELLED)
            //then once all pages up to the one that called it quits are done, wrap it up.
            if (this.requests.takeWhile(req => req.page <= ignoreAfter.page).all(req => req.state == sDONE)) {
                this.wrapUp()
            }
        }
    }

    continuePaging(response){
        return true
    }

    wrapUp() {
        this.promise.notify({label: 'Processing...'})
        var result_objects = []
        this.requests.forEach(req => result_objects = result_objects.concat(req.results))
        if (this.visitorFunct)
            result_objects.forEach(this.visitorFunc)
        this.promise.notify({done: true})
        this.promise.resolve(result_objects)
    }

    setupRequest(page){
        var req = new Request(this.url, this.params, page, this.collection, false)
        this.requests.push(req)
        return req
    }

    start(){
        if (this.twoStage) $.extend(this.params, {ids_only: 'true'})
        this.promise.notify({label: 'Downloading...'})
        this.setupRequest(1).fetch().done(result => this.processFirstResponse(this.requests.first(), result))
        return this.promise
    }
}

class LoansSearch extends PagedKiva {
    constructor(params, getDetails = true){
        params = $.extend({}, {status:'fundraising'}, params)
        super('loans/search.json', params, 'loans')
        this.twoStage = getDetails
        this.visitorFunc = ResultProcessors.processLoan
    }
}

class LenderLoans extends PagedKiva {
    constructor(lender_id, fundraising_only = true){
        super(`lenders/${lender_id}/loans.json`, {}, 'loans')
        this.fundraising_only = fundraising_only
    }

    continuePaging(loans) {
        //only do this stuff if we are only wanting fundraising which is what we want now. but if open-sourced other projects may want it for different reasons.
        if (this.fundraising_only && !loans.any(loan => loan.status == 'fundraising')){
            //if all loans on the page were posted at least 30 days ago, stop looking.
            if (loans.all(loan => Date.from_iso(loan.posted_date).isBefore((30).days().ago())))
                return false
        }
        return true
    }

    start(){
        //return only an array of the ids of the loans
        return super.start().then(result => result.select(loan => loan.id))
    }
}

export {LenderLoans, LoansSearch, PagedKiva, ResultProcessors, Request}

//temp
window.Request = Request
window.LoansSearch = LoansSearch
window.LenderLoans = LenderLoans