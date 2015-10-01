'use strict';
import Reflux from 'reflux'
import PartnerAPI from '../api/partners'
import a from '../actions'

var partners_from_kiva = [];
var partnerStore = Reflux.createStore({
    listenables: [a.partners],
    init:function(){
        console.log("partnerStore:init")
        a.partners.load();
    },
    onLoad: function(options) {
        console.log("partnerStore:onLoad")

        //we already have the partners, just spit them back.
        if (partners_from_kiva.length > 0){
            a.partners.load.completed(partners_from_kiva);
            return;
        }

        options = options || {}

        PartnerAPI.getAllPartners(options)
            .done(partners => {
                partners_from_kiva = partners;
                a.partners.load.completed(partners)
            })
            .progress(progress => {
                console.log("progress:", progress)
                a.partners.load.progressed(progress)
            })
            .fail(result => {
                a.partners.load.failed()
            })
    },

    syncHasLoadedPartners: function(){
        return partners_from_kiva.length > 0
    }
});

export default partnerStore