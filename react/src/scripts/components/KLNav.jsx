'use strict';

import React from 'react'
import Reflux from 'reflux'
import {Link} from 'react-router';
import {Navbar, Nav, NavItem, NavBrand, Badge} from 'react-bootstrap';
import s from '../stores/'
import a from '../actions'

var KLNav = React.createClass({
    mixins: [Reflux.ListenerMixin],
    getInitialState: function () {
        return { basket_count: 0 }
    },
    componentDidMount: function(){
        this.listenTo(a.loans.basket.changed, ()=>{ this.setState({basket_count: s.loans.syncBasketCount()}) })
    },
    render: function() {
        var Brand = <Link className="navbar-brand" to="/search">KivaLens</Link>
        return (
            <Navbar inverse fluid>
                <NavBrand>{Brand}</NavBrand>
                <Nav>
                    <NavItem key={1} href="#/search">Search</NavItem>
                    <NavItem key={2} href="#/basket">Basket<Badge>{this.state.basket_count}</Badge></NavItem>
                    <NavItem key={3} disabled href="#/options">Options</NavItem>
                    <NavItem key={4} href="#/about">About</NavItem>
                </Nav>
            </Navbar>
        );
    }
})

export default KLNav;