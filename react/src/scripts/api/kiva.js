var sem = require('semaphore')(8);

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

//looking to get rid of this completely
export default class K {
    static setAPIOptions(options){
        api_options = options
        if (options.max_concurrent)
            sem.capacity = options.max_concurrent
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

    //fetch data from kiva right now. use sparingly. sem_get makes sure the browser never goes above a certain number of active requests.
    static get(path, params){
        params = $.extend({}, params, {app_id: api_options.app_id})
        console.log('get():', path, params)
        return $.getJSON(`http://api.kivaws.org/v1/${path}?${serialize(params)}`)
            .done(result => console.log(result) )
            .fail((xhr, status, err) => console.log(status, err, err.toString()) )
    }

    //semaphored access to kiva api to not overload it. also, it handles collections.
    static sem_get(url, params, collection, isSingle){
        var $def = $.Deferred()
        sem.take(function(){
            this.get(url, params).always(()=> sem.leave()).done($def.resolve).fail($def.reject).progress($def.notify)
        }.bind(this))

        //should this be a wrapping function?
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

        if (loan.description.texts) { //the presence implies this is a detail result
            var descr_arr
            var use_arr

            if (loan.description.texts.en) {
                descr_arr = processText(loan.description.texts.en, common_descr)
            } else {
                descr_arr = []
                loan.description.texts.en = "No English description available."
            }

            use_arr = processText(loan.use, common_use)
            addIt.kl_tags = loan.tags.select(tag => tag.name) //??
            addIt.kl_use_or_descr_arr = use_arr.concat(descr_arr).distinct(),
            addIt.kl_last_repayment = (loan.terms.scheduled_payments && loan.terms.scheduled_payments.length > 0) ? Date.from_iso(loan.terms.scheduled_payments.last().due_date) : null
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
                req.fetch().fail(this.promise.reject).done(resp => this.processPage(req, resp))
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
        if (this.visitorFunct) response.forEach(this.visitorFunct)
        request.results = response
        request.state = sDONE
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
        this.setupRequest(1).fetch()
            .fail(this.promise.reject)
            .done(result => this.processFirstResponse(this.requests.first(), result))
        return this.promise
    }
}

class LoansSearch extends PagedKiva {
    constructor(params, getDetails = true){
        params = $.extend({}, {status:'fundraising'}, params)
        //params.country_code = 'pe'
        super('loans/search.json', params, 'loans')
        this.twoStage = getDetails
        this.visitorFunct = ResultProcessors.processLoan
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
        return super.start().fail(this.promise.reject).then(loans => loans.select(loan => loan.id))
    }
}

class LoanBatch {
    constructor(id_arr){
        this.ids = id_arr
    }
    start(){
        //kiva does not allow more than 100 loans in a batch. break the list into chunks of up to 100 and process them.
        // this will send progress messages with individual loan objects or just wait for the .done()
        var chunks = this.ids.chunk(100) //breaks into an array of arrays of 100.
        var $def = $.Deferred()
        var r_loans = []

        for (var i = 0; i < chunks.length; i++){
            $def.notify({percentage: 0, label: 'Preparing to download...'})
            Request.sem_get(`loans/${chunks[i].join(',')}.json`, {}, 'loans', false)
                .done(loans => {
                    $def.notify({percentage: r_loans.length * 100 / this.ids.length, label: `${r_loans.length}/${this.ids.length} downloaded`})
                    ResultProcessors.processLoans(loans)
                    r_loans = r_loans.concat(loans)
                    if (r_loans.length >= this.ids.length) {
                        $def.notify({done: true})
                        $def.resolve(r_loans)
                    }
                })
        }
        return $def
    }
}

class Loans {
    constructor(update_interval = 0){
        this.loans_from_kiva = []
        this.lender_loans = []
        this.indexed_loans = {}
        this.base_kiva_params = {}
        this.background_resync = 0
        this.notify_promise = $.Deferred()
        this.update_interval = update_interval
        if (this.update_interval > 0)
            setInterval(this.backgroundResync.bind(this), this.update_interval)
    }
    setBaseKivaParams(base_kiva_params){
        this.base_kiva_params = base_kiva_params
    }
    setKivaLoans(loans, reset=true){
        if (reset) {
            this.loans_from_kiva = []
            this.indexed_loans = {}
        }
        this.loans_from_kiva = this.loans_from_kiva.concat(loans)
        loans.forEach(loan => this.indexed_loans[loan.id] = loan)
    }
    searchKiva(kiva_params){
        return new LoansSearch(kiva_params).start().done(loans => this.setKivaLoans(loans))
    }
    searchLocal(kl_criteria){

    }
    getById(id){
        return this.indexed_loans[id]
    }
    hasLoan(id){
        return this.indexed_loans[id] != undefined
    }
    setLender(lender_id){
        if (lender_id)
            this.lender_id = lender_id
        var kl = this
        return new LenderLoans(this.lender_id).start().done(ids => {
            ids.removeAll(id => !kl.hasLoan(id.loan_id))
            kl.lender_loans = ids
            console.log('LENDER LOAN IDS:', ids)
        })
    }
    backgroundResync(){
        this.background_resync++
        var kl = this

        new LoansSearch(this.base_kiva_params, false).start().done(loans => {
            var loans_added = [], loans_updated = 0
            //for every loan found in a search from Kiva..
            loans.forEach(loan => {
                var existing = kl.indexed_loans[loan.id]
                if (existing) {
                    if (existing.status != loan.status
                        || existing.basket_amount != loan.basket_amount
                        || existing.funded_amount != loan.funded_amount)
                        loans_updated++

                    $.extend(true, existing, loan, {kl_background_resync: kl.background_resync})
                } else {
                    //gather all ids for new loans.
                    loans_added.push(loan.id)
                }
            })
            console.log("############### LOANS UPDATED:", loans_updated)
            if (loans_updated > 0) this.notify_promise.notify({background_updated:loans_updated})

            //find the loans that weren't found during the last update and fetch them. Removed? They don't seem to be funded loans... ?
            var mia_loans = this.loans_from_kiva.where(loan => loan.status == 'fundraising' && loan.kl_background_resync != this.background_resync).select(loan => loan.id)
            new LoanBatch(mia_loans).start().done(loans => { //this is ok when there aren't any??
                console.log("############### MIA LOANS:", mia_loans.length, loans)
                loans.forEach(loan => {
                    var existing = kl.indexed_loans[loan.id]
                    if (existing)  //it should always exist since it was already in our loans_from_kiva array
                        $.extend(true, existing, loan)
                })
            })

            //get all loans that were added since the last update.
            new LoanBatch(loans_added).start().done(loans => { //this is ok when there aren't any??
                console.log("############### NEW LOANS FOUND:", loans_added.length, loans)
                this.setKivaLoans(loans, false)
            })
        })
    }
}

export {LenderLoans, LoansSearch, PagedKiva, ResultProcessors, Request, LoanBatch, Loans}

//temp
window.Request = Request
window.LoansSearch = LoansSearch
window.LenderLoans = LenderLoans