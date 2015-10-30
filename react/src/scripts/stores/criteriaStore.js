'use strict';
import Reflux from 'reflux'
import a from '../actions'

var criteriaStore = Reflux.createStore({
    listenables: [a.criteria],
    init(){
        this.last_known = JSON.parse(localStorage.getItem('last_criteria'))
        this.all = JSON.parse(localStorage.getItem('all_criteria'))
        if (!this.all) this.all = {}
        console.log("loaded from localStorage:",this.last_known)
        if (!this.last_known) this.last_known = {loan:{},partner:{},porfolio:{}}
    },
    onChange(criteria){
        console.log("criteriaStore:onChange", criteria)
        if (!criteria) criteria = this.last_known
        this.last_known = criteria
        a.loans.filter(criteria)
        localStorage.setItem('last_criteria', JSON.stringify(this.last_known))
    },
    syncGetLast(){
        return this.last_known
    },
    syncBlankCriteria(){
        return {loan: {still_needed_min: 25}, partner: {}, portfolio: {exclude_portfolio_loans: true}}
    },

    //Saved Searches
    onSwitchToSaved(name){
        window.rga.event({category: 'saved_search', action: 'saved_search: switch', label: name})
        var crit = this.all[name]
        if (crit){
            this.last_switch = name
            a.criteria.reload(crit)
            this.onChange(crit)
            a.criteria.savedSearchListChanged()
        }
    },
    onStartFresh(){
        var new_c = this.syncBlankCriteria()
        this.last_switch = null
        a.criteria.reload(new_c)
        this.onChange(new_c)
        a.criteria.savedSearchListChanged()
    },
    syncGetLastSwitch(){
        return this.last_switch
    },
    syncGetAll(){
        return this.all
    },
    syncGetAllNames(){
        return Object.keys(this.all)
    },
    syncSavedAll(){
        localStorage.setItem('all_criteria', JSON.stringify(this.all))
        a.criteria.savedSearchListChanged()
    },
    syncGetByName(name){
        return this.all[name]
    },
    syncSaveLastByName(name){
        window.rga.event({category: 'saved_search', action: `saved_search: save: ${this.all[name] ? 're-save': 'new-save'}`, label: name})

        this.all[name] = this.last_known
        this.last_switch = name
        this.syncSavedAll()
    },
    syncDelete(name){
        window.rga.event({category: 'saved_search', action: 'saved_search: delete', label: name})
        delete this.all[name]
        if (this.last_switch == name) this.last_switch = ''
        this.syncSavedAll()
    },
    syncGenMetaSearch(){
        var meta = {loan:{}, partner: {}, portfolio: {}}
        var ranges = {'partner': ['partner_risk_rating','partner_arrears','partner_default','portfolio_yield','profit','loans_at_risk_rate','currency_exchange_loss_rate']}
        var groups = Object.keys(ranges)
        var all = Object.keys(this.all).select(saved => this.all[saved])

        groups.forEach(group => {
            //cycle over ranges, finding highs and lows
            ranges[group].forEach(r => {
                //find the minimums
                if (all.any(c => c[`${r}_min`]) == null)
                    meta[group][`${r}_min`] = null
                else
                    meta[group][`${r}_min`] = all.min(c => c[`${r}_min`])

                //find the maximums
                if (all.any(c => c[`${r}_max`]) == null)
                    meta[group][`${r}_max`] = null
                else
                    meta[group][`${r}_max`] = all.max(c => c[`${r}_max`])
            })
            //cycle over arrays and combine all selections (one has country 'pe' another has 'ke,us' => 'ke,pe,us')
            //this will cause a problem with the 'any' vs 'all' criteria
        })

        return meta
    }
})

export default criteriaStore