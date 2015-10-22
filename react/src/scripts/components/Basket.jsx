'use strict';

import React from 'react'
import Reflux from 'reflux'
import {Grid,Row,Col,Input,ButtonGroup,Button,Modal,ProgressBar,Panel} from 'react-bootstrap';
import {BasketListItem} from '.';
import a from '../actions'
import s from '../stores'
import InfiniteList from 'react-infinite-list'

const Basket = React.createClass({
    mixins: [Reflux.ListenerMixin],
    getInitialState() {
        var basket_items = s.loans.syncGetBasket()
        return {
            basket_count: basket_items.length,
            basket_items: basket_items,
            loans: basket_items.select(bi => bi.loan),
            amount_sum: basket_items.sum(bi => bi.amount),
            showGoodbye: false
        }
    },
    componentDidMount(){
        this.listenTo(a.loans.basket.changed,()=>{
            var basket_items = s.loans.syncGetBasket()
            this.setState({
                basket_count: basket_items.length,
                basket_items: basket_items,
                loans: basket_items.select(bi => bi.loan),
                amount_sum: basket_items.sum(bi => bi.amount)
            })
        })
    },
    makeBasket: function(){
        return JSON.stringify(this.state.basket_items.select(bi => {return {"id": bi.loan.id, "amount": bi.amount}}))
    },
    remove() {

    },
    clear(e){
        e.preventDefault()
        a.loans.basket.clear()
    },
    showGoodbye(){
        if (this.state.basket_count > 0) {
            window.rga.modalview('/baskettransfer');
            window.rga.event({category: 'basket', action: 'basket:transfer', value: this.state.basket_count})
            this.setState({showGoodbye: true})
        }
    },
    render() {
        var style = {height:'100%', width: '100%'};
        return (
            <div style={style}>
                <Col md={4}>
                    <span>Basket: {this.state.basket_count} Amount: {this.state.amount_sum}</span>
                    <ButtonGroup justified>
                        <Button href="#" key={1} disabled={this.state.basket_count == 0} onClick={this.clear}>Empty Basket</Button>
                        <Button href="#" key={2} disabled onClick={this.remove}>Remove Selected</Button>
                    </ButtonGroup>
                    <InfiniteList
                        className="loan_list_container"
                        items={this.state.basket_items}
                        height={600}
                        itemHeight={100}
                        listItemClass={BasketListItem} />
                </Col>
                <Col md={8}>
                    <Panel>
                        <form method="POST" onSubmit={this.showGoodbye} action="http://www.kiva.org/basket/set?default_team=kivalens">
                            <p>Checking out at Kiva will replace your current basket on Kiva.</p>
                            <input name="callback_url" value={`${location.protocol}//${location.host}${location.pathname}#clear-basket`} type="hidden" />
                            <input name="loans" value={this.makeBasket()} type="hidden" ref="basket_array" />
                            <input name="donation" value="0.00" type="hidden" />
                            <input name="app_id" value="org.kiva.kivalens" type="hidden" />
                            <input type="submit" disabled={this.state.basket_count == 0} className="btn btn-primary" value="Checkout at Kiva"/>
                        </form>
                    </Panel>
                </Col>
                <div className="static-modal">
                    <Modal show={this.state.showGoodbye} onHide={()=>{}}>
                        <Modal.Header>
                            <Modal.Title>Transferring Basket to Kiva</Modal.Title>
                        </Modal.Header>

                        <Modal.Body>
                            Depending upon the number of loans in your basket, transferring your selection to Kiva could take some time... Please wait.
                        </Modal.Body>

                        <Modal.Footer>
                            <ProgressBar active now={100} />
                        </Modal.Footer>
                    </Modal>
                </div>
            </div>
        );
    }
})

export default Basket