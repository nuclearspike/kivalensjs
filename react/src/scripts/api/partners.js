'use strict';

import {Request} from './kiva'

class PartnerAPI {
    static getPartner(id){
        return Request.sem_get(`partners/${id}.json`, 'partners', true)
    }

    static getAllPartners(){
        return Request.sem_get('partners.json', {}, 'partners', false)
    }
}

export default PartnerAPI