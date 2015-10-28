'use strict';
import Reflux from 'reflux'
import a from '../actions'

var criteriaStore = Reflux.createStore({
    listenables: [a.criteria],
    init:function(){
        this.last_known = JSON.parse(localStorage.getItem('last_criteria'))
        console.log("loaded from localStorage:",this.last_known)
        if (!this.last_known) this.last_known = {loan:{},partner:{},porfolio:{}}
    },
    onChange: function(criteria){
        //console.log("criteriaStore:onChange", criteria)
        if (!criteria) criteria = this.last_known
        this.last_known = criteria
        a.loans.filter(criteria)
        localStorage.setItem('last_criteria', JSON.stringify(this.last_known))
    },
    onGetLast: function(){ //why use this??
        a.criteria.getLast.completed(this.last_known)
        a.criteria.change(this.last_known) //? why ?
    },
    syncGetLast: function(){
        return this.last_known
    }
})

export default criteriaStore