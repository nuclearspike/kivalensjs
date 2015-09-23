'use strict';

require('linqjs')

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

class LoanAPI {
    static get(url,query){
        console.log('get():',query)
        var query_string
        if (query)
            query_string = serialize(query);
        var url = `http://api.kivaws.org/v1/${url}?${query_string}`;
        console.log(url);
        return $.getJSON(url)
            .done((result) => {
                console.log(result);
            })
            .fail((xhr, status, err) => {
                console.error(status, err.toString());
            })
    }

    static getLoan(id){
        return this.get(`loans/${id}.json`)
    }

    static getLoanBatch(id_arr){
        return this.get(`loans/${id_arr.join(',')}.json`)
    }

    static getLoans(query){
        return this.get('loans/search.json',query)
    }

    static getAllLoans(options){
        var $def = $.Deferred()

        options = options || {}
        options.per_page = 100;
        options.page = 1;
        options.status = 'fundraising'
        options.app_id = 'org.kiva.kivalens'

        //options.country_code = 'KE'

        var loans = [];
        var pages_to_do = null;
        var local_this = this;
        const concurrent_max = 5; //15;
        var concurrent_current = 0;
        var results = {};
        var result_loan_count = 0;
        var process = function(result){
            //if first time through... set up the list of things to do.
            console.log("process:start",result.paging)
            concurrent_current--;
            if (pages_to_do == null) {
                pages_to_do = Array.range(2, result.paging.pages)
                console.log("pages_to_do:", pages_to_do)
            }

            //add loans returned to array, for now this is happening one at a time sequentially.
            results[result.paging.page] = result.loans
            result_loan_count += result.loans.length;

            //notify any listener of changes
            var notify_obj = {type: 'percent', pages_total: result.paging.pages, pages_done: result.paging.pages - pages_to_do.length};
            notify_obj.percentage = (notify_obj.pages_done * 100) / notify_obj.pages_total
            $def.notify(notify_obj)

            if (pages_to_do.length > 0) { //if more to do...
                while (concurrent_current < concurrent_max) {
                    if (pages_to_do.length > 0) {
                        concurrent_current++;
                        options.page = pages_to_do.shift();
                        local_this.getLoans(options).done(process)
                    }
                }
            } else {
                console.log("NO MORE PAGES: result_loan_count:", result_loan_count, result.paging.total)
                if (result_loan_count >= result.paging.total){
                    $def.notify({type: 'label', label: 'processing...'})
                    for (var n = 1; n <= result.paging.pages; n++) {
                        loans = loans.concat(results[n])
                    }
                    $def.notify({type: 'done'})
                    console.log("resolving:", loans.length)
                    $def.resolve(loans)

                }
            }
        }

        concurrent_current = 1;
        local_this.getLoans(options).done(process)

        return $def
    }
}

export {LoanAPI}