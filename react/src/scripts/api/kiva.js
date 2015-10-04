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

export default class K {
    static setAPIOptions(options){
        api_options = options
        if (options.max_concurrent)
            sem.capacity = options.max_concurrent
    }

    //when the results are not paged or when you know it's only one page, this is faster.
    static get(url, options){
        options = $.extend({}, options, {app_id: api_options.app_id})
        console.log('get():', url, options)
        var url = `http://api.kivaws.org/v1/${url}?${serialize(options)}`;
        //have this semaphored. create a wrapper deferred object
        return $.getJSON(url)
            .done(result => { console.log(result) })
            .fail((xhr, status, err) => { console.error(status, err.toString()) })
    }

    //call this as much as you want, the requests queue up and will cap at the max concurrent connections and do them later,
    // it returns a promise and you'll get your .done() later on. "collection" param is optional. when specified,
    // instead of returning the full JSON object with paging data, it only returns the "loans" section or "partners"
    // section. "isSingle" indicates whether it should return only the first item or a whole collection
    static sem_get(url, options, collection, isSingle){
        var $def = $.Deferred()
        sem.take(function(){
            this.get(url, options).done(()=>{sem.leave()}).done($def.resolve).fail($def.reject).progress($def.notify)
        }.bind(this))

        if (collection){ //'loans' 'partners' etc... then do another step of processing. will resolve as undefined if no result.
            return $def.then(result => { return isSingle ? result[collection][0] : result[collection] })
        } else {
            return $def
        }
    }

    //for requests that have 1 to * pages for results.
    static getPaged(url, collection, options, visitorFunc){
        //options.country_code = 'KE' //TEMP@!!!!
        //url, collection are required. options is optional
        console.log("getPaged:", url, collection, options)

        var $def = $.Deferred()
        $.extend(options, {per_page: 100, page: 1, app_id: api_options.app_id})

        $def.notify({label: 'Preparing to download...'})
        var result_objects = []
        var pages = {}
        var pages_count = 0
        var total_object_count = 0
        var result_object_count = 0
        var id_pages_done = 0

        //all data is downloaded, combine them all into one single array of loans,
        // assembled in the same order they came back from kiva
        var wrapUp = function(){
            $def.notify({label: 'processing...'})
            for (var n = 1; n <= pages_count; n++) {
                result_objects = result_objects.concat(pages[n])
            }

            if (visitorFunc) { result_objects.forEach(visitorFunc) }
            $def.notify({done: true})
            $def.resolve(result_objects)
        }

        var generalProcessResponse = function (objects, page){
            pages[page] = objects
            result_object_count += objects.length;
            $def.notify({percentage: (result_object_count * 100)/total_object_count,
                label: `${result_object_count}/${total_object_count} downloaded`})
            if (result_object_count >= total_object_count) wrapUp();
        }

        var processSinglePageOfIDResults = function(result_ids){
            id_pages_done++
            $def.notify({percentage: (id_pages_done * 100 /  result_ids.paging.pages), label: `Getting the basics... Step 1 of 2`})
            this.sem_get(`${collection}/${result_ids[collection].join(',')}.json`, {}, collection, false)
                .done(function(result){ generalProcessResponse(result, result_ids.paging.page) })
        }

        //process a single page of results.
        var processSinglePageOfResults = function(result){
            generalProcessResponse(result[collection], result.paging.page)
        }

        var processResponse = (options.ids_only) ? processSinglePageOfIDResults.bind(this) : processSinglePageOfResults.bind(this)

        //process the first page of results and make semaphored calls to get more pages.
        var processPagingAndQueueRequests = function(result){
            $def.notify({label: 'Downloading...'})
            total_object_count = result.paging.total
            pages_count = result.paging.pages
            for (var page = 2; page <= pages_count; page++) {
                //for every page of data from 2 to the max, queue up the requests.
                this.sem_get(url, $.extend({}, options, {page: page})).done(processResponse)
            }
        }


        //get the first page, reads the paging data that starts the rest, then processes the results of the first page.
        this.sem_get(url, options)
            .done([processPagingAndQueueRequests.bind(this), processResponse])

        return $def
    }
}