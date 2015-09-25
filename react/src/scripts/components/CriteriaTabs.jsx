import React from 'react/addons';
import Reflux from 'reflux'
import {criteriaActions, loanActions} from '../actions'
import {criteriaStore} from '../stores/criteriaStore'
import {Grid,Row,Col,Input,Button,Tabs,Tab} from 'react-bootstrap';

var timeoutHandle=0
const CriteriaTabs = React.createClass({
    mixins: [Reflux.ListenerMixin, React.addons.LinkedStateMixin],
    getInitialState: function () {
        return {}
    },
    componentDidMount: function () {
        //this.listenTo(loanActions.filter.completed, this.redoCharts)
        this.setState(criteriaStore.syncGetLast)
    },
    criteriaChanged: function(){
        clearTimeout(timeoutHandle);
        timeoutHandle = setTimeout(()=> {
            criteriaActions.change(this.state)
        }, 150)
    },
    clearCriteria: function(){
        this.replaceState({})
        criteriaActions.change({})
    },
    render: function () {
        return (<div>
            <Tabs defaultActiveKey={1}>
                <Tab eventKey={1} title="Borrower">
                    <Row>
                        <Input type='text' label='Use' labelClassName='col-md-2' wrapperClassName='col-md-6'  valueLink={this.linkState('use')} onKeyUp={this.criteriaChanged} />
                    </Row>
                    <Row>
                        <Input type='text' label='Name' labelClassName='col-md-2' wrapperClassName='col-md-6' valueLink={this.linkState('name')} onKeyUp={this.criteriaChanged} />
                    </Row>
                    <Row>
                        <Input type='text' label='Country' labelClassName='col-md-2' wrapperClassName='col-md-6'  valueLink={this.linkState('country')} onKeyUp={this.criteriaChanged} />
                    </Row>
                    <Row>
                        <Input type='text' label='Sector' labelClassName='col-md-2' wrapperClassName='col-md-6'  valueLink={this.linkState('sector')} onKeyUp={this.criteriaChanged} />
                    </Row>
                    <Row>
                        <Input type='text' label='Activity' labelClassName='col-md-2' wrapperClassName='col-md-6'  valueLink={this.linkState('activity')} onKeyUp={this.criteriaChanged} />
                    </Row>

                </Tab>
                <Tab eventKey={2} title="Partner">
                    Always Exclude list of IDs.
                </Tab>
                <Tab eventKey={3} title="Your Portfolio">
                    <Row>
                        <Input type='text' label='Kiva Lender ID' labelClassName='col-md-2' wrapperClassName='col-md-6'  valueLink={this.linkState('lender_id')} onKeyUp={this.criteriaChanged} />
                    </Row>
                </Tab>
            </Tabs>
            <Button onClick={this.clearCriteria}>Clear</Button>
            </div>
        );
    }
})

export default CriteriaTabs