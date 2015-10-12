'use strict';

import React from 'react'
import Reflux from 'reflux'
import {Grid,Row,Col,Input,ButtonGroup,Button} from 'react-bootstrap';
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
            amount_sum: basket_items.sum(bi => bi.amount)
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
    remove() {

    },
    render() {
        var style = {height:'100%', width: '100%'};
        return (
            <Grid style={style} fluid>
                <Col md={4}>
                    <span>Basket: {this.state.basket_count} Amount: {this.state.amount_sum}</span>
                    <ButtonGroup justified>
                        <Button href="#" key={1} onClick={a.loans.basket.clear}>Empty Basket</Button>
                        <Button href="#" key={2} onClick={this.remove}>Remove Selected</Button>
                    </ButtonGroup>
                    <InfiniteList
                        className="loan_list_container"
                        items={this.state.basket_items}
                        height={600}
                        itemHeight={100}
                        listItemClass={BasketListItem} />
                </Col>
                <Col md={8}>
                Temp
                </Col>
            </Grid>
        );
    }
})

export default Basket