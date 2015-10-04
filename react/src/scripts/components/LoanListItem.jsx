'use strict';

import React from 'react'
import {ListGroupItem} from 'react-bootstrap';
import {KivaImage} from '.'
import a from '../actions'

class LoanListItem extends React.Component {
    render() {
        var loan = this.props; //
        return (
            <ListGroupItem
                onClick={a.loans.detail.bind(null, loan.id)}
                className="loan_list_item"
                key={loan.id}
                href={`#/search/loan/${loan.id}`}>
                <KivaImage className="float_left" type="square" loan={loan} image_width={113} height={90} width={90}/>
                <div className="float_left details">
                    <p>{loan.name}</p>
                    {loan.location.country} | {loan.sector} | {loan.activity}
                    <p>
                    {loan.use}
                    </p>
                </div>
            </ListGroupItem>
        )
    }
}

export default LoanListItem;