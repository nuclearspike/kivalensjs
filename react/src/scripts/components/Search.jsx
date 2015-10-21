'use strict';

import React from 'react'
import Reflux from 'reflux'
import Notification from "react-notification"
import {Grid,Row,Col,Input,ButtonGroup,Button} from 'react-bootstrap';
import {LoanListItem, LoadingLoansModal, BulkAddModal} from '.';
import a from '../actions'
import s from '../stores'
import InfiniteList from 'react-infinite-list'

var Search = React.createClass({
    mixins: [Reflux.ListenerMixin],
    getInitialState:function(){
        var filtered_loans = s.loans.syncFilterLoansLast()
        if (filtered_loans.length == 0)
            filtered_loans = s.loans.syncFilterLoans()
        return {filtered_loans: filtered_loans, loan_count: filtered_loans.length, notification: {active: false, message: ''}}
    },
    componentDidMount: function() {
        //initial state works when flipping to Search after stuff is loaded. listenTo works when it's waiting
        //it should only fetch loans that are filtered.
        this.listenTo(a.loans.filter.completed, loans => {
            this.setState({filtered_loans: loans, loan_count: loans.length})
            if (loans.length > 0) //once it's on it's on.
                this.should_show_count = true
            if (this.should_show_count)
                this.showNotification(`${loans.length} loans`)
        })
        //if we enter the page and loans are not done yet.
        this.listenTo(a.loans.load.completed, loans => a.loans.filter())
        if (s.loans.syncHasLoadedLoans()) a.loans.filter() //triggers the graphs.
    },
    showNotification(message){
        this.setState({notification: {active: true, message: message}})
    },
    changeCriteria: function(e){
        //e.preventDefault()
        //todo: scroll to criteria after it switches
    },
    bulkAdd: function(e){
        e.preventDefault()
        this.setState({showBulkAdd: true})
    },
    modalHidden: function(){
        //I hate this. this cannot be the right way to do this. it works. but there has to be a better way.
        this.setState({showBulkAdd: false})
    },
    render: function()  {
        console.log("Search:render()")
        var style = {height:'100%', width: '100%'};
        var bulkAddModal = (this.state.showBulkAdd)? (<BulkAddModal onHide={this.modalHidden} />) : null
        //    max-width: 365px; for the col
        return (
            <div style={style} >
                <LoadingLoansModal show={!s.loans.syncHasLoadedLoans()}/>
                {bulkAddModal}
                <Col md={4}>
                    <Notification dismissAfter={5000} isActive={this.state.notification.active} message={this.state.notification.message} action={''} />
                    <ButtonGroup justified>
                        <Button href="#" key={1} onClick={this.bulkAdd}>Bulk Add</Button>
                        <Button href="#/search" key={2} onClick={this.changeCriteria}>Change Criteria</Button>
                    </ButtonGroup>
                    <InfiniteList
                        className="loan_list_container"
                        items={this.state.filtered_loans}
                        height={900}
                        itemHeight={100}
                        listItemClass={LoanListItem} />
                </Col>
                <Col md={8}>
                    {this.props.children}
                </Col>
            </div>
        );
    }
})

export default Search;