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

        if (collection){ //'loans' 'partners' etc... then do another step of processing
            return $def.then(result=>{
                if (isSingle)
                    return result[collection][0] //will be undefined if no result.
                else
                    return result[collection]
            })
        } else {
            return $def
        }
    }

    //for requests that have 1 to * pages for results.
    static getPaged(url, collection, options){
        //options.country_code = 'KE' //TEMP@!!!!

        console.log("getPaged:", url, collection, options)

        var $def = $.Deferred()
        $.extend(options, {per_page: 100, page: 1, app_id: api_options.app_id})

        $def.notify({label: 'Preparing to download...'})
        var result_objects = [];
        var pages = {};
        var result_object_count = 0;

        //all data is downloaded, combine them all into one single array of loans,
        // assembled in the same order they came back from kiva
        var wrapUp = function(total_pages){
            $def.notify({label: 'processing...'})
            for (var n = 1; n <= total_pages; n++) {
                result_objects = result_objects.concat(pages[n])
            }
            $def.notify({done: true})
            $def.resolve(result_objects)
        }

        //process a single page of results.
        var processSinglePageOfResults = function(result){
            pages[result.paging.page] = result[collection]
            result_object_count += result[collection].length;
            $def.notify({percentage: (result_object_count*100)/result.paging.total,
                            label: `${result_object_count}/${result.paging.total} downloaded`})
            if (result_object_count == result.paging.total) wrapUp(result.paging.pages);
        }

        //process the first page of results and make semaphored calls to get more pages.
        var processPagingAndQueueRequests = function(result){
            $def.notify({label: 'Downloading...'})
            for (var page = 2; page <= result.paging.pages; page++) {
                //for every page of data from 2 to the max, queue up the requests.
                this.sem_get(url, $.extend({}, options, {page: page})).done(processSinglePageOfResults.bind(this))
            }
        }

        //get the first page, reads the paging data that starts the rest, then processes the results of the first page.
        this.sem_get(url, options)
            .done([processPagingAndQueueRequests.bind(this), processSinglePageOfResults.bind(this)])

        return $def
    }
}