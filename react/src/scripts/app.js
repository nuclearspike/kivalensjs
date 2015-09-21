'use strict'

import {Route, DefaultRoute, NotFoundRoute, Redirect, RouteHandler} from 'react-router';
import {KLNav, KLFooter, Search, Loan, Basket, Options, About, Details, Schedule, NotFound} from "./components";

class App extends React.Component {
    render(){
        return <div>
            <KLNav/>
            <RouteHandler/>
            <KLFooter/>
            </div>
    }
}

var routes = (
    <Route handler={App} path="/">
        <Route name="search" handler={Search}>
            <Route name="loan" path="loan/:id" handler={Loan}>
                <DefaultRoute handler={Details}/>
                <Route name="schedule" handler={Schedule}/>
            </Route>
        </Route>
        <Route name="basket" handler={Basket}/>
        <Route name="options" handler={Options}/>
        <Route name="about" handler={About}/>
        <Redirect from="" to="search"/>
        <NotFoundRoute handler={NotFound}/>
    </Route>
);

document.addEventListener("DOMContentLoaded", function(event) {
    if (document.getElementById("body"))
        ReactRouter.run(routes, function(Handler) { //Router.HistoryLocation,
            React.render(React.createElement(Handler, null), document.getElementById("body"))
        });
});