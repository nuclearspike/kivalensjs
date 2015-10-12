'use strict';

require('linqjs')
import Reflux from 'reflux'
import PartnerAPI from '../api/partners'
import a from '../actions'

var partners_from_kiva = [];
var countries = []
var partnerStore = Reflux.createStore({
    listenables: [a.partners],
    init:function(){
        console.log("partnerStore:init")
        a.partners.load();
    },
    onLoad: function() {
        console.log("partnerStore:onLoad")

        //we already have the partners, just spit them back.
        if (this.syncHasLoadedPartners()){
            a.partners.load.completed(partners_from_kiva);
            return;
        }

        PartnerAPI.getAllPartners()
            .done(partners => {
                partners_from_kiva = partners
                partners_from_kiva.removeAll(p => p.status != 'active');
                a.partners.load.completed(partners_from_kiva)

                //gather all country objects where partners operate, flatten and remove dupes.
                countries = [].concat.apply([], partners_from_kiva.select(p => p.countries)).distinct((a,b) => a.iso_code == b.iso_code);
            })
            .fail(() => { a.partners.load.failed() })
    },

    syncFilterPartners: function(c){
        return partners_from_kiva
    },

    onFilter: function(c){ //why would I ever call this async??
        a.partners.filter.completed(this.syncFilterPartners(c))
    },

    syncHasLoadedPartners: function(){ return partners_from_kiva.length > 0 }
});

export default partnerStore