'use strict';

import React from 'react'
import {ListGroupItem, Row} from 'react-bootstrap';
import {KivaImage} from '.'

class LoanListItem extends React.Component {
    render() {
        var loan = this.props; //
        return (
            <ListGroupItem
                className="loan_list_item"
                key={loan.id}
                href={`/#/search/loan/${loan.id}`}>
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