'use strict';
import React from 'react'
import Reflux from 'reflux'
import Highcharts from 'react-highcharts'
import {History} from 'react-router'
import {Tabs,Tab,Col} from 'react-bootstrap'
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
            //todo: switch this to be in the router onEnter and redirect there!
            this.history.pushState(null, `/search`);
            window.location.reload()
        }
    },
    switchToLoan: function(loan){
        this.setState({loan: loan})
        this.redoChart(loan)
    },
    componentDidMount: function(){
        this.listenTo(a.loans.detail.completed, this.switchToLoan)
        if (s.loans.syncHasLoadedLoans()){ this.switchToLoan(s.loans.syncGet(this.props.params.id)) }
    },
    shouldComponentUpdate: function(nextProps, nextState){
        return (this.state.loan) ? true : false //DOESN'T WORK?
    },
    produceChart: function(){
        var result = {
            chart: {type: 'bar'},
            title: {text: 'Repayments'},
            xAxis: {
                categories: [],
                title: {
                    text: null
                }
            },
            yAxis: {
                min: 0,
                dataLabels: {enabled: false},
                labels: {overflow: 'justify'}
            },
            tooltip: {
                valueDecimals: 2,
                valueSuffix: ' USD'
            },
            plotOptions: {
                bar: {
                    dataLabels: {
                        enabled: true,
                        format: '${y:.2f}'
                    }
                }
            },
            legend: {enabled: false},
            credits: {enabled: false},
            series: [{
                name: 'Repayment',
                data: []
            }]
        }

        return result
    },
    redoChart: function(loan){
        let chart = this.refs.chart.getChart();
        var monthNamesShort = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sept", "Oct", "Nov", "Dec"];

        var payments = loan.terms.scheduled_payments.select(payment => {
            var date = new Date(Date.parse(payment.due_date))
            return {due_date: `${monthNamesShort[date.getMonth()]}-${date.getFullYear()}`, amount: payment.amount}
        });
        window.payments = payments
        var grouped_payments  = payments.groupBy(p => p.due_date).map(g => { return {due_date: g[0].due_date, amount: g.sum(r=> r.amount)} })
        window.grouped_payments = grouped_payments
        chart.xAxis[0].setCategories(grouped_payments.select(payment => payment.due_date))
        chart.series[0].setData(grouped_payments.select(payment => payment.amount))
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
                        <Col md={7}>
                        <b>{this.state.loan.location.country} | {this.state.loan.sector} | {this.state.loan.activity} | {this.state.loan.use}</b>
                        <p dangerouslySetInnerHTML={{__html: this.state.loan.description.texts.en}} ></p>
                        </Col>
                        <Col md={3}>
                            <Highcharts style={{height: '500px', width: '400px'}} config={this.produceChart()} ref='chart' />
                        </Col>
                    </Tab>
                    <Tab eventKey={3} title="Partner" className="ample-padding">

                    </Tab>
                </Tabs>
            </div>
        );
    }
})

export default Loan;