//turns {json: 'object'} into ?json=object
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

export default class K {
    //when the results are not paged or when you know it's only one page, this is faster.
    static get(url, options){
        options = options || {}
        options.app_id = options.app_id || 'org.kiva.kivalens'

        console.log('get():',options)
        var query_string
        if (options)
            query_string = serialize(options);
        var url = `http://api.kivaws.org/v1/${url}?${query_string}`;
        console.log(url);
        return $.getJSON(url)
            .done(result => {
                console.log(result);
            })
            .fail((xhr, status, err) => {
                console.error(status, err.toString());
            })
    }

    static get_paged(url, collection, options){
        console.log("get_paged:", url, collection, options)

        var $def = $.Deferred()
        options = options || {}
        options.per_page = 100;
        options.page = 1;
        options.app_id = 'org.kiva.kivalens'

        $def.notify({type:'label',label: 'Preparing to download...'})
        var result_objects = [];
        var pages_to_do = null;
        var concurrent_max = 8;
        var concurrent_current = 0;
        var results = {};
        var result_object_count = 0;

        var process = function(result){
            //if first time through... set up the list of things to do.
            console.log("process:start",result.paging)
            concurrent_current--;
            if (pages_to_do == null) {
                $def.notify({type:'label',label: 'Downloading...'})
                pages_to_do = Array.range(2, result.paging.pages)
                console.log("pages_to_do:", pages_to_do)
                concurrent_max = Math.min(concurrent_max, Math.max(result.paging.pages / 3, 1))
                console.log("concurrent_max:", concurrent_max)
            }

            //add results returned to array, for now this is happening one at a time sequentially.
            results[result.paging.page] = result[collection]
            result_object_count += result[collection].length;

            //notify any listener of changes
            $def.notify({type: 'percent', percentage: (result_object_count*100)/result.paging.total})
            $def.notify({type:'label',label: `${result_object_count}/${result.paging.total} downloaded`})

            if (pages_to_do.length > 0) { //if more to do...
                while (concurrent_current < concurrent_max) {
                    if (pages_to_do.length > 0) {
                        concurrent_current++;
                        options.page = pages_to_do.shift();
                        this.get(url, options).done(process.bind(this))
                    }
                }
            } else {
                console.log("NO MORE PAGES: result_object_count:", result_object_count, result.paging.total)
                if (result_object_count >= result.paging.total){
                    $def.notify({type: 'label', label: 'processing...'})
                    for (var n = 1; n <= result.paging.pages; n++) {
                        result_objects = result_objects.concat(results[n])
                    }
                    $def.notify({type: 'done'})
                    $def.resolve(result_objects)
                }
            }
        }

        concurrent_current = 1;
        this.get(url, options).done(process.bind(this))
        return $def
    }
}