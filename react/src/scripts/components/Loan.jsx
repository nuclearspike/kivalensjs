'use strict';
import React from 'react'
import Reflux from 'reflux'
import {History} from 'react-router'
import {Tabs,Tab} from 'react-bootstrap'
import {KivaImage} from '.'
import a from '../actions'
import s from '../stores/'

var Loan = React.createClass({
    mixins:[Reflux.ListenerMixin, History],
    getInitialState: function(){
        return {loan: s.loans.syncGet(this.props.params.id)}
    },
    componentWillMount: function(){
        if (!s.loans.syncHasLoadedLoans()){
            this.history.pushState(null, `/search`);
            window.location.reload()
        }
    },
    componentDidMount: function(){
        this.listenTo(a.loans.detail.completed, function(loan){
            this.setState({loan: loan})}.bind(this)
        )
        if (s.loans.syncHasLoadedLoans()){
            this.setState({loan: s.loans.syncGet(this.props.params.id)})
        }
    },
    shouldComponentUpdate: function(nextProps, nextState){
        return (this.state.loan) ? true : false
    },
    render: function() {
        return (
            <div>
                <h1>{this.state.loan.name}</h1>
                <Tabs defaultActiveKey={1}>
                    <Tab eventKey={1} title="Image" className="ample-padding">
                        <KivaImage loan={this.state.loan} type="width" image_width={800} width="100%"/>

                    </Tab>
                    <Tab eventKey={2} title="Details" className="ample-padding">
                        <b>{this.state.loan.location.country} | {this.state.loan.sector} | {this.state.loan.activity} | {this.state.loan.use}</b>
                        <p dangerouslySetInnerHTML={{__html: this.state.loan.description.texts.en}} ></p>
                    </Tab>
                    <Tab eventKey={3} title="Partner" className="ample-padding">

                    </Tab>
                </Tabs>
            </div>
        );
    }
})
//<KivaImage loan={this.state.loan} image_width={800}/>

export default Loan;