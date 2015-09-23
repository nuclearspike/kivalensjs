'use strict';
//THIS FILE IS NO LONGER IN USE. SWITCHED TO INFINITE LIST.

import React from 'react'
//import LazyRender from 'react-lazy-render';
//import LazyLoad from 'react-lazy-load'
import {ListGroup} from 'react-bootstrap';
import {LoanListItem} from '.';

class LoanListContainer extends React.Component {
    render() {
        return (
            <div className="loan_list_container">
                <ListGroup>
                    <LazyLoad>
                    {this.props.loans.map(function(loan){
                       return <LoanListItem key={loan.id} loan={loan}/>
                    })}
                    </LazyLoad>
                </ListGroup>
            </div>
        );
    }
} //<LazyRender maxHeight={300} > </LazyRender>

module.exports = LoanListContainer;
