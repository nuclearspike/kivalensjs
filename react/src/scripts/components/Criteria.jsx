import React from 'react/addons';
import Reflux from 'reflux'
import {criteriaActions} from '../actions'
import {criteriaStore} from '../stores/criteriaStore'
import {Grid,Row,Col,Input,Button} from 'react-bootstrap';

const Criteria = React.createClass({
    mixins: [Reflux.ListenerMixin, React.addons.LinkedStateMixin],
    getInitialState: function() {
        console.log("Criteria.getInitialState()")
        return {}
    },
    componentDidMount: function() {
        console.log("Criteria.componentDidMount()")
        this.listenTo(criteriaActions.getLast.completed, criteria => {
            console.log("criteriaActions.getLast.completed")
            this.setState(criteria)
        })
        criteriaActions.getLast();
    },
    criteriaChanged: function() {
        console.log("Criteria.criteriaChanged()")
        criteriaActions.change(this.state)
    },
    clearCriteria: function(){
        this.replaceState({})
        criteriaActions.change({})
    },
    render: function() {
        console.log("Criteria.render()")
        return (
            <div>
                <h1>Criteria</h1>
                <Row>
                    <Input type='text' label='Use' labelClassName='col-md-2' wrapperClassName='col-md-6' valueLink={this.linkState('use')} onKeyUp={this.criteriaChanged} />
                </Row>
                <Row>
                    <Input type='text' label='Name' labelClassName='col-md-2' wrapperClassName='col-md-6' valueLink={this.linkState('name')} onKeyUp={this.criteriaChanged} />
                </Row>
                <Row>
                    <Input type='text' label='Country' labelClassName='col-md-2' wrapperClassName='col-md-6' valueLink={this.linkState('country')} onKeyUp={this.criteriaChanged} />
                </Row>
                <Row>
                    <Input type='text' label='Sector' labelClassName='col-md-2' wrapperClassName='col-md-6' valueLink={this.linkState('sector')} onKeyUp={this.criteriaChanged} />
                </Row>
                <Row>
                    <Input type='text' label='Activity' labelClassName='col-md-2' wrapperClassName='col-md-6' valueLink={this.linkState('activity')} onKeyUp={this.criteriaChanged} />
                </Row>
                <Button onClick={this.clearCriteria}>Clear</Button>
            </div>
        );
    }
})

export default Criteria