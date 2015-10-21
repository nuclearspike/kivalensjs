'use strict';

import React from 'react'
import Reflux from 'reflux'
import {ListGroupItem} from 'react-bootstrap';
import {KivaImage} from '.'
import cx from 'classnames'
import a from '../actions'
import s from '../stores/'

const BasketListItem = React.createClass({
    //mixins: [Reflux.ListenerMixin],
    getInitialState: function () {
        return {  }
    },
    componentDidMount: function() {
        //this.listenTo(a.loans.basket.changed, ()=>{ this.setState({inBasket: s.loans.syncInBasket(this.props.id)}) })
    },
    render: function() {
        //console.log(this.props)
        var loan = this.props.loan;
        //onClick={a.loans.detail.bind(null, loan.id)}

        return (
            <ListGroupItem
                className={'loan_list_item'}
                key={loan.id}
                href={`#/basket`}>
                <KivaImage className="float_left" type="square" loan={loan} image_width={113} height={90} width={90}/>
                <div className="details">
                    <p><b>{loan.name}</b></p>
                    {loan.location.country} | {loan.sector} <span className="hidden-md">| {loan.activity}</span>
                    <p className="hidden-md">{loan.use}</p>
                </div>
            </ListGroupItem>
        )
    }
})

export default BasketListItem;