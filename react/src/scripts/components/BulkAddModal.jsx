import React from 'react';
import Reflux from 'reflux'
import {Modal,Button} from 'react-bootstrap'
import a from '../actions'
import s from '../stores/'

const BulkAddModal = React.createClass({
    //mixins: [Reflux.ListenerMixin],
    getInitialState: function () {
        return {show: true, maxBasket: 25, maxPerLoan: 25}
    },
    componentDidMount: function () {
        window.rga.modalview('/bulkadd');
        this.loans = s.loans.syncFilterLoansLast()
        var basket_space = 10000 - s.loans.syncGetBasket().sum(bi => bi.amount)
        this.setState({basket_space: basket_space})
    },
    close: function(){
        this.setState({ show: false });
        a.loans.basket.changed()
        window.rga.event({category: 'bulk_add', action: 'close'})
        if (this.props.onHide) this.props.onHide()
    },
    doIt: function(){
        var amount_remaining = Math.min(this.state.maxBasket, this.state.basket_space)
        var to_add = []
        this.loans.some(loan => {
            //if already in basket, stop.
            if (s.loans.syncInBasket(loan.id)) return false
            //how much to lend for current loan
            var to_lend = Math.min(loan.loan_amount - loan.funded_amount - loan.basket_amount, this.state.maxPerLoan)
            //add it.
            if (to_lend > 0) {
                amount_remaining -= to_lend
                to_add.push({loan_id: loan.id, amount: to_lend})
            }
            return amount_remaining < 25 //return true == quit
        })
        window.rga.event({category: 'bulk_add', action: 'add', value: to_add.length})
        a.loans.basket.batchAdd(to_add)
        this.close()
    },
    maxBasketUpdate(){
        this.setState({maxBasket: this.refs.maxBasket.value})
    },
    maxPerLoanUpdate(){
        this.setState({maxPerLoan: this.refs.maxPerLoan.value})
    },
    render: function () {
        var _this = this
        var maxBasketUpdate = function(){
            _this.setState({maxBasket: _this.refs.maxBasket.value})
        }
        var maxPerLoanUpdate = function(){
            _this.setState({maxPerLoan: _this.refs.maxPerLoan.value})
        }
        return (
            <div className="static-modal">
                <Modal show={this.state.show} onHide={this.close}>
                    <Modal.Header closeButton>
                        <Modal.Title>Bulk Add</Modal.Title>
                    </Modal.Header>

                    <Modal.Body>
                        <p>Mega-Lender Tool: Use this to automatically add many loans at once. Using the current sort and
                            criteria, it will start at the top of the list and for any loan that is not currently in
                            your basket, it will apply the rules below. Kiva has a maximum basket amount of $10,000.</p>

                        <p>(Due to delays in Kiva's API, KivaLens may not have the most up-to-the-minute information
                            about basket and funded amounts. Therefore, upon checkout at Kiva, your amounts per
                            loan may possibly get reduced.)</p>

                        Max to lend ${this.state.maxBasket}
                        <input type="range" min="25" defaultValue={this.state.maxBasket} max={this.state.basket_space} step="25" ref='maxBasket' onInput={maxBasketUpdate} onChange={maxBasketUpdate}/>
                        <br/>
                        Max per loan ${this.state.maxPerLoan}
                        <input type="range" min="25" defaultValue={this.state.maxPerLoan} max="250" step="25" ref='maxPerLoan' onInput={maxPerLoanUpdate} onChange={maxPerLoanUpdate} />

                    </Modal.Body>

                    <Modal.Footer>
                        <Button bsStyle="primary" onClick={this.doIt}>Add a bunch!</Button><Button onClick={this.close}>Close</Button>
                    </Modal.Footer>
                </Modal>
            </div>
        );
    }
})

export default BulkAddModal