'use strict';

import React from 'react'
import {Link} from 'react-router';
import {Navbar, Nav, NavItem, Badge} from 'react-bootstrap';

class KLNav extends React.Component {
    render() {
        var Brand = <Link className="navbar-brand" to="/search">KivaLens</Link>
        return (
            <Navbar brand={Brand} inverse fluid>
                <Nav>
                    <NavItem key={1} href="#/search">Search</NavItem>
                    <NavItem key={2} disabled href="#/basket">Basket<Badge>0</Badge></NavItem>
                    <NavItem key={3} disabled href="#/options">Options</NavItem>
                    <NavItem key={4} disabled href="#/about">About</NavItem>
                </Nav>
            </Navbar>
        );
    }
}

export default KLNav;