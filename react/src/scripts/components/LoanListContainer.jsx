'use strict';
import React from 'react'
import {ListGroup} from 'react-bootstrap';
import {LoanListItem} from '.';

class LoanListContainer extends React.Component {
    render() {
        return (
            <div className="loan_list_container">
                <ListGroup>
                    {this.props.loans.map(function(loan){
                       return <LoanListItem key={loan.id} loan={loan}/>
                    })}
                </ListGroup>
            </div>
        );
    }
}

module.exports = LoanListContainer;
