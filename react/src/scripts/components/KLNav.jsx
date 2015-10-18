'use strict';

import React from 'react'
import Reflux from 'reflux'
import {Link} from 'react-router'
import {Navbar, Nav, NavItem, NavBrand, Badge, CollapsibleNav} from 'react-bootstrap'
import s from '../stores/'
import a from '../actions'

const KLNav = React.createClass({
    mixins: [Reflux.ListenerMixin],
    getInitialState() {
        return { basket_count: 0 }
    },
    componentDidMount(){
        this.listenTo(a.loans.basket.changed, ()=>{ this.setState({basket_count: s.loans.syncBasketCount()}) })
    },
    render() {
        return (
            <Navbar inverse fluid staticTop bsSize='sm' toggleNavKey={0}>
                <NavBrand><Link to="/search">KivaLens</Link></NavBrand>
                <CollapsibleNav eventKey={0}>
                    <Nav navbar>
                        <NavItem key={1} href="#/search">Search</NavItem>
                        <NavItem key={2} href="#/basket">Basket<Badge>{this.state.basket_count}</Badge></NavItem>
                        <NavItem key={3} disabled href="#/options">Options</NavItem>
                        <NavItem key={4} href="#/about">About</NavItem>
                    </Nav>
                </CollapsibleNav>
            </Navbar>
        );
    }
})

export default KLNav;