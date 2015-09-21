'use strict';

import {ListGroupItem} from 'react-bootstrap';
import {LinkContainer} from 'react-router-bootstrap'

class LoanListItem extends React.Component {
    render() {
        var loan = this.props.loan;
        return (
            <LinkContainer to="loan" params={{id:loan.id}}>
                <ListGroupItem
                    className="loan_list_item"
                    key={loan.id}
                    href="#">
                    <img className="float_left" src={"//s3-1.kiva.org/img/s113/"+ loan.image.id +".jpg"} height={90} width={90}/>
                    <div className="float_left">
                        <p className="large">{loan.name}</p>
                        {loan.location.country} | {loan.sector} | {loan.activity}
                    </div>
                </ListGroupItem>
            </LinkContainer>
        )
    }
}

module.exports = LoanListItem;