'use strict';
import Reflux from 'reflux'
import a from '../actions'

var criteriaStore = Reflux.createStore({
    listenables: [a.criteria],
    init:function(){
        if (typeof localStorage === 'object')
            this.last_known = JSON.parse(localStorage.getItem('last_criteria'))
        console.log("loaded from localStorage:",this.last_known)
    },
    onChange: function(criteria){
        //console.log("criteriaStore:onChange", criteria)
        //a.loans.basket.changed() //why???
        this.last_known = criteria
        a.loans.filter(criteria)
        if (typeof localStorage === 'object')
            localStorage.setItem('last_criteria', JSON.stringify(this.last_known))
    },
    onGetLast: function(){
        a.criteria.getLast.completed(this.last_known)
        a.criteria.change(this.last_known) //? why ?
    },
    syncGetLast: function(){
        return this.last_known
    }
})

export default criteriaStore