//turns {json: 'object'} into ?json=object
var sem = require('semaphore')(8);

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
        options = options || {}
        options = $.extend(options, {app_id: api_options.app_id})

        console.log('get():',options)
        var query_string
        if (options)
            query_string = serialize(options);
        var url = `http://api.kivaws.org/v1/${url}?${query_string}`;
        console.log(url);
        //have this semaphored. create a wrapper deferred object
        return $.getJSON(url)
            .done(result => {
                console.log(result);
            })
            .fail((xhr, status, err) => {
                console.error(status, err.toString());
            })
    }

    static getPaged(url, collection, options){
        console.log("get_paged:", url, collection, options)

        var $def = $.Deferred()
        options = $.extend(options, {per_page: 100, page: 1, app_id: api_options.app_id})

        $def.notify({type:'label',label: 'Preparing to download...'})
        var result_objects = [];
        var pages = {};
        var result_object_count = 0;

        //all data is processed, combine them all into one single array of loans.
        var wrapUp = function(total_pages){
            $def.notify({type: 'label', label: 'processing...'})
            for (var n = 1; n <= total_pages; n++) {
                result_objects = result_objects.concat(pages[n])
            }
            $def.notify({type: 'done'})
            $def.resolve(result_objects)
        }

        //process the results from a single page of results.
        var processResults = function(result){
            pages[result.paging.page] = result[collection]
            result_object_count += result[collection].length;
            $def.notify({type: 'percent', percentage: (result_object_count*100)/result.paging.total})
            $def.notify({type:'label',label: `${result_object_count}/${result.paging.total} downloaded`})
            if (result_object_count == result.paging.total) wrapUp(result.paging.pages);
        }

        //process the first page of results and make semaphored calls to get more pages.
        var processPaging = function(result){
            $def.notify({type:'label', label: 'Downloading...'})
            for (var page = 2; page <= result.paging.pages; page++) {
                sem.take(function(page){
                    this.get(url, $.extend(options, {page: page})).done(sem.leave).done(processResults.bind(this))
                }.bind(this, page))
            }
        }

        //get the first page, reads the paging data that starts the rest, then processes the results of the first page.
        this.get(url, options).done(processPaging.bind(this)).done(processResults.bind(this))

        return $def
    }
}