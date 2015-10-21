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
        this.onLoad();
    },
    onLoad: function() {
        console.log("partnerStore:onLoad")
        console.log("#####  countries:", countries)

        //we already have the partners, just spit them back.
        if (this.syncHasLoadedPartners()){
            a.partners.load.completed(partners_from_kiva);
            return;
        }

        PartnerAPI.getAllPartners()
            .done(partners => {
                var regions_lu = {"North America":"na","Central America":"ca","South America":"sa","Africa":"af","Asia":"as","Middle East":"me","Eastern Europe":"ee","Western Europe":"we","Antarctica":"an","Oceania":"oc"}
                partners_from_kiva = partners
                partners_from_kiva.forEach(p => {
                    p.kl_sp = p.social_performance_strengths ? p.social_performance_strengths.select(sp => sp.id) : []
                    p.kl_regions = p.countries.select(c => regions_lu[c.region]).distinct()
                })
                //partners_from_kiva.removeAll(p => p.status != 'active');
                window.partners = partners_from_kiva

                //gather all country objects where partners operate, flatten and remove dupes.
                countries = [].concat.apply([], partners_from_kiva.select(p => p.countries)).distinct((a,b) => a.iso_code == b.iso_code);
                a.partners.load.completed(partners_from_kiva)
                console.log("#####  countries:", countries)
            })
            .fail(() => { a.partners.load.failed() })
    },

    syncGetPartners: function(){
        return partners_from_kiva
    },

    syncGetCountries: function(){
        return countries
    },

    onFilter: function(c){ //why would I ever call this async??
        a.partners.filter.completed(this.syncFilterPartners(c))
    },

    syncHasLoadedPartners: function(){ return partners_from_kiva.length > 0 }
});

export default partnerStore