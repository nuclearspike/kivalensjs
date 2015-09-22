'use strict';

import React from 'react'
import {Link} from 'react-router';
import {Navbar, Nav, NavItem} from 'react-bootstrap';

class KLNav extends React.Component {
    render() {
        var Brand = <Link className="navbar-brand" to="/#/search">KivaLens</Link>
        return (
            <Navbar brand={Brand} inverse={true} fluid={true}>
                <Nav>
                    <NavItem key={1} href="/#/search">Search</NavItem>
                    <NavItem key={2} href="/#/basket">Basket</NavItem>
                    <NavItem key={3} href="/#/options">Options</NavItem>
                    <NavItem key={4} href="/#/about">About</NavItem>
                </Nav>
            </Navbar>
        );
    }
}

module.exports = KLNav;