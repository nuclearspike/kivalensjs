'use strict';

import kiva from './kiva'

class PartnerAPI extends kiva {
    static getPartner(id){
        return this.sem_get(`partners/${id}.json`, 'partners', true)
    }

    static getAllPartners(options){
        return this.sem_get('partners.json', options, 'partners', false)
    }
}

export default PartnerAPI