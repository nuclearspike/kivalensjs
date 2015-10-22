'use strict'

require('linqjs')
require('datejs')
import React from 'react'
import ReactDOM from 'react-dom'
import Router from 'react-router'
import {Route, Redirect, IndexRoute} from 'react-router'
import {KLNav, KLFooter, Search, Loan, Basket, Options, About, Details, Schedule, Criteria, ClearBasket, NotFound} from "./components";
import KivaAPI from './api/kiva'
import ga from 'react-ga';
import a from './actions'

window.rga = ga //react google analytics, ga is already defined
KivaAPI.setAPIOptions({app_id: 'org.kiva.kivalens', max_concurrent: 8})

//turns var a = [1,2,3,4,5,6,7,8,9,10,11]; a.chunk(5); into => [[1,2,3,4,5],[6,7,8,9,10],[11]]
//added for taking arrays of loan ids and breaking them into the max kiva allows for a request
Array.prototype.chunk = function(chunkSize) {
    var R = [];
    for (var i=0; i<this.length; i+=chunkSize)
        R.push(this.slice(i,i+chunkSize));
    return R;
}

//not the best name... but i need this for all kiva dates
Date.from_iso = (s) => { return new Date(Date.parse(s)) }

const App = React.createClass({
    getInitialState(){
        return { }
    },
    componentDidMount(){
        ga.initialize('UA-10202885-1');
        //this only happens during startup of the app.
        if (location.href.indexOf('#/?') > -1) location.replace(`http://${location.host}${location.pathname}#/search`)
    },
    logPageChange(){
        var r_page = window.location.hash.replace('#','')
        if (r_page.indexOf("?") > -1)
            r_page = r_page.substr(0, r_page.indexOf('?'));
        if (r_page != this.last_ga_page) {
            console.log("ga:pageview", r_page)
            ga.pageview(r_page)
            this.last_ga_page = r_page
        }
    },
    render(){
        this.logPageChange()
        return <div>
                <KLNav/>
                    {this.props.children}
                <KLFooter/>
            </div>
    }
})

//When Page read, mount it.
document.addEventListener("DOMContentLoaded", function(event) {
    $(document).ready(function() {
        $.ajaxSetup({ cache: false });
    });

    if (document.getElementById("react-app")){
        ReactDOM.render((<Router>
            <Route component={App} path="/">
                <Route path="search" component={Search}>
                    <Route path="loan/:id" component={Loan}/>
                    <IndexRoute component={Criteria}/>
                </Route>
                <Route path="basket" component={Basket}/>
                <Route path="options" component={Options}/>
                <Route path="about" component={About}/>
                <Route path="clear-basket" component={ClearBasket}/>
                <Redirect from="*" to="search"/>
                <Redirect from="/" to="search"/>
            </Route>
        </Router>), document.getElementById("react-app"))
    }
});