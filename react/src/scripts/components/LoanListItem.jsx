'use strict';
import React from 'react'
import {ListGroupItem} from 'react-bootstrap';

class LoanListItem extends React.Component {
    render() {
        var loan = this.props; //
        return (
                <ListGroupItem
                    className="loan_list_item"
                    key={loan.id}
                    href={`/search/loan/${loan.id}`}>

                    <img className="float_left" src={`//s3-1.kiva.org/img/s113/${loan.image.id}.jpg`} height={90} width={90}/>
                    <div className="float_left details">
                        <p className="large">{loan.name}</p>
                        {loan.location.country} | {loan.sector} | {loan.activity}
                    </div>

                </ListGroupItem>
        )
    }
}

module.exports = LoanListItem;