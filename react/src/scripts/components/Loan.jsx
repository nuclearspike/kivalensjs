'use strict';
import React from 'react'
import Reflux from 'reflux'
import Highcharts from 'react-highcharts'
import {History} from 'react-router'
import {Tabs,Tab,Col,ProgressBar,Button} from 'react-bootstrap'
import {KivaImage} from '.'
import a from '../actions'
import s from '../stores/'

var Loan = React.createClass({
    mixins:[Reflux.ListenerMixin, History],
    getInitialState: function(){
        return {loan: s.loans.syncGet(this.props.params.id), inBasket: s.loans.syncInBasket(this.props.params.id)}
    },
    componentWillMount: function(){
        if (!s.loans.syncHasLoadedLoans()){
            //todo: switch this to be in the router onEnter and redirect there!
            this.history.pushState(null, `/search`);
            window.location.reload()
        }
        this.listenTo(a.loans.basket.changed, ()=>{ this.setState({inBasket: s.loans.syncInBasket(this.state.loan.id)}) })
    },
    switchToLoan: function(loan){
        var funded_perc = (loan.funded_amount * 100 /  loan.loan_amount)
        var basket_perc = (loan.basket_amount * 100 /  loan.loan_amount)
        this.calcRepaymentsGraph(loan)
        this.setState({loan: loan, basket_perc: basket_perc, funded_perc: funded_perc, inBasket: s.loans.syncInBasket(loan.id)})
    },
    componentDidMount: function(){
        this.listenTo(a.loans.detail.completed, this.switchToLoan)
        if (s.loans.syncHasLoadedLoans()){ this.switchToLoan(s.loans.syncGet(this.props.params.id)) }
    },
    shouldComponentUpdate: function(nextProps, nextState){
        return (this.state.loan) ? true : false //DOESN'T WORK?
    },
    produceChart: function(loan){
        var result = {
            chart: {type: 'bar', animation: false},
            title: {text: 'Repayments'},
            xAxis: {
                categories: loan.kl_repay_categories,
                title: {text: null}
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
                animation: false,
                name: 'Repayment',
                data: loan.kl_repay_data
            }]
        }

        return result
    },
    calcRepaymentsGraph: function(loan){
        if (loan.kl_repay_categories || !loan.terms.scheduled_payments) return
        var payments = loan.terms.scheduled_payments.select(payment => {
            return {due_date: Date.from_iso(payment.due_date).toString("MMM-yyyy"), amount: payment.amount}
        })
        var grouped_payments  = payments.groupBy(p => p.due_date).map(g => { return {due_date: g[0].due_date, amount: g.sum(r => r.amount)} })
        loan.kl_repay_categories = grouped_payments.select(payment => payment.due_date)
        loan.kl_repay_data = grouped_payments.select(payment => payment.amount)
    },
    render: function() {
        var addRemove = (this.state.inBasket ?
            <Button onClick={a.loans.basket.remove.bind(this, this.state.loan.id)}>Remove from Basket</Button> :
            <Button onClick={a.loans.basket.add.bind(this, this.state.loan.id, 25)}>Add to Basket</Button>
        )

        return (
            <div>
                <h1>{addRemove} {this.state.loan.name}</h1>
                <Tabs defaultActiveKey={1}>
                    <Tab eventKey={1} title="Image" className="ample-padding-top">
                        <KivaImage loan={this.state.loan} type="width" image_width={800} width="100%"/>

                    </Tab>
                    <Tab eventKey={2} title="Details" className="ample-padding-top">
                        <Col md={7}>
                            <ProgressBar>
                                <ProgressBar striped bsStyle="success" now={this.state.funded_perc} key={1}/>
                                <ProgressBar bsStyle="warning" now={this.state.basket_perc} key={2}/>
                            </ProgressBar>
                        <b>{this.state.loan.location.country} | {this.state.loan.sector} | {this.state.loan.activity} | {this.state.loan.use}</b>
                        <p dangerouslySetInnerHTML={{__html: this.state.loan.description.texts.en}} ></p>

                        <a href={`http://www.kiva.org/lend/${this.state.loan.id}?default_team=kivalens`} target="_blank">View on Kiva.org</a>
                        </Col>
                        <Col md={3}>
                            <Highcharts style={{height: '500px', width: '400px'}} config={this.produceChart(this.state.loan)} ref='chart' />
                            <p>Half back by: {this.state.loan.kl_half_back.toString("MMM d, yyyy")}</p>
                            <p>Final repayment: {this.state.loan.kl_final_repayment.toString("MMM d, yyyy")}</p>
                        </Col>
                    </Tab>
                    <Tab eventKey={3} disabled title="Partner" className="ample-padding-top">

                    </Tab>
                </Tabs>
            </div>
        );
    }
})

export default Loan;