'use strict';
import Reflux from 'reflux'
import a from '../actions'

var criteriaStore = Reflux.createStore({
    listenables: [a.criteria],
    last_known:{},
    init:function(){
        //console.log("criteriaStore:init")
        //load from local storage.
    },
    onChange: function(criteria){
        console.log("criteriaStore:onChange", criteria)
        this.last_known = criteria
        a.loans.filter(criteria)
    },
    onGetLast: function(){
        //console.log("criteriaStore:onGetLast")
        a.criteria.getLast.completed(this.last_known)
        a.criteria.change(this.last_known) //?
    },
    syncGetLast: function(){
        return this.last_known
    }
})

export default criteriaStore