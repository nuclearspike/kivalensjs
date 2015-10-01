'use strict';

import kiva from './kiva'

class PartnerAPI extends kiva {
    static getPartner(id){
        return this.get(`partners/${id}.json`)
    }

    //static getPartnerBatch(id_arr){///needs to handle more loans passed in than allowed to break it into multiple reqs.
    //    return this.get(`partners/${id_arr.join(',')}.json`)
    //}

    //static getPartners(query){
    //    return this.get('partners/search.json', query)
    //}

    static getAllPartners(options){
        options = options || {}
        //return this.get_paged('partners.json', 'partners', options)
        return this.get('partners.json', options)
    }
}

export default PartnerAPI