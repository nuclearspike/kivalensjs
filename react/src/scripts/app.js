'use strict'

require('linqjs')
import React from 'react'
import Router from 'react-router'
import {Route, Redirect, IndexRoute} from 'react-router';
import {KLNav, KLFooter, Search, Loan, Basket, Options, About, Details, Schedule, Criteria, NotFound} from "./components";
import KivaAPI from './api/kiva'

KivaAPI.setAPIOptions({app_id: 'org.kiva.kivalens', max_concurrent: 8})

Array.prototype.chunk = function(chunkSize) {
    var R = [];
    for (var i=0; i<this.length; i+=chunkSize)
        R.push(this.slice(i,i+chunkSize));
    return R;
}

class App extends React.Component {
    render(){
        return <div>
            <KLNav/>
            {this.props.children}
            <KLFooter/>
            </div>
    }
} //

//When Page read, mount it.
document.addEventListener("DOMContentLoaded", function(event) {
    if (document.getElementById("body")){
        React.render((<Router>
            <Route component={App} path="/">
                <Route path="search" component={Search}>
                    <Route path="loan/:id" component={Loan}>
                        <IndexRoute component={Details}/>
                        <Route path="schedule" component={Schedule}/>
                    </Route>
                    <IndexRoute component={Criteria}/>
                </Route>
                <Route path="basket" component={Basket}/>
                <Route path="options" component={Options}/>
                <Route path="about" component={About}/>
                <Redirect from="" to="/search"/>
                <Route path="*" component={NotFound}/>
            </Route>
        </Router>), document.getElementById("body"))
    }
});