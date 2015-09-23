'use strict'

import React from 'react'
import Router from 'react-router'
import {Route, Redirect, IndexRoute} from 'react-router';
import {KLNav, KLFooter, Search, Loan, Basket, Options, About, Details, Schedule, NotFound} from "./components";

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
                </Route>
                <Route path="basket" component={Basket}/>
                <Route path="options" component={Options}/>
                <Route path="about" component={About}/>
                <Redirect from="" to="/search"/>
                <Route path="*" component={NotFound}/>
            </Route>
        </Router>), document.getElementById("body"))
    }
}); //<NotFoundRoute component={NotFound}/>